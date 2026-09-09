import { AuditIssue } from "../types.js";
import { Page, Request } from "playwright";

export interface RuntimeCollector {
  pageErrors: Error[];
  consoleErrors: string[];
  failedRequests: { url: string; failureText: string }[];
  serverErrors: { url: string; status: number }[];
}

export function createRuntimeCollector(page: Page): RuntimeCollector {
  const collector: RuntimeCollector = {
    pageErrors: [],
    consoleErrors: [],
    failedRequests: [],
    serverErrors: []
  };

  page.on("pageerror", (error) => {
    collector.pageErrors.push(error);
  });

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      collector.consoleErrors.push(msg.text());
    }
  });

  page.on("requestfailed", (request: Request) => {
    const failure = request.failure();
    collector.failedRequests.push({
      url: request.url(),
      failureText: failure ? failure.errorText : "Unknown network error"
    });
  });

  page.on("response", (res) => {
    const status = res.status();
    if (status >= 500) {
      collector.serverErrors.push({
        url: res.url(),
        status
      });
    }
  });

  return collector;
}

export function evaluateRuntimeIssues(collector: RuntimeCollector): AuditIssue[] {
  const issues: AuditIssue[] = [];

  for (const err of collector.pageErrors) {
    const msg = err.message || String(err);
    const isHydration =
      msg.toLowerCase().includes("hydration") ||
      msg.toLowerCase().includes("minified react error #418") ||
      msg.toLowerCase().includes("minified react error #423") ||
      msg.toLowerCase().includes("server-rendered html didn't match");

    if (isHydration) {
      issues.push({
        id: "RUNTIME-HYDRATION-MISMATCH",
        category: "HYDRATION",
        severity: "HIGH",
        title: "SSR Hydration Mismatch Detected",
        description: "Terjadi ketidakcocokan antara HTML yang di-render di server dengan pohon DOM di browser. Event listener pada elemen UI berisiko tidak berfungsi.",
        remediation: "Pastikan komponen tidak me-render state acak, tanggal dinamis, atau objek khusus browser (window/localStorage) sebelum komponen ter-mount.",
        evidence: msg,
        location: err.stack?.split("\n")[1]?.trim()
      });
    } else {
      issues.push({
        id: "RUNTIME-UNCAUGHT-EXCEPTION",
        category: "CONSOLE_RUNTIME",
        severity: "CRITICAL",
        title: "Uncaught Browser Runtime Exception",
        description: "Aplikasi melempar uncaught exception di thread JavaScript client.",
        remediation: "Bungkus logika rawan error dengan try-catch atau pasang React/Vue Error Boundary untuk mencegah seluruh UI crash.",
        evidence: msg,
        location: err.stack?.split("\n")[1]?.trim()
      });
    }
  }

  for (const consoleMsg of collector.consoleErrors) {
    const isDuplicate = issues.some((i) => i.evidence === consoleMsg);
    if (!isDuplicate) {
      issues.push({
        id: "RUNTIME-CONSOLE-ERROR",
        category: "CONSOLE_RUNTIME",
        severity: "MEDIUM",
        title: "Browser Console Error Logged",
        description: "Pesan error tercatat di console browser selama proses audit.",
        remediation: "Investigasi log error console dan pastikan dependensi atau script client terinisialisasi dengan benar.",
        evidence: consoleMsg
      });
    }
  }

  for (const failed of collector.failedRequests) {
    issues.push({
      id: "NET-REQUEST-FAILED",
      category: "NETWORK_FAILURE",
      severity: "MEDIUM",
      title: "Network Resource Load Failure",
      description: `Resource gagal dimuat oleh browser: ${failed.failureText}`,
      remediation: "Pastikan URL resource statis (gambar, font, chunk JS) valid dan server host aktif.",
      evidence: `${failed.url} (${failed.failureText})`,
      location: failed.url
    });
  }

  for (const srvErr of collector.serverErrors) {
    issues.push({
      id: "NET-SERVER-500",
      category: "NETWORK_FAILURE",
      severity: "CRITICAL",
      title: `Server Responded With Internal Error (${srvErr.status})`,
      description: `Endpoint lokal mengembalikan status code ${srvErr.status} yang menandakan unhandled crash pada sisi backend.`,
      remediation: "Periksa error log backend dan tangani exception pada controller endpoint terkait.",
      evidence: `Status ${srvErr.status} from ${srvErr.url}`,
      location: srvErr.url
    });
  }

  return issues;
}
