import { Command } from "commander";
import { runAudit, runCodeScanOnly } from "./runner.js";
import { formatPretty, formatJson } from "./formatter.js";
import { AuditConfig } from "./types.js";
import fs from "node:fs/promises";
import path from "node:path";
import pc from "picocolors";

const program = new Command();

program
  .name("tyw")
  .description("Test Your Website - Autonomous Web Quality, Resilience & Security CLI Auditor")
  .version("0.2.0");

program
  .command("audit")
  .description("Audit ketahanan web di browser (opsional gabungan dengan scan kode sumber)")
  .argument("<url>", "URL website target (contoh: http://localhost:3000)")
  .option("-c, --code <dir>", "Direktori kode sumber lokal untuk dipindai secara bersamaan (contoh: ./src)")
  .option("-p, --profile <profile>", "Profil audit: full, security, forms, runtime", "full")
  .option("-t, --timeout <ms>", "Batas waktu navigasi browser dalam milidetik", "30000")
  .option("--no-headless", "Jalankan browser dengan jendela terbuka di monitor")
  .option("-f, --format <format>", "Format output: pretty atau json", "pretty")
  .option("-o, --output <file>", "Simpan hasil audit ke file teks atau JSON")
  .action(async (url: string, options) => {
    let normalizedUrl = url;
    if (!normalizedUrl.startsWith("http://") && !normalizedUrl.startsWith("https://")) {
      normalizedUrl = `http://${normalizedUrl}`;
    }

    const config: AuditConfig = {
      url: normalizedUrl,
      timeoutMs: parseInt(options.timeout, 10) || 30000,
      headless: options.headless !== false,
      profile: (options.profile as AuditConfig["profile"]) || "full",
      format: (options.format as AuditConfig["format"]) || "pretty",
      outputFile: options.output,
      codeDir: options.code ? path.resolve(options.code) : undefined
    };

    if (config.format === "pretty") {
      console.log(
        pc.cyan(
          `Memulai audit target: ${config.url}` +
            (config.codeDir ? ` & Scan Kode: ${config.codeDir}` : "")
        )
      );
    }

    try {
      const report = await runAudit(config);
      const rendered = config.format === "json" ? formatJson(report) : formatPretty(report);

      console.log(rendered);

      if (config.outputFile) {
        await fs.writeFile(config.outputFile, rendered, "utf-8");
        if (config.format === "pretty") {
          console.log(pc.dim(`Laporan berhasil disimpan ke ${config.outputFile}`));
        }
      }

      if (report.status === "FAILED") {
        process.exitCode = 1;
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(pc.red(`Fatal Error saat menjalankan audit: ${message}`));
      process.exitCode = 2;
    }
  });

program
  .command("scan")
  .description("Pindai kerentanan pada baris kode sumber lokal (SAST) tanpa membuka browser")
  .argument("[dir]", "Direktori proyek lokal untuk dipindai", ".")
  .option("-f, --format <format>", "Format output: pretty atau json", "pretty")
  .option("-o, --output <file>", "Simpan hasil scan ke file", "")
  .action(async (dir: string, options) => {
    const targetDir = path.resolve(dir);
    const format = (options.format as "pretty" | "json") || "pretty";

    if (format === "pretty") {
      console.log(pc.cyan(`Memindai baris kode sumber di: ${targetDir}...`));
    }

    try {
      const report = await runCodeScanOnly(targetDir);
      const rendered = format === "json" ? formatJson(report) : formatPretty(report);

      console.log(rendered);

      if (options.output) {
        await fs.writeFile(options.output, rendered, "utf-8");
        if (format === "pretty") {
          console.log(pc.dim(`Laporan scan berhasil disimpan ke ${options.output}`));
        }
      }

      if (report.status === "FAILED") {
        process.exitCode = 1;
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(pc.red(`Fatal Error saat memindai kode: ${message}`));
      process.exitCode = 2;
    }
  });

program.parse();
