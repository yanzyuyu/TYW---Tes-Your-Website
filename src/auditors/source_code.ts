import fs from "node:fs/promises";
import path from "node:path";
import { AuditIssue } from "../types.js";

interface Rule {
  id: string;
  severity: AuditIssue["severity"];
  title: string;
  description: string;
  remediation: string;
  extensions: string[];
  pattern: RegExp;
}

const RULES: Rule[] = [
  {
    id: "CODE-SQLI-PHP-CONCAT",
    severity: "CRITICAL",
    title: "SQL Injection Risk (PHP String Concatenation)",
    description: "Query SQL dibentuk menggunakan penggabungan string variabel mentah tanpa prepared statement.",
    remediation: "Gunakan PDO prepared statements dengan parameter binding ($stmt->prepare('SELECT ... WHERE id = :id'); $stmt->execute(['id' => $val]);).",
    extensions: [".php"],
    pattern: /(query|prepare|exec)\s*\(\s*["'].*(\$_(GET|POST|REQUEST|COOKIE)|\$\w+)\b/i
  },
  {
    id: "CODE-SQLI-PYTHON-FSTRING",
    severity: "CRITICAL",
    title: "SQL Injection Risk (Python F-String/Format in Query)",
    description: "Query database menggunakan format f-string atau operator % mentah.",
    remediation: "Gunakan parameterized query (cursor.execute('SELECT ... WHERE id = %s', (val,))).",
    extensions: [".py"],
    pattern: /cursor\.execute\s*\(\s*(f["']|["'].*%\s*\()/i
  },
  {
    id: "CODE-SQLI-JS-TEMPLATE",
    severity: "CRITICAL",
    title: "SQL Injection Risk (JavaScript Template Literal in Query)",
    description: "Query SQL memuat interpolasi template literal `${...}` tanpa parameter binding.",
    remediation: "Gunakan parameterized query (db.query('SELECT ... WHERE id = $1', [val])).",
    extensions: [".js", ".ts", ".jsx", ".tsx"],
    pattern: /(query|execute)\s*\(\s*`[^`]*\$\{[^}]+\}[^`]*`/i
  },
  {
    id: "CODE-XSS-PHP-ECHO",
    severity: "HIGH",
    title: "Cross-Site Scripting (XSS) via Unescaped PHP Output",
    description: "Input pengguna ($_GET, $_POST, $_REQUEST) dicetak langsung ke halaman tanpa sanitasi htmlspecialchars.",
    remediation: "Bungkus output dengan htmlspecialchars($input, ENT_QUOTES, 'UTF-8').",
    extensions: [".php"],
    pattern: /(echo|print|<\?=)\s*(\$_(GET|POST|REQUEST)|.*\b(GET|POST|REQUEST)\b)/i
  },
  {
    id: "CODE-XSS-JS-INNERHTML",
    severity: "HIGH",
    title: "DOM-based XSS Risk (Unsafe innerHTML)",
    description: "Pemberian nilai langsung ke innerHTML atau document.write dapat memicu eksekusi skrip berbahaya.",
    remediation: "Gunakan textContent atau innerText, atau gunakan library sanitasi seperti DOMPurify sebelum merender HTML.",
    extensions: [".js", ".ts", ".jsx", ".tsx"],
    pattern: /(\.innerHTML\s*=|\.outerHTML\s*=|document\.write\s*\()/i
  },
  {
    id: "CODE-XSS-REACT-DANGEROUS",
    severity: "HIGH",
    title: "Unsafe dangerouslySetInnerHTML in React/JSX Component",
    description: "Penggunaan dangerouslySetInnerHTML tanpa sanitasi ketat berisiko XSS.",
    remediation: "Gunakan DOMPurify.sanitize(...) sebelum memasukkan konten ke dangerouslySetInnerHTML.",
    extensions: [".jsx", ".tsx", ".js", ".ts"],
    pattern: /dangerouslySetInnerHTML\s*=\s*\{/i
  },
  {
    id: "CODE-EXEC-DANGEROUS-FN",
    severity: "CRITICAL",
    title: "Dangerous Code/Command Execution Function",
    description: "Fungsi eksekusi perintah shell atau kode dinamis ditemukan pada kode sumber.",
    remediation: "Hindari fungsi eksekusi dinamis. Gunakan library spesifik dengan argumen terisolasi.",
    extensions: [".php", ".js", ".ts", ".py"],
    pattern: /\b(eval|shell_exec|passthru|popen|unserialize|pickle\.loads)\s*\(/i
  },
  {
    id: "CODE-SECRET-HARDCODED",
    severity: "HIGH",
    title: "Hardcoded Credential or API Secret Detected",
    description: "Kunci rahasia, password, atau API key terdeteksi tersimpan mentah dalam file kode.",
    remediation: "Pindahkan kredensial ke environment variables (.env) dan muat secara aman saat runtime.",
    extensions: [".php", ".js", ".ts", ".py", ".json"],
    pattern: /(api[_-]?key|secret_key|private[_-]?key|password|passwd|jwt_secret)\s*[:=]\s*["'][a-zA-Z0-9_\-\.\$\!\#]{8,}["']/i
  }
];

const IGNORE_DIRS = new Set([
  "node_modules",
  ".git",
  "vendor",
  "dist",
  "build",
  ".next",
  ".nuxt",
  "__pycache__",
  "venv",
  ".venv",
  ".cache",
  "coverage"
]);

const SCANNABLE_EXTS = new Set([".php", ".js", ".ts", ".jsx", ".tsx", ".py", ".html", ".json"]);

async function walkDirectory(dir: string, fileList: string[] = []): Promise<string[]> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (IGNORE_DIRS.has(entry.name)) {
        continue;
      }
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walkDirectory(fullPath, fileList);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (SCANNABLE_EXTS.has(ext)) {
          fileList.push(fullPath);
        }
      }
    }
  } catch {
    return fileList;
  }
  return fileList;
}

export async function scanSourceDirectory(targetDir: string): Promise<AuditIssue[]> {
  const issues: AuditIssue[] = [];
  const files = await walkDirectory(targetDir);

  for (const filePath of files) {
    const ext = path.extname(filePath).toLowerCase();
    const applicableRules = RULES.filter((r) => r.extensions.includes(ext));
    if (applicableRules.length === 0) {
      continue;
    }

    try {
      const content = await fs.readFile(filePath, "utf-8");
      const lines = content.split(/\r?\n/);
      const relativePath = path.relative(targetDir, filePath);

      for (let i = 0; i < lines.length; i++) {
        const lineContent = lines[i];
        const lineNumber = i + 1;

        for (const rule of applicableRules) {
          if (rule.pattern.test(lineContent)) {
            issues.push({
              id: rule.id,
              category: "STATIC_CODE",
              severity: rule.severity,
              title: rule.title,
              description: rule.description,
              remediation: rule.remediation,
              file: relativePath,
              line: lineNumber,
              codeSnippet: lineContent.trim(),
              location: `${relativePath}:${lineNumber}`
            });
          }
        }
      }
    } catch {
      continue;
    }
  }

  return issues;
}
