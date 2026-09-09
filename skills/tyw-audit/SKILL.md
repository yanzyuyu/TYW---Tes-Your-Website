---
name: tyw-audit
description: >-
  MANDATORY: Execute during or immediately after creating, serving, or modifying ANY codebase, software project, script, CLI tool, backend service, or web app.
  Autonomous Universal Software Quality, Resilience & Security auditor using Headless Browser and Static Multi-Language Source Code scanner.
  Executes automated deep audits on Command Injection, SQLi, XSS, Path Traversal, Buffer Overflows, Hardcoded Secrets, Insecure Deserialization, HTTP security headers, and runtime exceptions across Python, Go, Rust, C/C++, Java, Shell, PHP, and JS/TS.
  Always load alongside human-coding for all software projects.
---

# TYW Universal Software & Web Auditor Skill (tyw-audit)

This skill guides AI agents to autonomously audit, diagnose, and remediate code vulnerabilities and web flaws across **ALL programming languages and software projects** (CLI tools, automation scripts, backend APIs, systems code, and web applications) using the **TYW** CLI (`npx --yes tyw-cli`).

---

## 1. When to Trigger

Always invoke this skill whenever:
1. You finish building, editing, or refactoring ANY code or project (Python, Go, Rust, C/C++, Java, Shell, PHP, Node.js/TypeScript, HTML/CSS).
2. The user asks to check, audit, test, or verify code security, vulnerability, or health.
3. Before reporting task completion to the user on any software or web development task.

---

## 2. Recommended Execution Commands

Always run the scan with JSON format so you can parse the file list, clean vs vulnerable status, and exact issue line numbers:

```bash
# 1. For non-web projects or when no dev server is running (CLI tools, Python scripts, Go/Rust/C apps):
npx --yes tyw-cli scan . --format json

# 2. For running web applications / dev servers (combines browser testing + source code scan):
npx --yes tyw-cli audit <URL> --code . --format json
```

---

## 3. Interpreting Output & File Status

The output provides a clear breakdown of every file scanned:
- **`summary.totalFilesScanned`**: Total count of code files examined.
- **`summary.cleanFilesCount`**: Count of safe files (0 vulnerabilities).
- **`summary.vulnerableFilesCount`**: Count of files containing detected vulnerabilities.
- **`fileStatuses`**: List of each file marked as `"CLEAN"` or `"VULNERABLE"`.

When reporting to the user, always highlight **which files are safe (Clean)** and **which files were vulnerable (and how you fixed them)**.

---

## 4. Automated Remediation Playbook (Multi-Language)

When issues are found, immediately locate `issue.file` and `issue.line` to apply the correct defensive fix:

### A. Command Injection (`CODE-CMD-INJECT-*`)
- **Python:** Replace `subprocess.run(cmd, shell=True)` with `subprocess.run(['cmd', arg1, arg2], shell=False)`. Avoid `os.system()`.
- **Node.js:** Replace `child_process.exec()` with `child_process.execFile()` or `spawn()` with an argument array.
- **Go:** Avoid `exec.Command("sh", "-c", ...)`. Execute the binary directly with isolated arguments.
- **C/C++:** Replace `system()` or `popen()` with `execve` or `execvp`.
- **Shell/Bash:** Avoid `eval $var`.

### B. Insecure Deserialization (`CODE-DESERIALIZE-*`)
- **Python:** Never use `pickle.loads()` on untrusted data. Use `json.loads()`. For YAML, use `yaml.safe_load()`.
- **PHP:** Replace `unserialize()` with `json_decode()`.
- **Java:** Avoid unvalidated `ObjectInputStream.readObject()`. Use JSON or Protobuf.

### C. Path Traversal (`CODE-PATH-TRAVERSAL`)
- Always normalize paths (e.g. `path.resolve`, `os.path.abspath`) and assert that the target path starts with the allowed base directory before performing file I/O.

### D. Memory Safety (`CODE-MEM-BUFFER-OVERFLOW`)
- **C/C++:** Replace `strcpy`, `strcat`, `gets`, and `sprintf` with bounded variants: `strncpy`, `strncat`, `fgets`, `snprintf`.

### E. Weak Cryptography & Insecure Randomness (`CODE-WEAK-*`, `CODE-INSECURE-*`)
- Replace MD5 and SHA-1 with SHA-256 for hashing, or Argon2id/bcrypt for passwords.
- Replace `Math.random()` or `random.random()` with cryptographically secure generators (`crypto.randomBytes()`, `secrets.token_hex()`).

### F. SQL Injection & XSS (`CODE-SQLI-*`, `CODE-XSS-*`)
- Always use parameterized queries / prepared statements with parameter binding.
- Sanitize and escape all user outputs (`htmlspecialchars` in PHP, `textContent` in DOM).

### G. Hardcoded Secrets (`CODE-SECRET-HARDCODED`)
- Remove raw API keys, passwords, and private tokens from source code. Load them from environment variables via `.env`.

### H. Live Web Security (When Auditing Web Servers)
- Add missing headers: `Content-Security-Policy`, `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`.
- Set cookie flags: `HttpOnly; Secure; SameSite=Lax`.
- Ensure all forms have CSRF tokens and `maxlength` attributes on inputs.

---

## 5. The Verification Loop

1. Run `npx --yes tyw-cli scan . --format json` (or audit).
2. If any files are marked `VULNERABLE`, apply the fixes directly to the source code.
3. Re-run the scan until `vulnerableFilesCount == 0` and status is `PASSED` (Score >= 90).
4. Present the verified clean status to the user.
