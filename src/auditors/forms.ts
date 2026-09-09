import { AuditIssue } from "../types.js";
import { Page } from "playwright";

interface FormScanResult {
  selector: string;
  action: string;
  method: string;
  hasCsrf: boolean;
  inputs: {
    name: string;
    type: string;
    required: boolean;
    hasMaxLength: boolean;
    maxLength?: number;
  }[];
}

export async function auditFormsAndInputs(page: Page): Promise<AuditIssue[]> {
  const issues: AuditIssue[] = [];

  const formsData: FormScanResult[] = await page.evaluate(() => {
    const forms = Array.from(document.querySelectorAll("form"));
    return forms.map((form, index) => {
      const inputs = Array.from(form.querySelectorAll("input, textarea, select"));
      const action = form.getAttribute("action") || window.location.pathname;
      const method = (form.getAttribute("method") || "GET").toUpperCase();

      const hasCsrf = inputs.some((input) => {
        const name = (input.getAttribute("name") || "").toLowerCase();
        return name.includes("csrf") || name.includes("token") || name.includes("_token");
      });

      const parsedInputs = inputs.map((input) => {
        const type = input.getAttribute("type") || "text";
        const name = input.getAttribute("name") || "";
        const required = input.hasAttribute("required");
        const maxLengthAttr = input.getAttribute("maxlength");
        const hasMaxLength = maxLengthAttr !== null;
        const maxLength = maxLengthAttr ? parseInt(maxLengthAttr, 10) : undefined;

        return { name, type, required, hasMaxLength, maxLength };
      });

      return {
        selector: form.id ? `form#${form.id}` : `form:nth-of-type(${index + 1})`,
        action,
        method,
        hasCsrf,
        inputs: parsedInputs
      };
    });
  });

  for (const form of formsData) {
    if (form.method === "POST" && !form.hasCsrf) {
      issues.push({
        id: "FORM-CSRF-MISSING",
        category: "FORM_INTEGRITY",
        severity: "HIGH",
        title: "Missing Anti-CSRF Token in State-Changing Form",
        description: `Form ${form.selector} dengan method POST tidak menyertakan input CSRF token tersembunyi.`,
        remediation: "Sertakan CSRF token unik per sesi pada payload form atau gunakan header anti-CSRF pada request async.",
        location: form.selector
      });
    }

    for (const input of form.inputs) {
      if (input.type === "password") {
        if (!input.hasMaxLength) {
          issues.push({
            id: "FORM-PWD-NO-MAXLENGTH",
            category: "FORM_INTEGRITY",
            severity: "LOW",
            title: "Password Input Without Client-Side MaxLength",
            description: `Field password '${input.name}' tidak membatasi panjang input maksimum via atribut maxlength.`,
            remediation: "Tambahkan atribut 'maxlength' (misal: 128 atau 256) untuk mencegah serangan resource exhaustion hashing di server.",
            location: `${form.selector} input[name='${input.name}']`
          });
        }
      }

      if (["text", "search", "url"].includes(input.type) && !input.hasMaxLength) {
        issues.push({
          id: "FORM-INPUT-UNBOUNDED",
          category: "FORM_INTEGRITY",
          severity: "LOW",
          title: "Text Input Without Character Boundary (maxlength)",
          description: `Input '${input.name}' tidak memiliki batasan panjang karakter di sisi frontend.`,
          remediation: "Tambahkan atribut 'maxlength' sesuai spesifikasi kolom database.",
          location: `${form.selector} input[name='${input.name}']`
        });
      }
    }
  }

  const standalonePassword = await page.$$eval(
    "input[type='password']",
    (elements) => elements.some((el) => el.getAttribute("autocomplete") === "off")
  );

  if (standalonePassword) {
    issues.push({
      id: "FORM-PWD-AUTOCOMPLETE-OFF",
      category: "FORM_INTEGRITY",
      severity: "LOW",
      title: "Password Autocomplete Disabled",
      description: "Atribut 'autocomplete=off' pada password field mengganggu fungsi password manager pengguna.",
      remediation: "Gunakan 'autocomplete=current-password' atau 'autocomplete=new-password' alih-alih mematikannya.",
      location: "input[type='password']"
    });
  }

  return issues;
}
