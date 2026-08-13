# ERP Finance Management System

Full-stack starter ERP Finance Management System dengan frontend React TypeScript dan backend Go.

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
APP_ADDR=:8080
APP_SECRET=change-me-in-production
MYSQL_DSN=admin:HkQV5KXNt45JO7Iz@tcp(160.19.165.216:3306)/finacneerp?parseTime=true&multiStatements=true
UPLOAD_DIR=\\160.19.165.217\E-Finance\uploads
CORS_ORIGIN=http://localhost:5173
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

Login awal:

- Email: `admin@financeerp.local`
- Password: `Admin@12345`

Seeder juga membuat user login contoh untuk semua role dengan password yang sama:

- `finance.admin@financeerp.local`
- `accounting@financeerp.local`
- `ap@financeerp.local`
- `ar@financeerp.local`
- `cashier@financeerp.local`
- `treasury@financeerp.local`
- `budget.controller@financeerp.local`
- `tax@financeerp.local`
- `department.user@financeerp.local`
- `department.head@financeerp.local`
- `finance.manager@financeerp.local`
- `general.manager@financeerp.local`
- `director@financeerp.local`
- `auditor@financeerp.local`

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
