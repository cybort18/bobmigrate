# Product Requirement Document (PRD)
## BobMigrate — Autonomous Legacy Monolith Decomposer & Microservice Synthesizer

---

## 1. Project Overview & Vision
* **Project Name:** BobMigrate
* **Hackathon:** Official IBM Bob 2.0 Hackathon (lablab.ai, September 25–27, 2026)
* **Document Version:** v1.0.0 (Master Technical Specification)
* **Vision Statement:** Menghadirkan platform orkestrasi otonom berbasis AI yang mentransformasi sistem monolitik warisan (*legacy monolith*) menjadi arsitektur mikroservis mandiri, teruji, dan siap dideploy menggunakan penalaran agen berlapis (*multi-step agentic reasoning*) dari **IBM Bob 2.0 Engine**.

---

## 2. Problem Statement & Enterprise Opportunity
1. **Bottleneck Dekomposisi Arsitektur Manual:**
   Modernisasi aplikasi monolitik enterprise memerlukan waktu berminggu-minggu hanya untuk mengaudit keterkaitan kode, memetakan batas domain (*domain boundaries*), dan memisahkan skema database yang saling mengikat.
2. **Risiko Regresi & Kehilangan Kontrak API:**
   Pemisahan kode secara manual rawan menimbulkan *cascading bugs*, inkonsistensi transaksi database, dan ketiadaan spesifikasi kontrak API yang baku.
3. **Keterbatasan AI Coding Assistant Biasa:**
   Alat bantu pengkodean konvensional hanya beroperasi pada tingkat *file-level autocomplete*, bukan merancang dan memfaktorisasi ulang dependensi kode antar-modul secara end-to-end.

---

## 3. Project Constraints & Compliance Guidelines
* **Optimasi Bobcoins (Critical):**
  Akun hackathon memiliki batas pengeluaran Enterprise sebesar **40 Bobcoins**. Sistem wajib menerapkan arsitektur **Context Pruning** (hanya mengekstrak metadata AST, rute, dan skema domain target untuk dikirim ke API IBM Bob, menghindari pengiriman seluruh basis kode secara masif sekaligus).
* **Keamanan Kredensial:**
  Kredensial API (`IBM_BOB_API_KEY`) dan endpoint inferensi (`IBM_BOB_BASE_URL`) diisolasi pada file `.env` di sisi server dan tidak boleh diekspos ke layer frontend/klien. File `.env`, `bobmigrate.json`, dan installer `.exe` wajib diabaikan melalui `.gitignore`.
* **Kepatuhan Data Hackathon:**
  Pengujian menggunakan repositori sampel mandiri berbasis open-source (`sample-monolith`) dan tidak melibatkan data rahasia/proprietary.
* **Kriteria Penyerahan Lablab.ai:**
  Repositori GitHub publik dengan `README.md` terstruktur, kode prototipe fungsional, dan video presentasi/demo berdurasi maksimal 3 menit (dengan minimal 90 detik rekaman layar demonstrasi live produk).

---

## 4. User Personas & User Flow

### 4.1 Persona
* **Target Pengguna:** Enterprise Cloud Architect, Lead Backend Engineer, & DevOps Transformation Specialist.
* **Tujuan Utama:** Mempercepat audit keterikatan modul (*coupling*) dan mengotomatiskan ekstraksi layanan mandiri tanpa menulis ulang boilerplate dari nol.

### 4.2 User Journey Flow
```
┌─────────────────────────┐
│ 1. Connect Monolith Repo│ (Pilih folder repositori monolitik lokal)
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ 2. Automated AST Audit  │ (Parser memetakan graf relasi modul & rute API)
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ 3. Select Domain Target │ (User memilih domain yang akan didekomposisi, misal: Orders)
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ 4. IBM Bob Agent Engine │ (Orkestrasi: Boundary Analysis -> OpenAPI -> Code -> Tests)
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ 5. Review & Export ZIP  │ (Lihat komparasi Before vs After & unduh mikroservis siap pakai)
└─────────────────────────┘
```

---

## 5. System Architecture & Folder Layout

```text
Hackathon IBM BOB 2.0/
├── .env                         # Konfigurasi rahasia & API Keys
├── .gitignore                   # Proteksi credential & binary files
├── PRD.md                       # Master reference document
├── sample-monolith/             # Repositori monolitik target simulasi
│   ├── package.json
│   ├── server.js                # Monolitik spaghetti (Auth, Catalog, Orders, Notifications)
│   └── database.sqlite
├── core-engine/                 # Backend Orchestrator & IBM Bob Adapter
│   ├── package.json
│   ├── src/
│   │   ├── parser/              # Modul AST & schema extractor
│   │   ├── client/              # IBM Bob Inference API Client
│   │   ├── pipeline/            # Alur kerja multi-step decomposition
│   │   └── server.js            # REST API Gateway (/api/scan, /api/decompose, /api/export)
│   └── generated-services/      # Direktori output hasil sintesis mikroservis
└── dashboard/                   # UI Interaktif (React / Vite + Tailwind CSS)
    ├── src/
    │   ├── components/          # Canvas graph, Terminal viewer, Diff viewer
    │   └── App.jsx
    └── index.html
```

