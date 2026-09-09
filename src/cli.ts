import { Command } from "commander";
import { runAudit } from "./runner.js";
import { formatPretty, formatJson } from "./formatter.js";
import { AuditConfig } from "./types.js";
import fs from "node:fs/promises";
import pc from "picocolors";

const program = new Command();

program
  .name("tyw")
  .description("Test Your Website - Autonomous Web Quality, Resilience & Security CLI Auditor")
  .version("0.1.0");

program
  .command("audit")
  .description("Audit ketahanan, keamanan, form, dan error runtime pada URL target")
  .argument("<url>", "URL website lokal atau publik (contoh: http://localhost:3000)")
  .option("-p, --profile <profile>", "Profil audit: full, security, forms, runtime", "full")
  .option("-t, --timeout <ms>", "Batas waktu navigasi browser dalam milidetik", "30000")
  .option("--no-headless", "Jalankan browser dengan jendela terbuka (bukan headless)")
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
      outputFile: options.output
    };

    if (config.format === "pretty") {
      console.log(pc.cyan(`Memulai audit pada target: ${config.url} (Profile: ${config.profile})...`));
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

program.parse();
