import { AuditIssue } from "../types.js";
import { Page } from "playwright";

interface StorageItem {
  key: string;
  valueSnippet: string;
  storageType: "localStorage" | "sessionStorage";
}

export async function auditClientStorage(page: Page): Promise<AuditIssue[]> {
  const issues: AuditIssue[] = [];

  const sensitiveKeywords = [
    "token",
    "jwt",
    "password",
    "secret",
    "api_key",
    "apikey",
    "auth",
    "bearer",
    "creditcard",
    "cc_num"
  ];

  const storageItems: StorageItem[] = await page.evaluate(() => {
    const results: StorageItem[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const val = localStorage.getItem(key) || "";
        results.push({
          key,
          valueSnippet: val.slice(0, 30),
          storageType: "localStorage"
        });
      }
    }

    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key) {
        const val = sessionStorage.getItem(key) || "";
        results.push({
          key,
          valueSnippet: val.slice(0, 30),
          storageType: "sessionStorage"
        });
      }
    }

    return results;
  });

  for (const item of storageItems) {
    const lowerKey = item.key.toLowerCase();
    const isSensitive = sensitiveKeywords.some((kw) => lowerKey.includes(kw));

    if (isSensitive) {
      issues.push({
        id: `STORAGE-SENSITIVE-${item.storageType.toUpperCase()}-${item.key}`,
        category: "STORAGE",
        severity: "HIGH",
        title: `Sensitive Data Stored in Browser ${item.storageType}`,
        description: `Kunci '${item.key}' berpotensi menyimpan kredensial atau token autentikasi di ${item.storageType} yang rentan dicuri script pihak ketiga jika terjadi XSS.`,
        remediation: `Gunakan httpOnly dan Secure cookies untuk menyimpan session token daripada ${item.storageType}.`,
        location: `${item.storageType}['${item.key}']`
      });
    }
  }

  return issues;
}
