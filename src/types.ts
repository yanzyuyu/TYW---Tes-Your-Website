export type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";

export type IssueCategory =
  | "SECURITY_HEADERS"
  | "COOKIES"
  | "CONSOLE_RUNTIME"
  | "NETWORK_FAILURE"
  | "FORM_INTEGRITY"
  | "STORAGE"
  | "HYDRATION"
  | "STATIC_CODE";

export interface AuditIssue {
  id: string;
  category: IssueCategory;
  severity: Severity;
  title: string;
  description: string;
  remediation: string;
  evidence?: string;
  location?: string;
  file?: string;
  line?: number;
  codeSnippet?: string;
}

export interface AuditConfig {
  url: string;
  timeoutMs: number;
  headless: boolean;
  profile: "full" | "security" | "forms" | "runtime";
  format: "pretty" | "json";
  outputFile?: string;
  codeDir?: string;
}

export interface PageMetadata {
  title: string;
  url: string;
  statusCode: number;
  protocol: string;
  contentType: string;
}

export interface AuditReport {
  url?: string;
  codeDir?: string;
  timestamp: string;
  durationMs: number;
  score: number;
  status: "PASSED" | "FAILED" | "WARNING";
  summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  metadata?: PageMetadata;
  issues: AuditIssue[];
}
