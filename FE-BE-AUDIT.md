# Audit Frontend (FE-EFMS) vs Backend (BE-FEMS)

Tanggal audit: 21 Agustus 2026 (revisi 2 — item prioritas telah diimplementasikan)
Lingkup: seluruh pemanggilan API dari `FE-EFMS/src` dibandingkan dengan rute terdaftar di `BE-FEMS/internal/httpapi/fiber_router.go`.

## A. Dipanggil FE tetapi BELUM ADA / MISMATCH di BE

| # | Proses Frontend | Endpoint FE | Kondisi BE | Status |
|---|----------------|-------------|------------|--------|
| 1 | Generate Journal umum (`ModulePage`) | `POST /api/accounting/generate-journal` | **Sudah dibuat** — handler `generateJournalGeneric` + service `GenerateJournal` | ✅ Selesai |
| 2 | Download file BA (draft/final) | `GET /api/finance/files/:filename` | **Sudah dibuat** — route secured memakai `serveUploadedFile` | ✅ Selesai |
| 3 | Edit permission per role | `PUT /api/roles/:name/permissions` | **Sudah dibuat** — super admin only, audit trail, guard Super Admin terkunci | ✅ Selesai |
| 4 | Buat / hapus role | `POST /api/roles`, `DELETE /api/roles/:name` | **Sudah dibuat** — delete ditolak jika role masih dipakai user atau role Super Admin | ✅ Selesai |
| 5 | Ganti password self-service | `POST /api/auth/change-password` | **Sudah dibuat** — verifikasi password lama + bcrypt; form tersedia di Account Settings | ✅ Selesai |
| 6 | Lupa password | `POST /api/auth/forgot-password` + `POST /api/auth/reset-password` | **Sudah dibuat** — tabel `password_reset_tokens`, token SHA-256 hash berlaku 1 jam; token dikembalikan di respons karena mailer belum ada; dialog tersedia di LoginPage | ✅ Selesai |
| 7 | Reset password oleh admin | `POST /api/users/:id/reset-password` | **Sudah dibuat** — auto-generate password sementara bila kosong; tombol di RBACPage tab Users | ✅ Selesai |
| 8 | Workflow Budget Management (Annual/Monthly/Submission/Approval/Revision/Transfer) | Menu menunjuk `GET /api/reports/catalog` | BE hanya punya `POST /api/budgets/validate` + import CSV; belum ada CRUD/workflow budget | ⬜ Belum |
| 9 | Sub-proses Period Closing (Accrual & Adjustment, Depreciation Posting, Financial Review) | Menu menunjuk `GET /api/closing-periods` | BE hanya punya list + close period | ⬜ Belum |
| 10 | Notification Center (inbox, mark-as-read) | Memakai `GET /api/audit-logs` | Belum ada tabel/endpoint notification khusus | ⬜ Belum |
| 11 | Data karyawan di Account Settings (Department, Company, foto profil) | - | Belum ada endpoint employee profile / upload avatar | ⬜ Belum |
| 12 | Two-Factor Authentication (enable/disable/verify) | FE menampilkan `twoFactorEnabled` | Tidak ada endpoint 2FA di BE | ⬜ Belum |

## B. Ada di BE tetapi belum dipakai optimal oleh FE

| # | Proses | Endpoint BE | Catatan |
|---|--------|-------------|---------|
| 1 | Collaboration real-time SSE | `GET /api/accounting/collaboration/events`, `GET .../presence` | `useCollaboration.ts` membuat `eventSourceRef` tetapi tidak pernah membuka EventSource; sinkronisasi lintas user baru jalan antar-tab (BroadcastChannel) saja |
| 2 | Validasi budget saat submit transaksi | `POST /api/budgets/validate` | Belum terhubung ke form pengajuan transaksi |
| 3 | Katalog modul | `GET /api/modules` | Tidak dikonsumsi FE (menu masih hardcode di navigation.ts) |

## C. RBAC (sudah tersambung, khusus Super Admin)

- `GET /api/permissions/my` → dipakai AppShell untuk filter menu per permission.
- `GET /api/roles` → hanya di-fetch jika role user Super Admin (`isSuperAdminRole`, logika identik dengan `IsSuperAdminRole` di BE).
- Halaman **RBAC Management** dan **Role and Permission** keduanya merender `RBACPage` (tab: Manajemen User, Permission Matrix, Simulasi Hak Akses).
- Gate ganda: sidebar menyembunyikan menu untuk non-super-admin, `RBACPage` menolak render, dan setiap endpoint write RBAC divalidasi super admin di BE (`requireSuperAdmin`).
- CRUD User (`GET/POST /api/users`, `PUT/DELETE /api/users/:id`) diproteksi BE dengan permission `user_management:manage`.
- **Baru:** Create/Edit/Delete role + checkbox permission matrix per modul×aksi (mendukung grant `module:*`), reset password user dengan password sementara otomatis.

## D. Rekomendasi lanjutan untuk BE

1. CRUD + workflow Budget (draft→submit→approve→publish→lock→revision) dan posting Accrual/Depreciation pada period closing.
2. Tabel notification inbox + endpoint mark-as-read.
3. Endpoint employee profile & upload avatar untuk Account Settings.
4. Integrasi email service untuk forgot-password agar token tidak dikirim via respons API.
5. Endpoint enable/disable 2FA (TOTP).
