# ERP Finance Feature Audit

## Sudah Dibuat dan Bisa Dipakai

- Auth dan RBAC: login JWT, role, permission, audit login.
- Master Data: list, create, update, soft-delete, import CSV, template CSV, audit trail.
- Number Range: kode/nomor dibuat oleh system melalui `number_ranges`.
- Transaction Request: create, update, cancel, approval action, budget warning, approval steps.
- Operational Transaction: create dan list per flow.
- Accounting Engine: generate journal, accounting run, journal record.
- Reconciliation: run reconciliation job per type/period.
- Period Closing: close period dan lock period.
- Reporting: financial summary, report catalog, management dashboard.
- Document Upload: upload dokumen ke upload directory backend.
- Audit Trail: semua proses utama mencatat audit.

## Perubahan SAP-Like yang Sudah Dimigrasikan

- Tabel `number_ranges` untuk object numbering.
- Master data create tidak lagi mengandalkan input code dari user.
- Transaction request memakai nomor range `TRX`.
- Operational transaction dapat generate reference number dari flow.
- Accounting run memakai nomor range `ACR`.
- Journal memakai nomor range `JRN`.
- Import master data tidak lagi membutuhkan kolom `code`.

## Gap yang Masih Perlu Dilanjutkan Agar Lebih ERP Production

- Master data masih disimpan generik di `master_records` + `metadata`; untuk skala SAP-like penuh, perlu tabel khusus business partner, bank account, tax code, cost center, project, dan chart account.
- Budget Management belum punya CRUD dan workflow publish/lock lengkap, baru import/report/validate budget.
- Operational Transaction belum punya update/delete dan step transition detail per flow AP/AR/Cash/Asset/Tax.
- Accounting belum punya journal line items debit/credit detail.
- Approval belum multi-step sequential yang lengkap; saat ini status transaksi langsung berubah ketika action.
- Account settings data karyawan belum punya endpoint employee profile khusus.
- Notification masih berbasis audit log, belum ada inbox notification table.

## Rekomendasi Next Sprint

1. Pecah master data penting ke tabel domain khusus: COA, business partners, bank accounts, tax codes, cost centers, projects.
2. Tambah journal header dan journal lines agar posting GL benar.
3. Lengkapi budget CRUD: draft, submit, approve, publish, lock, revision.
4. Buat approval engine sequential: current step, next approver, delegation, revision note.
5. Buat user employee profile endpoint untuk account settings.
