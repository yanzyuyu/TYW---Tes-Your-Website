import fs from "node:fs/promises";
import path from "node:path";
import { AuditIssue, FileAuditStatus } from "../types.js";

interface Rule {
  id: string;
  category: AuditIssue["category"];
  severity: AuditIssue["severity"];
  title: string;
  description: string;
  remediation: string;
  extensions: string[];
  pattern: RegExp;
}

const RULES: Rule[] = [
  {
    id: "CODE-CMD-INJECT-PYTHON",
    category: "COMMAND_INJECTION",
    severity: "CRITICAL",
    title: "Command Injection Risk (Python Unsafe Subprocess / Shell Execution)",
    description: "Eksekusi perintah shell menggunakan subprocess(shell=True) atau os.system dengan interpolasi string.",
    remediation: "Gunakan subprocess.run(['cmd', arg1, arg2], shell=False) tanpa interpolasi shell mentah.",
    extensions: [".py"],
    pattern: /(subprocess\.(Popen|run|call|check_output)\(.*shell\s*=\s*True|os\.system\s*\(|os\.popen\s*\()/i
  },
  {
    id: "CODE-CMD-INJECT-NODE",
    category: "COMMAND_INJECTION",
    severity: "CRITICAL",
    title: "Command Injection Risk (Node.js child_process.exec)",
    description: "child_process.exec atau execSync mengeksekusi string shell dinamis yang berisiko disusupi perintah jahat.",
    remediation: "Gunakan child_process.execFile atau spawn dengan array argumen terisolasi.",
    extensions: [".js", ".ts", ".jsx", ".tsx", ".mjs", ".cjs"],
    pattern: /(child_process\.(exec|execSync)\s*\(\s*`|exec\s*\(\s*`[^`]*\$\{[^}]+\}[^`]*`)/i
  },
  {
    id: "CODE-CMD-INJECT-GO",
    category: "COMMAND_INJECTION",
    severity: "CRITICAL",
    title: "Command Injection Risk (Go os/exec Shell Wrapper)",
    description: "Penggunaan exec.Command('sh', '-c', ...) atau 'bash' dengan penggabungan string variabel.",
    remediation: "Eksekusi binary langsung dengan argumen terpisah (exec.Command('binary', arg1, arg2)).",
    extensions: [".go"],
    pattern: /exec\.Command\s*\(\s*["'](sh|bash|cmd|powershell)["']\s*,\s*["']-[cC]["']\s*,\s*.*\+/i
  },
  {
    id: "CODE-CMD-INJECT-C",
    category: "COMMAND_INJECTION",
    severity: "CRITICAL",
    title: "Command Injection Risk (C/C++ system / popen)",
    description: "Pemanggilan system() atau popen() dengan string yang dapat dimanipulasi pengguna.",
    remediation: "Gunakan keluarga fungsi exec (execve, execvp) dengan array argumen statis.",
    extensions: [".c", ".cpp", ".cc", ".h", ".hpp"],
    pattern: /\b(system|popen)\s*\(\s*[^"]*\b/i
  },
  {
    id: "CODE-CMD-INJECT-SHELL",
    category: "COMMAND_INJECTION",
    severity: "CRITICAL",
    title: "Command Injection Risk (Shell/Bash eval on Dynamic Variable)",
    description: "Penggunaan perintah 'eval' pada variabel shell dinamis tanpa sanitasi.",
    remediation: "Hindari 'eval'. Gunakan fungsi atau array bash bawaan untuk parsing perintah.",
    extensions: [".sh", ".bash"],
    pattern: /\beval\s+["']?\$[a-zA-Z_]/i
  },
  {
    id: "CODE-SQLI-GENERIC",
    category: "STATIC_CODE",
    severity: "CRITICAL",
    title: "SQL Injection Risk (Raw String Concatenation / Interpolation)",
    description: "Query SQL dibentuk menggunakan penggabungan string variabel mentah atau format literal.",
    remediation: "Gunakan parameterized queries atau prepared statements dengan parameter binding.",
    extensions: [".php", ".py", ".js", ".ts", ".go", ".java", ".kt"],
    pattern: /(query|prepare|execute)\s*\(\s*(f["'].*\{|["'].*(\$_(GET|POST|REQUEST)|\$\w+|\bWHERE\b.*(\+|\.))\b|`[^`]*\$\{[^}]+\}[^`]*`)/i
  },
  {
    id: "CODE-DESERIALIZE-PYTHON",
    category: "INSECURE_DESERIALIZATION",
    severity: "CRITICAL",
    title: "Insecure Deserialization (Python pickle / unsafe yaml)",
    description: "Penggunaan pickle.loads atau yaml.load tanpa SafeLoader dapat mengeksekusi bytecode arbitrer.",
    remediation: "Gunakan format serialisasi aman seperti JSON, atau gunakan yaml.safe_load(data).",
    extensions: [".py"],
    pattern: /\b(pickle\.loads?\s*\(|yaml\.load\s*\([^,)]*\))/i
  },
  {
    id: "CODE-DESERIALIZE-PHP",
    category: "INSECURE_DESERIALIZATION",
    severity: "CRITICAL",
    title: "Insecure Deserialization (PHP unserialize)",
    description: "unserialize() pada input eksternal memicu Object Injection dan eksekusi fungsi destruktor liar.",
    remediation: "Gunakan json_decode() untuk pertukaran data terstruktur.",
    extensions: [".php"],
    pattern: /\bunserialize\s*\(\s*\$_(GET|POST|REQUEST|COOKIE|\w+)\b/i
  },
  {
    id: "CODE-DESERIALIZE-JAVA",
    category: "INSECURE_DESERIALIZATION",
    severity: "CRITICAL",
    title: "Insecure Deserialization (Java ObjectInputStream)",
    description: "ObjectInputStream.readObject() tanpa filter kelas yang divalidasi rentan terhadap gadget chain RCE.",
    remediation: "Terapkan ValidatingObjectInputStream atau gantikan dengan JSON/Protobuf parser.",
    extensions: [".java", ".kt"],
    pattern: /\.readObject\s*\(\s*\)/i
  },
  {
    id: "CODE-PATH-TRAVERSAL",
    category: "PATH_TRAVERSAL",
    severity: "HIGH",
    title: "Path Traversal Risk (Unvalidated File Path Concatenation)",
    description: "File I/O mengakses jalur file yang digabungkan langsung dengan input eksternal tanpa normalisasi.",
    remediation: "Normalisasi path (os.path.abspath, path.resolve) dan pastikan hasilnya berada di dalam base directory aman.",
    extensions: [".py", ".js", ".ts", ".php", ".go"],
    pattern: /(open|readFile|readFileSync|createReadStream|file_get_contents)\s*\(\s*.*(\.\.\/|\.\.\\|\$_(GET|POST)|\+\s*(req\.|params\.|user_input))/i
  },
  {
    id: "CODE-MEM-BUFFER-OVERFLOW",
    category: "MEMORY_SAFETY",
    severity: "CRITICAL",
    title: "Memory Safety Risk (Unbounded Buffer Operation in C/C++)",
    description: "Fungsi string lawas (strcpy, strcat, gets, sprintf) tidak memeriksa batas kapasitas buffer memori.",
    remediation: "Ganti dengan varian yang aman batas: strncpy, strncat, snprintf, fgets.",
    extensions: [".c", ".cpp", ".cc", ".h", ".hpp"],
    pattern: /\b(strcpy|strcat|gets|sprintf)\s*\(/i
  },
  {
    id: "CODE-WEAK-HASH-CRYPTO",
    category: "WEAK_CRYPTO",
    severity: "MEDIUM",
    title: "Weak Cryptographic Hash Algorithm (MD5 / SHA-1)",
    description: "Penggunaan algoritma hash usang MD5 atau SHA1 yang rentan terhadap tabrakan hash (collision attacks).",
    remediation: "Gunakan SHA-256 / SHA-3 untuk hashing data integritas, atau Argon2id / bcrypt untuk password.",
    extensions: [".py", ".js", ".ts", ".go", ".java", ".php", ".c", ".cpp"],
    pattern: /(hashlib\.(md5|sha1)\s*\(|crypto\.createHash\s*\(\s*["'](md5|sha1)["']|md5\.New\(\)|sha1\.New\(\)|MessageDigest\.getInstance\s*\(\s*["'](MD5|SHA-1)["'])/i
  },
  {
    id: "CODE-INSECURE-RANDOM",
    category: "WEAK_CRYPTO",
    severity: "MEDIUM",
    title: "Insecure Pseudo-Random Number Generator for Security Context",
    description: "Math.random() atau random.random() bukan generator acak yang aman secara kriptografi.",
    remediation: "Gunakan modul crypto bawaan (crypto.randomBytes di Node, secrets di Python, crypto/rand di Go).",
    extensions: [".js", ".ts", ".py"],
    pattern: /(token|secret|auth|nonce|password|key)\s*[:=].*(Math\.random\s*\(\)|random\.random\s*\(\)|random\.choice\s*\()/i
  },
  {
    id: "CODE-XSS-OUTPUT",
    category: "STATIC_CODE",
    severity: "HIGH",
    title: "Cross-Site Scripting (XSS) via Unescaped Output / innerHTML",
    description: "Data eksternal dicetak langsung ke halaman atau disuntikkan ke innerHTML tanpa sanitasi.",
    remediation: "Lakukan escaping HTML yang tepat atau gunakan textContent.",
    extensions: [".php", ".js", ".ts", ".jsx", ".tsx"],
    pattern: /(echo\s+\$_(GET|POST|REQUEST)|dangerouslySetInnerHTML|\.innerHTML\s*=)/i
  },
  {
    id: "CODE-SECRET-HARDCODED",
    category: "HARDCODED_SECRET",
    severity: "HIGH",
    title: "Hardcoded Credential or API Secret Detected",
    description: "Kunci rahasia, token akses, atau password ditemukan tersimpan langsung di dalam berkas kode.",
    remediation: "Pindahkan kredensial ke file .env atau secret manager dan baca via environment variables.",
    extensions: [".php", ".js", ".ts", ".py", ".go", ".java", ".json", ".env", ".yaml", ".yml", ".sh"],
    pattern: /(AKIA[0-9A-Z]{16}|-----BEGIN (RSA|EC|OPENSSH|PGP) PRIVATE KEY-----|(api[_-]?key|secret_key|private[_-]?key|password|passwd|jwt_secret)\s*[:=]\s*["'][a-zA-Z0-9_\-\.\$\!\#]{8,}["'])/i
  }
];

const IGNORE_DIRS = new Set([
  "node_modules",
  ".git",
  "vendor",
  "storage",
  "dist",
  "build",
  "target",
  "bin",
  "obj",
  ".next",
  ".nuxt",
  "__pycache__",
  "venv",
  ".venv",
  ".cache",
  "coverage",
  ".cargo"
]);

const SCANNABLE_EXTS = new Set([
  ".py",
  ".go",
  ".rs",
  ".c",
  ".cpp",
  ".cc",
  ".h",
  ".hpp",
  ".java",
  ".kt",
  ".sh",
  ".bash",
  ".ps1",
  ".js",
  ".ts",
  ".jsx",
  ".tsx",
  ".mjs",
  ".cjs",
  ".php",
  ".json",
  ".yaml",
  ".yml"
]);

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

export interface ScanResult {
  issues: AuditIssue[];
  fileStatuses: FileAuditStatus[];
  totalFilesScanned: number;
  cleanFilesCount: number;
  vulnerableFilesCount: number;
}

export async function scanSourceDirectory(targetDir: string): Promise<ScanResult> {
  const issues: AuditIssue[] = [];
  const fileStatuses: FileAuditStatus[] = [];
  const files = await walkDirectory(targetDir);

  for (const filePath of files) {
    const ext = path.extname(filePath).toLowerCase();
    const applicableRules = RULES.filter((r) => r.extensions.includes(ext));
    const relativePath = path.relative(targetDir, filePath);
    let fileIssueCount = 0;

    if (applicableRules.length > 0) {
      try {
        const content = await fs.readFile(filePath, "utf-8");
        const lines = content.split(/\r?\n/);

        for (let i = 0; i < lines.length; i++) {
          const lineContent = lines[i];
          const lineNumber = i + 1;

          for (const rule of applicableRules) {
            if (rule.pattern.test(lineContent)) {
              fileIssueCount++;
              issues.push({
                id: rule.id,
                category: rule.category,
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

    fileStatuses.push({
      file: relativePath,
      status: fileIssueCount > 0 ? "VULNERABLE" : "CLEAN",
      issueCount: fileIssueCount
    });
  }

  const vulnerableFilesCount = fileStatuses.filter((f) => f.status === "VULNERABLE").length;
  const cleanFilesCount = fileStatuses.length - vulnerableFilesCount;

  return {
    issues,
    fileStatuses,
    totalFilesScanned: files.length,
    cleanFilesCount,
    vulnerableFilesCount
  };
}
