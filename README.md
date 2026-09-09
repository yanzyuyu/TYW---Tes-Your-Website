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

Jalankan langsung menggunakan `npx` atau install secara global:

```bash
# Eksekusi langsung tanpa instalasi global
npx tyw audit http://localhost:3000

# Atau install global
npm install -g tyw
```

Untuk instalasi dari repositori:

```bash
git clone https://github.com/yanzyuyu/TYW---Tes-Your-Website.git
cd TYW---Tes-Your-Website
npm install
npm run build
```

---

## Cara Penggunaan

### 1. Audit Penuh (Default)
Memeriksa security headers, runtime errors, forms, dan client storage sekaligus:

```bash
tyw audit http://localhost:3000
```

### 2. Output Format JSON (Untuk AI Agents)
Hasilkan output JSON bersih yang dapat langsung diparsing oleh AI Agent (seperti Antigravity, Cursor, atau Claude Code) untuk auto-remediasi:

```bash
tyw audit http://localhost:3000 --format json
```

### 3. Profil Spesifik
Jalankan pengujian pada area tertentu:

```bash
# Hanya audit keamanan (headers, cookies, storage)
tyw audit http://localhost:3000 --profile security

# Hanya audit form dan input boundaries
tyw audit http://localhost:3000 --profile forms

# Hanya audit console error, uncaught exception & hydration
tyw audit http://localhost:3000 --profile runtime
```

### 4. Simpan Laporan ke File

```bash
tyw audit http://localhost:3000 -o audit-report.json --format json
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

## Lisensi

MIT License - Hak cipta (c) 2026 yanzyuyu.
