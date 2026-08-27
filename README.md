# FEAST - Financial Enterprise Andalan System

Full-stack ERP Financial Enterprise Andalan System dengan frontend React TypeScript dan backend Go.

## Stack

- Frontend: React, TypeScript, Vite, Recharts, Lucide icons
- UI styling: Tailwind CSS + enterprise CSS components
- Backend: Go standard library HTTP API, MySQL, JWT-style HMAC token, bcrypt
- Backend router: Fiber
- ORM: GORM
- Database: MySQL dengan migrasi otomatis saat API start
- Upload: `UPLOAD_DIR=\\160.19.165.217\E-Finance\uploads`

## Konfigurasi Backend

Copy `backend/.env.example` ke environment runtime atau set variable berikut:

```env
APP_ADDR=:7070
APP_SECRET=replace-with-a-long-random-secret
MYSQL_DSN=user:password@tcp(mysql-host:3306)/database_name?parseTime=true&multiStatements=true
UPLOAD_DIR=/app/uploads
CORS_ORIGIN=http://160.19.165.216:2021
```

## Jalankan

Backend:

```powershell
cd backend
go mod tidy
go run ./cmd/api
```

Backend dengan Docker:

```powershell
docker compose up --build financeerp-api
```

Frontend:

```powershell
cd frontend
npm install
npm run dev
```

## Akun Pengguna & Hak Akses per Role (RBAC)

Semua akun contoh di bawah ini telah di-seed ke dalam sistem dengan password default yang sama:

> **Default Password:** `Admin@12345`

| No | Role | Nama Pengguna | Email Login | Hak Akses & Cakupan Operasional |
|:---:|:---|:---|:---|:---|
| 1 | **Super Admin** | ERP Super Admin | `admin@financeerp.local` | **Akses Penuh (Full Access)** ke seluruh menu, bypass approval & verifikasi, setting user |
| 2 | **Director** | Direktur Utama | `director@financeerp.local` | **Approval Tier 2 Invoice**, Management Dashboard, Financial Reporting, Close Period Lock |
| 3 | **General Manager** | General Manager | `general.manager@financeerp.local` | Multi-level Approval, Review Period Closing, Management Dashboard |
| 4 | **Finance Manager** | Finance Manager | `finance.manager@financeerp.local` | **Approve BA Tracker**, **Approval Tier 1 Invoice**, Budget Approval, Approve Jurnal |
| 5 | **SPV Verificator** | SPV Site Verificator | `spv@financeerp.local` | **Verifikasi BA Tracker**, **Verifikasi Invoice**, Verifikasi Pembayaran |
| 6 | **Admin Finance Site** | Admin Finance Site | `admin.site@financeerp.local` | Input & Edit BA Tracker Lapangan, Input Draft Invoice, Tracking HM/Volume |
| 7 | **Admin Finance HO** | Admin Finance HO | `admin.ho@financeerp.local` | Master Data, Invoice Management, Generate Jurnal, Rekonsiliasi Pusat |
| 8 | **Finance Admin** | Finance Admin | `finance.admin@financeerp.local` | Transaksi Keuangan, Budget, AP/AR, Rekonsiliasi, Audit Trail |
| 9 | **Accounting** | Accounting Officer | `accounting@financeerp.local` | Accounting Engine, Posting Jurnal ke General Ledger, Laporan Keuangan |
| 10 | **Account Payable Officer** | AP Officer | `ap@financeerp.local` | Purchase to Pay (AP), Tagihan Vendor, Rekonsiliasi Hutang |
| 11 | **Account Receivable Officer** | AR Officer | `ar@financeerp.local` | Order to Cash (AR), Master Penagihan Invoice, AR Aging & Follow-up |
| 12 | **Treasury** | Treasury Officer | `treasury@financeerp.local` | Cash & Bank Management, Rekonsiliasi Bank, Pencatatan Penerimaan Kas |
| 13 | **Cashier** | Cashier | `cashier@financeerp.local` | Transaksi Kasbon, Reimbursement, Pengeluaran Kas Harian |
| 14 | **Budget Controller** | Budget Controller | `budget.controller@financeerp.local` | Perencanaan & Kontrol Budget, Realtime Budget vs Actual, Publish Budget |
| 15 | **Tax Officer** | Tax Officer | `tax@financeerp.local` | Pengelolaan Pajak PPN/PPh, Rekonsiliasi Pajak, Laporan Pajak |
| 16 | **Department Head** | Department Head | `department.head@financeerp.local` | Approval Pengajuan Departemen, Monitoring Budget Departemen |
| 17 | **Department User** | Department User | `department.user@financeerp.local` | Pengajuan Transaksi (PR, Expense, Cash Advance, Reimburse) |
| 18 | **Auditor** | Auditor | `auditor@financeerp.local` | Read-only Audit Trail, Laporan Keuangan, Review Rekonsiliasi |

## Modul yang Sudah Disiapkan

- Authentication, login history, account lock, RBAC role seed
- Role-permission matrix sesuai flow ERP finance end-to-end
- Finance flow API: master data, budget, request, approval, operational transaction, accounting engine, reconciliation, closing, reporting, dashboard
- Dashboard finance role-ready dengan KPI, revenue/expense, cash flow, AP/AR aging
- Master data foundation: company, org unit, chart of accounts
- Budget foundation: annual/monthly budget, status, utilization/reservation
- Transaction Request: PR, expense, cash advance, reimbursement, payment request
- Approval workflow seed per transaksi
- Operational transaction foundation: purchase to pay, order to cash, cash bank, asset, tax
- Accounting engine foundation: automatic journal generation, journal approval/posting state
- Reconciliation, period closing, report catalog, dan management dashboard indicator
- Document upload ke network upload directory
- Audit trail untuk login, transaksi, approval, dan upload
- Financial summary endpoint

Ini adalah fondasi aplikasi ERP yang bisa diperluas per modul tanpa mengganti backend dari Go.

Detail arsitektur backend ada di `backend/ARCHITECTURE.md`.
