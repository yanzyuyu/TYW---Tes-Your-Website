import pc from "picocolors";
import { AuditReport, AuditIssue, Severity } from "./types.js";

function getSeverityBadge(severity: Severity): string {
  switch (severity) {
    case "CRITICAL":
      return pc.bgRed(pc.white(pc.bold(" CRITICAL ")));
    case "HIGH":
      return pc.red(pc.bold("[HIGH]"));
    case "MEDIUM":
      return pc.yellow(pc.bold("[MEDIUM]"));
    case "LOW":
      return pc.cyan("[LOW]");
    case "INFO":
      return pc.dim("[INFO]");
  }
}

function getStatusBadge(status: "PASSED" | "FAILED" | "WARNING", score: number): string {
  if (status === "PASSED") {
    return pc.bgGreen(pc.black(pc.bold(` PASSED (Score: ${score}/100) `)));
  }
  if (status === "WARNING") {
    return pc.bgYellow(pc.black(pc.bold(` WARNING (Score: ${score}/100) `)));
  }
  return pc.bgRed(pc.white(pc.bold(` FAILED (Score: ${score}/100) `)));
}

export function formatPretty(report: AuditReport): string {
  const lines: string[] = [];
  const divider = pc.dim("─".repeat(64));

  lines.push("");
  lines.push(pc.bold(pc.cyan("=== TYW: Test Your Website - Autonomous Web Auditor ===")));
  lines.push(divider);
  lines.push(`${pc.bold("Target URL:")}     ${report.url}`);
  lines.push(`${pc.bold("Page Title:")}     ${report.metadata.title || "(Untitled)"}`);
  lines.push(
    `${pc.bold("Response:")}       ${report.metadata.statusCode} (${report.metadata.protocol}) in ${report.durationMs}ms`
  );
  lines.push(`${pc.bold("Overall Status:")} ${getStatusBadge(report.status, report.score)}`);
  lines.push(divider);

  lines.push(pc.bold("Summary:"));
  lines.push(
    `  Total Issues: ${report.summary.total} | ` +
      `${pc.red(`Critical: ${report.summary.critical}`)} | ` +
      `${pc.red(`High: ${report.summary.high}`)} | ` +
      `${pc.yellow(`Medium: ${report.summary.medium}`)} | ` +
      `${pc.cyan(`Low: ${report.summary.low}`)}`
  );
  lines.push(divider);

  if (report.issues.length === 0) {
    lines.push(pc.green(pc.bold("✔ Tidak ditemukan masalah keamanan atau runtime. Website prima!")));
    lines.push("");
    return lines.join("\n");
  }

  lines.push(pc.bold("Detail Temuan & Saran Remediasi:"));
  lines.push("");

  const severityOrder: Severity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"];
  const sortedIssues = [...report.issues].sort(
    (a, b) => severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity)
  );

  for (const issue of sortedIssues) {
    lines.push(`${getSeverityBadge(issue.severity)} ${pc.bold(issue.title)} [${pc.dim(issue.id)}]`);
    if (issue.location) {
      lines.push(`  ${pc.dim("Lokasi:")}      ${pc.underline(issue.location)}`);
    }
    lines.push(`  ${pc.dim("Deskripsi:")}   ${issue.description}`);
    if (issue.evidence) {
      lines.push(`  ${pc.dim("Bukti:")}       ${pc.yellow(issue.evidence)}`);
    }
    lines.push(`  ${pc.dim("Perbaikan:")}   ${pc.green(issue.remediation)}`);
    lines.push("");
  }

  lines.push(divider);
  lines.push(
    report.status === "FAILED"
      ? pc.red("Audit Selesai dengan Kegagalan. Perbaiki temuan prioritas CRITICAL & HIGH.")
      : pc.green("Audit Selesai. Tinjau saran perbaikan untuk meningkatkan ketahanan website.")
  );
  lines.push("");

  return lines.join("\n");
}

export function formatJson(report: AuditReport): string {
  return JSON.stringify(report, null, 2);
}