---

## 6. Functional Specifications

### 6.1 Target Sandbox (`sample-monolith`)
Menyediakan basis kode Node.js/Express + SQLite realistis dengan 4 domain yang saling berkait erat (*tightly coupled*):
1. **Auth:** Autentikasi pengguna dan pembuatan JSON Web Token.
2. **Catalog:** Katalog barang dan stok inventaris.
3. **Orders:** Alur transaksi pesanan yang langsung memotong stok tabel Catalog di dalam blok query SQL yang sama.
4. **Notifications:** Pengiriman notifikasi email/webhook yang dipanggil langsung di dalam handler pesanan.

### 6.2 Autonomous Orchestrator (`core-engine`)
* **AST Code Parser:** Memindai file `server.js` untuk mengekstrak definisi tabel database, rute endpoint, dan referensi fungsi silang domain menjadi format JSON topologi.
* **IBM Bob Adapter Client:** Menjalankan pemanggilan HTTP POST ke `IBM_BOB_BASE_URL` dengan header otentikasi `Authorization: Apikey ${process.env.IBM_BOB_API_KEY}`.
* **Multi-Step Agentic Pipeline:**
  * **Step 1 (Boundary Reasoning):** Mengidentifikasi batas konteks domain terisolasi (*Bounded Context*) dan relasi dependensi eksternal.
  * **Step 2 (Contract Synthesis):** Menghasilkan spesifikasi formal OpenAPI 3.1 YAML untuk modul target.
  * **Step 3 (Code Decoupling):** Menghasilkan kode backend mandiri (Express/Fastify) dengan skema database SQLite terisolasi.
  * **Step 4 (Test & Container Generation):** Menghasilkan berkas `Dockerfile`, `docker-compose.yml`, dan unit test otomatis (Jest/Supertest).

### 6.3 Showcase Dashboard (`dashboard`)
* **Interactive Architecture Graph:** Visualisasi graf interaktif yang memperlihatkan node arsitektur monolitik dengan garis koneksi merah menandakan keterikatan ketat (*tight coupling*).
* **Live Agent Reasoning Stream:** Jendela konsol visual yang menampilkan proses berpikir agen IBM Bob secara real-time saat memproses setiap tahapan migrasi.
* **Before vs After Code Diff:** Tampilan komparasi berdampingan (*side-by-side view*) antara kode lama monolitik dengan mikroservis modern yang baru dihasilkan.
* **One-Click Export:** Fitur pengemasan dan pengunduhan mikroservis hasil dekomposisi ke dalam berkas ZIP.

---

## 7. API Specification (`core-engine`)

### `GET /api/scan`
* **Fungsi:** Memindai folder `sample-monolith` dan menghasilkan representasi graf topologi dependensi.
* **Contoh Output:**
  ```json
  {
    "monolithName": "E-Commerce Express Monolith",
    "domains": ["auth", "catalog", "orders", "notifications"],
    "dependencies": [
      { "source": "orders", "target": "catalog", "relation": "direct_table_mutation" },
      { "source": "orders", "target": "notifications", "relation": "synchronous_invocation" }
    ],
    "couplingScore": "High (Entangled)"
  }
  ```

### `POST /api/decompose`
* **Fungsi:** Memicu alur kerja dekomposisi otonom via IBM Bob untuk domain target.
* **Payload Request:**
  ```json
  {
    "targetDomain": "orders",
    "targetFramework": "express",
    "generateDocker": true,
    "generateTests": true
  }
  ```
* **Contoh Output:**
  ```json
  {
    "status": "success",
    "serviceName": "orders-microservice",
    "artifacts": {
      "openApiSpec": "openapi.yaml",
      "serverCode": "src/index.js",
      "testSuite": "tests/orders.test.js",
      "dockerfile": "Dockerfile"
    },
    "bobCoinsConsumedEstimate": "< 1 Bobcoin"
  }
  ```

### `GET /api/export`
* **Fungsi:** Mengunduh artefak mikroservis yang telah digenerasi dalam bentuk arsip ZIP.

---

## 8. Alignment with Judging Criteria

| Kriteria Juri | Bobot | Pembuktian pada Proyek BobMigrate |
|---|---|---|
| **Teknologi & Integrasi IBM Bob** | 30% | Pemanfaatan terprogram via API key resmi, penerapan multi-step reasoning agen (analisis batas, pembuatan kontrak OpenAPI, sintesis kode, dan pembuatan kontainer). |
| **Problem-Solution Fit & Dampak** | 25% | Mengatasi friksi modernisasi enterprise nyata; mengubah pekerjaan manual berminggu-minggu menjadi proses otomatis dalam hitungan menit. |
| **Kualitas Eksekusi & Prototipe** | 25% | Solusi *end-to-end* fungsional: dari sampel monolitik nyata, backend orkestrator aktif, hingga dashboard visual interaktif. |
| **Materi Submission & Presentasi** | 20% | Dokumentasi `README.md` berstandar industri dengan arsitektur diagram yang jelas, repositori bersih, dan video demo 3 menit yang tajam. |