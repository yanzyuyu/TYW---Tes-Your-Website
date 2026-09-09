# TYW (Test Your Website)

Autonomous Web Quality, Resilience & Security CLI Auditor untuk developer dan AI coding agents.

TYW memindai aplikasi web lokal maupun produksi menggunakan headless browser Playwright. Tool ini mengeksekusi audit mendalam pada security headers, siklus hidup cookie, error console/runtime, integritas input/form, dan storage browser tanpa konfigurasi rumit.

---

## Masalah yang Diselesaikan

Sebagian besar developer dan AI coding assistant hanya menguji *happy path* (apakah halaman web terbuka dan tombol bisa diklik). Akibatnya:
- Header keamanan esensial (CSP, HSTS, X-Frame-Options) sering terlewat.
- Form tidak memiliki batas karakter (`maxlength`), memicu crash di backend.
- Cookie otentikasi dibuat tanpa flag `HttpOnly` atau `SameSite` yang ketat.
- Runtime error dan SSR hydration mismatch tidak terdeteksi sebelum masuk produksi.

TYW menjalankan audit otomatis multi-lapis dan mengembalikan skor kesehatan serta rekomendasi perbaikan presisi dalam format visual terminal atau JSON terstruktur untuk dikonsumsi agen AI.

---

## Instalasi

Jalankan langsung menggunakan `npx` (tanpa install) atau install secara global via npm:

```bash
# Eksekusi langsung tanpa instalasi global via npx
npx tyw-cli audit http://localhost:3000

# Atau install global via npm (tersedia perintah: tyw dan tyw-cli)
npm install -g tyw-cli
```

Untuk instalasi manual dari repositori:

```bash
git clone https://github.com/yanzyuyu/TYW---Tes-Your-Website.git
cd TYW---Tes-Your-Website
npm install
npm run build
```

---

## Cara Penggunaan

> Catatan: Jika diinstall global (`npm i -g tyw-cli`), Anda bisa mengetik `tyw` atau `tyw-cli`. Jika via npx, gunakan `npx tyw-cli`.

### 1. Dual-Audit (Browser + Baris Kode Sumber Sekaligus)
Menguji aplikasi web di browser sekaligus memindai baris demi baris kode sumber lokal (PHP, JS, TS, Python) untuk menemukan kerentanan SQLi, XSS, dan secrets:

```bash
npx tyw-cli audit http://localhost:3000 --code ./src
```

### 2. Scan Kode Sumber Saja (SAST)
Memindai file kode lokal tanpa membuka browser, langsung menampilkan nomor baris yang rawan:

```bash
npx tyw-cli scan ./src
```

### 3. Audit Web Browser Saja (Default DAST)
Memeriksa security headers, runtime errors, forms, dan client storage pada web yang sedang berjalan:

```bash
npx tyw-cli audit http://localhost:3000
```

### 4. Output Format JSON (Untuk AI Agents)
Hasilkan output JSON bersih yang dapat langsung diparsing oleh AI Agent (seperti Antigravity, Cursor, atau Claude Code) untuk auto-remediasi:

```bash
npx tyw-cli audit http://localhost:3000 --code ./src --format json
```

### 5. Simpan Laporan ke File

```bash
npx tyw-cli audit http://localhost:3000 --code ./src -o audit-report.json --format json
```

---

## Contoh Output Terminal

```bash
$ tyw audit http://localhost:3000

=== TYW: Test Your Website - Autonomous Web Auditor ===
────────────────────────────────────────────────────────────────
Target URL:     http://localhost:3000
Page Title:     Demo Prototype App
Response:       200 (HTTP) in 1420ms
Overall Status:  FAILED (Score: 62/100) 
────────────────────────────────────────────────────────────────
Summary:
  Total Issues: 4 | Critical: 0 | High: 2 | Medium: 1 | Low: 1
────────────────────────────────────────────────────────────────
Detail Temuan & Saran Remediasi:

[HIGH] Content Security Policy (CSP) Header Missing [SEC-CSP-MISSING]
  Lokasi:      HTTP Response Headers
  Deskripsi:   Halaman web tidak mendefinisikan header Content-Security-Policy.
  Perbaikan:   Tambahkan header Content-Security-Policy pada web server.

[HIGH] Cookie 'session_id' Missing HttpOnly Flag [SEC-COOKIE-HTTPONLY-session_id]
  Lokasi:      Cookie: session_id
  Deskripsi:   Cookie dapat diakses langsung oleh JavaScript di client.
  Perbaikan:   Set flag 'HttpOnly' pada cookie 'session_id'.

[MEDIUM] Anti-Clickjacking Protection Missing [SEC-XFO-MISSING]
  Lokasi:      HTTP Response Headers
  Deskripsi:   Header X-Frame-Options atau CSP frame-ancestors tidak ditemukan.
  Perbaikan:   Konfigurasikan header 'X-Frame-Options: SAMEORIGIN'.

[LOW] Text Input Without Character Boundary [FORM-INPUT-UNBOUNDED]
  Lokasi:      form#checkout input[name='address']
  Deskripsi:   Input tidak memiliki batasan panjang karakter di sisi frontend.
  Perbaikan:   Tambahkan atribut 'maxlength' sesuai spesifikasi database.
────────────────────────────────────────────────────────────────
```

---

## Integrasi AI Agent & Slash Command

TYW dirancang agar dapat dikendalikan langsung oleh AI coding agents (Google Antigravity, Cursor, Claude Code, OpenCode, Aider).

### 1. Cara Otomatis (Via Skill)
Pasang spesifikasi skill agar agen AI mengenali tool ini:
- **Global AI Agent:** Salin folder `skills/tyw-audit` ke direktori global agent Anda (misal `~/.gemini/config/skills/tyw-audit/`).
- **Per Proyek (Workspace):** Salin folder `skills/tyw-audit` ke `.agents/skills/tyw-audit/` di root repository proyek Anda.

Dengan skill terpasang, agen AI akan otomatis menjalankan audit sebagai gerbang verifikasi sebelum menyatakan tugas selesai.

---

### 2. Cara Panggil Manual (Jika AI Belum Otomatis Menjalankan Audit)
Jika agen AI di chat belum otomatis menjalankan audit, Anda cukup mengetikkan pemicu langsung di kolom chat:

* **Menggunakan Slash Command / Mention Skill:**
  ```text
  /tyw-audit
  ```
  *(Atau: `@tyw-audit audit proyek ini`)*

* **Menggunakan Prompt Singkat:**
  > *"Tolong audit keamanan dan kualitas proyek ini pakai `npx --yes tyw-cli` lalu perbaiki jika ada temuan."*

* **Alur Perintah yang Akan Dijalankan AI:**
  1. **Audit cepat baris kode sumber (SAST):**
     ```bash
     npx --yes tyw-cli scan . --format json
     ```
  2. **Audit penuh (Web Browser live + Baris kode sumber):**
     ```bash
     npx --yes tyw-cli audit http://localhost:3000 --code . --format json
     ```
  3. AI membaca output JSON, menemukan file & nomor baris yang bermasalah, lalu memperbaiki kodenya secara mandiri hingga statusnya `PASSED`.

---

## Lisensi

MIT License - Hak cipta (c) 2026 yanzyuyu.
