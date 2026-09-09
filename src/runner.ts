import { chromium } from "playwright";
import { AuditConfig, AuditReport, AuditIssue, PageMetadata, FileAuditStatus } from "./types.js";
import { auditHeadersAndCookies } from "./auditors/headers.js";
import { createRuntimeCollector, evaluateRuntimeIssues } from "./auditors/runtime.js";
import { auditFormsAndInputs } from "./auditors/forms.js";
import { auditClientStorage } from "./auditors/storage.js";
import { scanSourceDirectory } from "./auditors/source_code.js";

function calculateScore(issues: AuditIssue[]): { score: number; status: "PASSED" | "FAILED" | "WARNING" } {
  let penalty = 0;
  for (const issue of issues) {
    switch (issue.severity) {
      case "CRITICAL":
        penalty += 25;
        break;
      case "HIGH":
        penalty += 15;
        break;
      case "MEDIUM":
        penalty += 8;
        break;
      case "LOW":
        penalty += 3;
        break;
      case "INFO":
        penalty += 0;
        break;
    }
  }

  const rawScore = Math.max(0, 100 - penalty);
  let status: "PASSED" | "FAILED" | "WARNING" = "PASSED";

  if (issues.some((i) => i.severity === "CRITICAL" || i.severity === "HIGH") || rawScore < 70) {
    status = "FAILED";
  } else if (rawScore < 90 || issues.some((i) => i.severity === "MEDIUM")) {
    status = "WARNING";
  }

  return { score: rawScore, status };
}

export async function runCodeScanOnly(targetDir: string): Promise<AuditReport> {
  const startTime = Date.now();
  const scanResult = await scanSourceDirectory(targetDir);
  const durationMs = Date.now() - startTime;
  const { score, status } = calculateScore(scanResult.issues);

  const summary = {
    total: scanResult.issues.length,
    critical: scanResult.issues.filter((i) => i.severity === "CRITICAL").length,
    high: scanResult.issues.filter((i) => i.severity === "HIGH").length,
    medium: scanResult.issues.filter((i) => i.severity === "MEDIUM").length,
    low: scanResult.issues.filter((i) => i.severity === "LOW").length,
    info: scanResult.issues.filter((i) => i.severity === "INFO").length,
    totalFilesScanned: scanResult.totalFilesScanned,
    cleanFilesCount: scanResult.cleanFilesCount,
    vulnerableFilesCount: scanResult.vulnerableFilesCount
  };

  return {
    codeDir: targetDir,
    timestamp: new Date().toISOString(),
    durationMs,
    score,
    status,
    summary,
    fileStatuses: scanResult.fileStatuses,
    issues: scanResult.issues
  };
}

export async function runAudit(config: AuditConfig): Promise<AuditReport> {
  const startTime = Date.now();
  const allIssues: AuditIssue[] = [];
  let fileStatuses: FileAuditStatus[] | undefined;
  let totalFilesScanned = 0;
  let cleanFilesCount = 0;
  let vulnerableFilesCount = 0;

  if (config.codeDir) {
    const scanResult = await scanSourceDirectory(config.codeDir);
    allIssues.push(...scanResult.issues);
    fileStatuses = scanResult.fileStatuses;
    totalFilesScanned = scanResult.totalFilesScanned;
    cleanFilesCount = scanResult.cleanFilesCount;
    vulnerableFilesCount = scanResult.vulnerableFilesCount;
  }

  if (config.url) {
    const browser = await chromium.launch({
      headless: config.headless !== false
    });

    const context = await browser.newContext({
      ignoreHTTPSErrors: true,
      viewport: { width: 1280, height: 800 },
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 TYW-Auditor/1.0"
    });

    const page = await context.newPage();
    const runtimeCollector = createRuntimeCollector(page);

    let metadata: PageMetadata = {
      title: "",
      url: config.url,
      statusCode: 0,
      protocol: "",
      contentType: ""
    };

    try {
      const response = await page.goto(config.url, {
        waitUntil: "networkidle",
        timeout: config.timeoutMs || 30000
      });

      if (response) {
        metadata = {
          title: await page.title(),
          url: page.url(),
          statusCode: response.status(),
          protocol: response.url().startsWith("https://") ? "HTTPS" : "HTTP",
          contentType: response.headers()["content-type"] || "unknown"
        };

        if (config.profile === "full" || config.profile === "security") {
          const headerIssues = await auditHeadersAndCookies(response, context);
          allIssues.push(...headerIssues);
        }
      }

      await page.waitForTimeout(1000);

      if (config.profile === "full" || config.profile === "forms") {
        const formIssues = await auditFormsAndInputs(page);
        allIssues.push(...formIssues);
      }

      if (config.profile === "full" || config.profile === "security") {
        const storageIssues = await auditClientStorage(page);
        allIssues.push(...storageIssues);
      }

      if (config.profile === "full" || config.profile === "runtime") {
        const runtimeIssues = evaluateRuntimeIssues(runtimeCollector);
        allIssues.push(...runtimeIssues);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      allIssues.push({
        id: "RUNNER-NAVIGATION-FATAL",
        category: "NETWORK_FAILURE",
        severity: "CRITICAL",
        title: "Page Navigation Failed or Timed Out",
        description: `Browser gagal mengakses ${config.url}: ${message}`,
        remediation: "Pastikan web server lokal sedang berjalan dan URL dapat diakses tanpa hambatan firewall.",
        evidence: message
      });
    } finally {
      await context.close();
      await browser.close();
    }
  }

  const durationMs = Date.now() - startTime;
  const { score, status } = calculateScore(allIssues);

  const summary = {
    total: allIssues.length,
    critical: allIssues.filter((i) => i.severity === "CRITICAL").length,
    high: allIssues.filter((i) => i.severity === "HIGH").length,
    medium: allIssues.filter((i) => i.severity === "MEDIUM").length,
    low: allIssues.filter((i) => i.severity === "LOW").length,
    info: allIssues.filter((i) => i.severity === "INFO").length,
    totalFilesScanned,
    cleanFilesCount,
    vulnerableFilesCount
  };

  return {
    url: config.url,
    codeDir: config.codeDir,
    timestamp: new Date().toISOString(),
    durationMs,
    score,
    status,
    summary,
    fileStatuses,
    issues: allIssues
  };
}
