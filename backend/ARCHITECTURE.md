# Backend Architecture

Backend memakai Go dengan arsitektur modular:

- `cmd/api`: entrypoint HTTP server.
- `internal/config`: konfigurasi environment.
- `internal/database`: koneksi MySQL, bootstrap database, GORM setup, migration, seed.
- `internal/security`: token HMAC/JWT-style.
- `internal/app`: domain model, finance flow catalog, role permission catalog, service/business rules.
- `internal/httpapi`: Fiber REST router, auth middleware, request/response handling.

## Technology Decision

GORM dan Fiber bukan pilihan yang saling menggantikan:

- GORM dipakai sebagai ORM/database access layer.
- Fiber dipakai sebagai HTTP framework/router.
- Query SQL lama masih dipertahankan untuk beberapa read/reporting query yang kompleks, tetapi service sudah memegang `*gorm.DB` sebagai primary database handle.

Pola ini cocok untuk ERP karena CRUD dan relational mapping bisa ditulis rapi dengan ORM, sementara laporan finance yang kompleks tetap boleh memakai SQL eksplisit saat lebih jelas dan lebih performan.

## Service Layout

Service mulai dipisahkan berdasarkan domain:

- `service.go`: root service container dan dependency.
- `auth_service.go`: login, user lookup, account lock.
- `dashboard_service.go`: dashboard dan menu.
- `catalog.go`: static finance flow, permission, role catalog.
- `catalog_service.go`: finance flow, role access, permission, master data read.
- `budget_service.go`: budget validation.
- `transaction_service.go`: transaction request dan approval action.
- `operational_service.go`: AP, AR, cash bank, asset, tax operational transaction.
- `accounting_service.go`: automatic journal generation dan accounting run.
- `reconciliation_service.go`: reconciliation jobs.
- `closing_service.go`: period closing.
- `reporting_service.go`: report catalog dan management indicators.
- `audit_service.go`: audit trail dan login history.

## HTTP API Layout

HTTP layer dipisah agar route registration, middleware, dan handler domain tidak bercampur:

- `fiber_router.go`: app setup dan route registration.
- `middleware.go`: CORS, auth middleware, user helper, error handler.
- `health_handler.go`: health check.
- `auth_handler.go`: login, me, logout, password endpoints.
- `dashboard_handler.go`: dashboard endpoint.
- `catalog_handler.go`: finance flow, modules, roles, permissions, master data.
- `budget_handler.go`: budget validation.
- `transaction_handler.go`: transaction request dan approval endpoint.
- `operational_handler.go`: operational transaction endpoint.
- `accounting_handler.go`: accounting engine endpoint.
- `reconciliation_handler.go`: reconciliation endpoint.
- `closing_handler.go`: period closing endpoint.
- `document_handler.go`: upload document endpoint.
- `audit_handler.go`: audit trail endpoint.
- `reporting_handler.go`: report catalog dan management dashboard endpoint.

## Finance Flow Domain

Backend mengikuti flow pada gambar:

1. Master Data
2. Budget Management
3. Transaction Request
4. Approval Workflow
5. Operational Transaction
6. Accounting Engine
7. Reconciliation
8. Period Closing
9. Financial Reporting
10. Management Dashboard

Setiap tahap punya table/state sendiri agar workflow end-to-end tidak tercampur di satu table besar.

## Role dan Permission

Role utama:

- Super Admin
- Finance Admin
- Accounting
- Account Payable Officer
- Account Receivable Officer
- Cashier
- Treasury
- Budget Controller
- Tax Officer
- Department User
- Department Head
- Finance Manager
- General Manager
- Director
- Auditor

Permission disimpan dalam `permissions` dan `role_permissions`. Aksi kritikal dicek di service layer, misalnya:

- Submit transaction request
- Approval action
- Create operational transaction
- Generate journal
- Run reconciliation
- Close period

## API Contract

- `GET /api/finance-flow`
- `GET /api/roles`
- `GET /api/permissions/my`
- `GET /api/master-data?type=vendor`
- `POST /api/budgets/validate`
- `GET /api/transactions`
- `POST /api/transactions`
- `POST /api/approvals/{id}/action`
- `GET /api/operational-transactions?flow=purchase_to_pay_ap`
- `POST /api/operational-transactions`
- `GET /api/accounting/runs`
- `POST /api/accounting/generate-journal`
- `GET /api/reconciliations`
- `POST /api/reconciliations`
- `GET /api/closing-periods`
- `POST /api/closing-periods/close`
- `GET /api/reports/catalog`
- `GET /api/management-dashboard`

## Docker

Backend dibuild memakai multi-stage Dockerfile:

```powershell
docker compose build financeerp-api
docker compose up financeerp-api
```

Catatan: Docker runtime di compose memakai `/app/uploads` sebagai volume container. Kalau ingin langsung memakai Windows network share, mount share tersebut ke host/volume Docker terlebih dahulu lalu arahkan `UPLOAD_DIR`.
