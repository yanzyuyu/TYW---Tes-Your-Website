import { AuditIssue } from "../types.js";
import { Response, BrowserContext } from "playwright";

export async function auditHeadersAndCookies(
  response: Response,
  context: BrowserContext
): Promise<AuditIssue[]> {
  const issues: AuditIssue[] = [];
  const headers = response.headers();
  const url = response.url();
  const isHttps = url.startsWith("https://");

  const csp = headers["content-security-policy"];
  if (!csp) {
    issues.push({
      id: "SEC-CSP-MISSING",
      category: "SECURITY_HEADERS",
      severity: "HIGH",
      title: "Content Security Policy (CSP) Header Missing",
      description: "Halaman web tidak mendefinisikan header Content-Security-Policy untuk membatasi eksekusi resource eksternal.",
      remediation: "Tambahkan header Content-Security-Policy pada web server (contoh: default-src 'self'; script-src 'self'; object-src 'none').",
      location: "HTTP Response Headers"
    });
  } else if (csp.includes("unsafe-inline") || csp.includes("unsafe-eval")) {
    issues.push({
      id: "SEC-CSP-UNSAFE",
      category: "SECURITY_HEADERS",
      severity: "MEDIUM",
      title: "Permissive CSP Directives Detected",
      description: "CSP mengandung arahan 'unsafe-inline' atau 'unsafe-eval' yang melemahkan proteksi terhadap injeksi skrip.",
      remediation: "Gunakan nonce atau SHA-256 hash untuk inline scripts daripada mengizinkan unsafe-inline.",
      evidence: csp,
      location: "Content-Security-Policy"
    });
  }

  const xfo = headers["x-frame-options"];
  if (!xfo && (!csp || !csp.includes("frame-ancestors"))) {
    issues.push({
      id: "SEC-XFO-MISSING",
      category: "SECURITY_HEADERS",
      severity: "MEDIUM",
      title: "Anti-Clickjacking Protection Missing",
      description: "Header X-Frame-Options atau CSP frame-ancestors tidak ditemukan. Halaman berisiko di-embed dalam iframe berbahaya.",
      remediation: "Konfigurasikan header 'X-Frame-Options: DENY' atau 'X-Frame-Options: SAMEORIGIN'.",
      location: "HTTP Response Headers"
    });
  }

  const xcto = headers["x-content-type-options"];
  if (!xcto || xcto.toLowerCase() !== "nosniff") {
    issues.push({
      id: "SEC-XCTO-MISSING",
      category: "SECURITY_HEADERS",
      severity: "LOW",
      title: "MIME-Sniffing Protection Missing",
      description: "Header X-Content-Type-Options tidak diatur ke 'nosniff'. Browser dapat salah menginterpretasikan tipe file.",
      remediation: "Tambahkan header 'X-Content-Type-Options: nosniff' pada server.",
      location: "HTTP Response Headers"
    });
  }

  if (isHttps) {
    const hsts = headers["strict-transport-security"];
    if (!hsts) {
      issues.push({
        id: "SEC-HSTS-MISSING",
        category: "SECURITY_HEADERS",
        severity: "HIGH",
        title: "HTTP Strict Transport Security (HSTS) Missing",
        description: "Koneksi HTTPS tidak menerapkan header HSTS untuk mencegah downgrade attack ke protokol HTTP biasa.",
        remediation: "Tambahkan 'Strict-Transport-Security: max-age=31536000; includeSubDomains'.",
        location: "HTTP Response Headers"
      });
    }
  }

  const referrerPolicy = headers["referrer-policy"];
  if (!referrerPolicy) {
    issues.push({
      id: "SEC-REFERRER-MISSING",
      category: "SECURITY_HEADERS",
      severity: "LOW",
      title: "Referrer-Policy Header Unset",
      description: "Header Referrer-Policy tidak ditemukan. URL dan query parameter sensitif berisiko bocor ke situs eksternal.",
      remediation: "Atur header 'Referrer-Policy: strict-origin-when-cross-origin' atau 'no-referrer'.",
      location: "HTTP Response Headers"
    });
  }

  const permissionsPolicy = headers["permissions-policy"];
  if (!permissionsPolicy) {
    issues.push({
      id: "SEC-PERMISSIONS-MISSING",
      category: "SECURITY_HEADERS",
      severity: "INFO",
      title: "Permissions-Policy Header Missing",
      description: "Fitur browser seperti mikrofon, kamera, dan geolocation belum dibatasi eksplisit via header Permissions-Policy.",
      remediation: "Definisikan 'Permissions-Policy: camera=(), microphone=(), geolocation=()' jika tidak diperlukan.",
      location: "HTTP Response Headers"
    });
  }

  const cookies = await context.cookies([url]);
  for (const cookie of cookies) {
    if (!cookie.httpOnly) {
      issues.push({
        id: `SEC-COOKIE-HTTPONLY-${cookie.name}`,
        category: "COOKIES",
        severity: "HIGH",
        title: `Cookie '${cookie.name}' Missing HttpOnly Flag`,
        description: `Cookie '${cookie.name}' dapat diakses langsung oleh JavaScript di client, berisiko dicuri melalui XSS.`,
        remediation: `Set flag 'HttpOnly' pada cookie '${cookie.name}' saat pembuatan di backend.`,
        location: `Cookie: ${cookie.name}`
      });
    }

    if (isHttps && !cookie.secure) {
      issues.push({
        id: `SEC-COOKIE-SECURE-${cookie.name}`,
        category: "COOKIES",
        severity: "HIGH",
        title: `Cookie '${cookie.name}' Missing Secure Flag`,
        description: `Cookie '${cookie.name}' ditransmisikan tanpa flag Secure di koneksi HTTPS.`,
        remediation: `Set flag 'Secure' pada cookie '${cookie.name}'.`,
        location: `Cookie: ${cookie.name}`
      });
    }

    if (!cookie.sameSite || cookie.sameSite === "None") {
      issues.push({
        id: `SEC-COOKIE-SAMESITE-${cookie.name}`,
        category: "COOKIES",
        severity: "MEDIUM",
        title: `Cookie '${cookie.name}' Permissive SameSite Configuration`,
        description: `Cookie '${cookie.name}' memiliki atribut SameSite kosong atau 'None' tanpa proteksi CSRF ketat.`,
        remediation: `Atur atribut SameSite menjadi 'Lax' atau 'Strict'.`,
        location: `Cookie: ${cookie.name}`
      });
    }
  }

  return issues;
}
