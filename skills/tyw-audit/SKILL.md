---
name: tyw-audit
description: >-
  MANDATORY: Execute during or immediately after creating, serving, or modifying ANY web page, web service, frontend component, or backend API prototype.
  Autonomous Web Quality, Resilience & Security auditor using headless Playwright and Static Source Code scanner.
  Executes automated deep audits on HTTP security headers, cookie lifecycle, browser console/runtime exceptions, form boundary fuzzing, client storage, and source code vulnerabilities (SQLi, XSS, secrets, dangerous functions).
---

# TYW Web & Source Code Auditor Skill (tyw-audit)

This skill guides AI agents to autonomously audit, diagnose, and remediate web security vulnerabilities, runtime exceptions, form boundary flaws, and source code vulnerabilities using the **TYW (Test Your Website)** CLI.

---

## 1. When to Trigger

Always invoke this skill whenever:
1. You finish building or refactoring any web page, backend service, or fullstack prototype (PHP, Node.js, Python, React, Vue, HTML/CSS).
2. A local dev server is running or local source files exist.
3. The user asks to audit, test, or verify the security and resilience of any web application or codebase.

---

## 2. Recommended Execution Command (Dual-Audit)

Always run the unified audit combining **live browser testing** and **source code line scanning** with JSON output:

```bash
# Recommended: execute directly via npx without manual installation:
npx tyw-cli audit <URL> --code ./ --format json

# If installed globally via npm (npm i -g tyw-cli):
tyw-cli audit <URL> --code ./ --format json
# (or 'tyw audit <URL> --code ./ --format json')

# Or run via local binary in scratch directory:
node C:/Users/MSI/.gemini/antigravity/scratch/TYW---Tes-Your-Website/bin/tyw.js audit <URL> --code ./ --format json

# If only static code scan is needed (no live server running yet):
npx tyw-cli scan ./ --format json
```

---

## 3. Automated Remediation Playbook

When `status == "FAILED"` or issues are returned, immediately inspect the issues array and fix the exact files and lines:

### A. Static Source Code Vulnerabilities (Exact File & Line)
- **`CODE-SQLI-*` (SQL Injection Risk):**
  - Locate `issue.file` and `issue.line`.
  - Refactor raw string concatenation to prepared statements:
    - PHP: `$stmt = $pdo->prepare('SELECT ... WHERE id = :id'); $stmt->execute(['id' => $id]);`
    - Python: `cursor.execute('SELECT ... WHERE id = %s', (id,))`
    - Node/TS: `db.query('SELECT ... WHERE id = $1', [id])`

- **`CODE-XSS-*` (Cross-Site Scripting):**
  - Locate `issue.file` and `issue.line`.
  - PHP: Wrap output in `htmlspecialchars($input, ENT_QUOTES, 'UTF-8')`.
  - JS/React: Replace `innerHTML` with `textContent` or sanitize with `DOMPurify.sanitize()`.

- **`CODE-SECRET-HARDCODED`:**
  - Remove plain secrets/API keys from source files. Load them via environment variables (`process.env.KEY`, `getenv('KEY')`, `os.environ.get('KEY')`).

- **`CODE-EXEC-DANGEROUS-FN`:**
  - Eliminate `eval()`, `shell_exec()`, `system()`, or `unserialize()`. Use typed handlers instead.

### B. Live Web & Security Headers
- **`SEC-CSP-MISSING` / `SEC-CSP-UNSAFE`:**
  - Add `Content-Security-Policy` header to server responses:
    ```
    default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'self';
    ```
- **`SEC-XFO-MISSING`:** Add `X-Frame-Options: SAMEORIGIN`.
- **`SEC-HSTS-MISSING`:** Add `Strict-Transport-Security: max-age=31536000; includeSubDomains`.
- **`SEC-XCTO-MISSING`:** Add `X-Content-Type-Options: nosniff`.
- **`SEC-REFERRER-MISSING`:** Add `Referrer-Policy: strict-origin-when-cross-origin`.

### C. Cookie & Session Security
- Set `httpOnly: true`, `secure: true`, and `sameSite: "Lax"` (or `"Strict"`) on all session cookies.

### D. Forms & Boundary Integrity
- **`FORM-CSRF-MISSING`:** Add hidden CSRF token input on state-changing forms (`POST`, `PUT`, `DELETE`).
- **`FORM-INPUT-UNBOUNDED` / `FORM-PWD-NO-MAXLENGTH`:** Add strict `maxlength` attributes to all form inputs.

### E. Runtime & Hydration Errors
- **`RUNTIME-CONSOLE-ERROR` / `RUNTIME-UNCAUGHT-EXCEPTION`:** Inspect logged error traces and add try-catch / Error Boundaries.
- **`RUNTIME-HYDRATION-MISMATCH`:** Ensure server-rendered HTML matches browser DOM (avoid random/date mismatch in initial render).

---

## 4. The Verification Loop

After applying the fixes:
1. Re-run `tyw audit <URL> --code ./ --format json`.
2. Verify that `status == "PASSED"` and `score >= 90`.
3. Do not declare the task finished until all `CRITICAL` and `HIGH` severity issues are eliminated.
