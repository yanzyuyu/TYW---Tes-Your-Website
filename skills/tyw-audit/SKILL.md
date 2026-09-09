---
name: tyw-audit
description: >-
  MANDATORY: Execute during or immediately after creating, serving, or modifying ANY web page, web service, frontend component, or backend API prototype.
  Autonomous Web Quality, Resilience & Security auditor using headless Playwright.
  Executes automated deep audits on HTTP security headers, cookie lifecycle, browser console/runtime exceptions, form boundary fuzzing, and client storage.
---

# TYW Web Auditor Skill (tyw-audit)

This skill guides AI agents to autonomously audit, diagnose, and remediate web security vulnerabilities, runtime exceptions, form boundary flaws, and hydration failures using the **TYW (Test Your Website)** CLI.

---

## 1. When to Trigger

Always invoke this skill whenever:
1. You finish building or refactoring a web page or prototype (React, Vue, Next.js, Express, FastAPI, HTML/CSS).
2. A local dev server is launched or accessible (`http://localhost:3000`, `http://127.0.0.1:8000`, etc.).
3. The user asks to audit, test, or verify the security and resilience of any web application.

---

## 2. Execution Command

Run the audit in JSON format so issues can be parsed directly:

```bash
# If TYW is installed globally or in current workspace:
tyw audit <URL> --format json

# Or run via npx:
npx tyw audit <URL> --format json
```

### Focused Profiles
- **Security only (headers, cookies, storage):** `--profile security`
- **Forms & boundary inputs only:** `--profile forms`
- **Console errors & runtime only:** `--profile runtime`

---

## 3. Automated Remediation Playbook

When `status == "FAILED"` or issues are returned, immediately apply the appropriate fixes based on the Issue ID:

### A. Security Headers
- **`SEC-CSP-MISSING` / `SEC-CSP-UNSAFE`:**
  - Add `Content-Security-Policy` header to server responses:
    ```
    default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'self';
    ```
  - For static HTML without a backend server, add meta tag in `<head>`:
    ```html
    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; object-src 'none';">
    ```

- **`SEC-XFO-MISSING`:**
  - Add `X-Frame-Options: SAMEORIGIN` or `X-Frame-Options: DENY` on server middleware.

- **`SEC-HSTS-MISSING`:**
  - Add `Strict-Transport-Security: max-age=31536000; includeSubDomains` on all HTTPS endpoints.

- **`SEC-XCTO-MISSING`:**
  - Add `X-Content-Type-Options: nosniff` on server responses.

- **`SEC-REFERRER-MISSING`:**
  - Add `Referrer-Policy: strict-origin-when-cross-origin` on server responses or meta tag:
    ```html
    <meta name="referrer" content="strict-origin-when-cross-origin">
    ```

### B. Cookie Security
- **`SEC-COOKIE-HTTPONLY-*`:**
  - Set `httpOnly: true` in cookie creation options to prevent access by client JavaScript.
- **`SEC-COOKIE-SECURE-*`:**
  - Set `secure: true` on production/HTTPS environments.
- **`SEC-COOKIE-SAMESITE-*`:**
  - Set `sameSite: "Lax"` or `sameSite: "Strict"` to prevent cross-site request forgery.

### C. Forms & Boundary Fuzzing
- **`FORM-CSRF-MISSING`:**
  - Add a hidden CSRF token input to state-changing forms (`POST`, `PUT`, `DELETE`):
    ```html
    <input type="hidden" name="csrf_token" value="{{ csrf_token }}">
    ```
  - For SPA/API calls, ensure an anti-CSRF header (e.g. `X-CSRF-Token`) is attached.
- **`FORM-INPUT-UNBOUNDED` / `FORM-PWD-NO-MAXLENGTH`:**
  - Add strict `maxlength` attributes to all text and password fields to match database column limits and prevent server hashing DoS:
    ```html
    <input type="text" name="username" maxlength="50" required>
    <input type="password" name="password" maxlength="128" required autocomplete="current-password">
    ```

### D. Client Storage
- **`STORAGE-SENSITIVE-*`:**
  - Never store session tokens, JWTs, or passwords in `localStorage` or `sessionStorage`.
  - Migrate authentication state to HTTP-only secure session cookies.

### E. Runtime & Hydration Errors
- **`RUNTIME-HYDRATION-MISMATCH`:**
  - Ensure server-rendered HTML matches browser DOM. Avoid referencing `window`, `localStorage`, or dynamic dates (`Date.now()`, `Math.random()`) during initial server render.
- **`RUNTIME-CONSOLE-ERROR` / `RUNTIME-UNCAUGHT-EXCEPTION`:**
  - Inspect the logged error trace and wrap unhandled logic with error boundaries and try-catch blocks.

---

## 4. The Verification Loop

After applying the fixes:
1. Re-run `tyw audit <URL> --format json`.
2. Verify that `status == "PASSED"` and `score >= 90`.
3. Do not declare the task finished until all `CRITICAL` and `HIGH` severity issues are eliminated.
