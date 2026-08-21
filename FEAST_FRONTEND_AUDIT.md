# FEAST — Frontend Audit Report

**Tanggal:** 21 Agustus 2026
**Scope:** Seluruh repository `FE-EFMS` (React + TypeScript + Vite + React Router + Tailwind + custom CSS)
**Metode:** Scan penuh source (`src/`), pembacaan file arsitektur inti, grep inventaris modal/alert/duplikasi. Repository aktual adalah source of truth.

---

## Ringkasan Eksekutif

| Aspek | Status | Catatan |
|---|---|---|
| Arsitektur | ⚠️ | Feature-based parsial; masih ada "god module" (ModulePage generik untuk ±40 menu) |
| Routing | ❌ | Slug-based implisit, route duplikat, fake detail/create route, tanpa 404/403 |
| CRUD Flow | ❌ | Create/Edit finance via modal raksasa (FormModals 2.696 baris); RBAC via modal |
| API Layer | ⚠️ | `api.ts` monolitik (347 baris, 60+ fungsi), service layer kosong/salah tempat |
| RBAC | ⚠️ | Menu-level ada, route-level parsial, action-level tidak konsisten; map bolong |
| UI/UX | ⚠️ | Masih ada 11 gradient di CSS; toast tunggal tanpa severity; loading state tidak seragam |
| Bundle | ❌ | **6,53 MB** — disebabkan `excelDataBundle.ts` **820.174 baris** |

---

## A. Architecture Existing

### Struktur folder aktual
```
src/
├── App.tsx              # Router root + auth gate (localStorage)
├── main.tsx
├── components/          # 9 file kecil (ConfirmDialog, DataTable, MasterDataForm,
│                        #   MiniBars, NotificationPanel, PageHeader, Panel,
│                        #   RecordDialog, UploadBox)
├── data/
│   ├── navigation.ts    # menu[] + viewMap{} + menuPermissionMap{} + slug helpers
│   └── masterSchemas.ts # skema kolom master data untuk ModulePage
├── layouts/AppShell.tsx # Sidebar + Topbar + Outlet + fallback ModulePage
├── lib/
│   ├── api.ts           # fetch base + 60+ fungsi endpoint (monolitik)
│   ├── auth.ts          # canAccessMenu, isSuperAdminRole
│   ├── format.ts        # formatCell, humanize
│   ├── useCollaboration.ts  # hanya dipakai GeneralJournalPage
│   └── excelDataBundle.ts   # ⚠️ 820.174 BARIS — data Excel hardcoded
├── pages/
│   ├── finance/         # hasil split FinancePage (controller + views + modals)
│   ├── DashboardPage, LoginPage, AccountSettingsPage
│   ├── ModulePage       # tabel generik untuk ±40 menu
│   ├── GeneralJournalPage   # 1.358 baris — 6 domain akuntansi
│   ├── RBACPage             # 1.276 baris — users+roles+matrix+simulate
│   ├── MasterRaiseFallPage  # 842 baris — Raise&Fall + Currency (2 domain!)
│   ├── CoalIndexPage, VariableSOWPage(+Form), TransactionFormPage
│   └── FinanceXxxPage ×5    # wrapper tipis ke FinanceShell
├── router/
│   ├── routes.ts        # ❌ DEAD CODE — tidak pernah diimport
│   ├── ProtectedRoute.tsx
│   └── RouteWrappers.tsx
├── services/
│   ├── finance.service.ts   # 14 baris, duplikat api.ts, type any
│   └── journal.service.ts   # 7 baris, duplikat api.ts, type any
└── styles/app.css       # 1.255 baris custom CSS
```

### Routing architecture
- **Hybrid tidak konsisten**: ±25 route eksplisit di `App.tsx`, sisanya (±40 menu) ditangani pola slug-implisit: URL `/{slug-title}` → `titleFromSlug()` → `viewMap[title]` → `AppShell` fetch → render `ModulePage` generik.
- State global via `useOutletContext` (bukan Context/Redux): `user, permissions, roles, notice, setNotice, dashboard, transactions, query, refresh`.
- Auth gate: `localStorage.financeerp.user`; jika kosong SEMUA path me-render `LoginPage`.

### State management
- Tidak ada state library. Semua lokal `useState` + prop drilling + outlet context.
- `AppShell` mem-fetch **semua** data global saat mount apa pun halamannya: `/api/dashboard`, `/api/transactions`, `/api/audit-logs`, `/api/permissions/my` (+`/api/roles` utk superadmin).

### API architecture
- Satu helper `api<T>(path, options)` + token dari localStorage.
- Fungsi-fungsi endpoint flat di `api.ts` (users, roles, journals, COA, finance templates, dsb).
- `services/*.service.ts` ada tapi nyaris tidak dipakai & duplikatif.

### RBAC architecture
- Menu: `canAccessMenu(item, role, permissions)` menyembunyikan item sidebar.
- Route: `ProtectedRoute requiredView="..."` pada ±20 route eksplisit saja.
- Action: dicek manual tersebar (mis. permission `master_data` untuk template CRUD).
- **Bolong**: `Coal Index` dan `RAISE & FALL` tidak terdaftar di `menuPermissionMap`.

### Layout architecture
- `AppShell`: sidebar collapsible (details/summary), topbar (search global, notifikasi, user pill, logout), toast `notice` fixed top-center, `NotificationPanel`.

---

## B. Routing Problems

| # | Masalah | Lokasi | Detail |
|---|---|---|---|
| B1 | **Dead code** | `router/routes.ts` | File konstanta route 91 baris **tidak pernah diimport siapa pun**. Navigasi memakai string literal tersebar. |
| B2 | **Route duplikat** | `App.tsx:60-61` | `customer-master-credit-terms` DAN `customer-credit-terms` → sama-sama `FinanceCustomerRoute` tapi beda `viewTitle` ("Customer Master & Credit Terms" vs "Customer & Credit Terms") → dua identitas menu untuk satu halaman. |
| B3 | **Fake create/detail route** | `App.tsx:52-57` | `berita-acara/new`, `berita-acara/:id`, `invoice/new`, `invoice/:id` semuanya me-render **halaman list yang sama** dengan viewTitle "... Form". Bukan form/detail sungguhan; refresh/direct-access tidak menghasilkan UX create/detail. |
| B4 | **Tanpa 404** | `App.tsx` | Tidak ada catch-all NotFound. Slug tak dikenal jatuh ke `ModulePage` dengan config fallback "Finance Dashboard". |
| B5 | **Tanpa 403** | `ProtectedRoute.tsx` | Akses ditolak → redirect dashboard diam-diam, tidak ada halaman Permission Denied. |
| B6 | **Domain ganda satu route** | `App.tsx:44-45` | `raise-fall` dan `currency` dua menu berbeda → file yang sama `MasterRaiseFallPage` (tab `monthly` vs `mrate`). |
| B7 | **Hardcoded navigate** | tersebar | `navigate("/transaction/new")`, `` `${window.location.pathname}/${row.id}/edit` `` (ModulePage:99,129), dll. Tanpa konstanta route. |
| B8 | **Menu ↔ URL drift** | `navigation.ts` | Judul menu jadi URL (`RAISE & FALL` → `/raise-fall` lowercase). Rename judul = breaking URL. |
| B9 | **Login menelan semua route** | `App.tsx:18-26` | Belum login → semua path render LoginPage tanpa redirect-back setelah login. |
| B10 | **Nested route bermasalah** | `AppShell:168` | `{outlet ? null : ...}` — fallback render berbasis kondisi outlet membuat dua mekanisme render paralel (route eksplisit vs slug implisit). |

---

## C. CRUD Problems

| # | Masalah | Lokasi |
|---|---|---|
| C1 | **Create/Edit finance via modal raksasa** | `finance/FormModals.tsx` (2.696 baris) menangani BA, Invoice, Payment, Customer, Pending Volume sekaligus via `modalType`. |
| C2 | **Create/Edit user & role via modal** | `RBACPage.tsx` — `modalMode create/edit`, `selectedUser`, `roleModalMode`, `roleTarget`, `resetTarget` (reset password juga modal). |
| C3 | **Create/Edit master via modal/form-page campuran** | `ModulePage` navigate ke `:slug/new` (MasterDataFormRoute ✓ page), tapi Variable SOW punya form page sendiri, CoalIndex/RaiseFall pakai modal inline. Tiga pola berbeda untuk kasus sama. |
| C4 | **Delete tanpa confirmation** | `MasterRaiseFallPage.tsx:218` & `GeneralJournalPage.tsx:570` memakai `window.confirm` (bukan ConfirmDialog). |
| C5 | **List & detail bercampur** | Detail record = `RecordDialog` popup (ModulePage:180) atau `DetailModal` finance (1.038 baris). Tidak ada detail page. |
| C6 | **API POST/PUT tidak konsisten** | `saveFinanceTemplate` memakai POST utk create & PUT utk update dalam SATU fungsi (api.ts:257); `updateRolePermissions` PUT ke sub-resource permissions; transaksi DELETE = cancel soft-delete. Pola campur aduk. |
| C7 | **Action tidak jelas / menyesatkan** | `ModulePage.runProcess()`: tombol "Close Period" menjalankan `closePeriod(bulan-ini)` tanpa memilih periode; "Generate Journal" di level modul memakai `${config.title}-${Date.now()}` sebagai referensi. |
| C8 | **Edit bergantung state, bukan URL** | `onEditTransaction(row)` kirim objek lewat closure; beberapa edit memakai `window.location.pathname + id` (refresh-dependent). |

---

## D. Popup / Modal Inventory

### KEEP (confirmation kritis — sudah benar)
| Komponen | Lokasi | Keterangan |
|---|---|---|
| `ConfirmDialog` | components/ConfirmDialog.tsx | Dipakai ModulePage utk delete/approve/reject/cancel/generate/close ✓ |
| Delete confirm RBAC | RBACPage (`deleteTarget`, `deleteRoleTarget`) | Konsep benar, implementasi inline |
| Verify/Approve/Reject BA & Invoice | finance controller | Confirmation flow workflow ✓ |

### REMOVE / CONVERT TO PAGE
| Modal | Baris | Konversi |
|---|---|---|
| `FormModals.tsx` — BA form | ±1.100 | `/berita-acara/create`, `/berita-acara/:id/edit` |
| `FormModals.tsx` — Invoice form | ±850 | `/invoices/create`, `/invoices/:id/edit` |
| `FormModals.tsx` — Payment form | ±300 | `/payments/create`, `/payments/:id/edit` |
| `FormModals.tsx` — Customer form | ±250 | `/customers/create`, `/customers/:id/edit` |
| `FormModals.tsx` — Pending Volume | 253 (`PendingVolumeModal.tsx`) | Bagian dari BA/invoice workspace |
| `DetailModal.tsx` (1.038) | finance | `/berita-acara/:id`, `/invoices/:id` detail page |
| User create/edit modal | RBACPage | `/security/users/create`, `/:id/edit` |
| Role create/edit modal | RBACPage | `/security/roles/create`, `/:id/edit` |
| Reset-password modal | RBACPage | Aksi di detail user + confirm kecil |
| RecordDialog (detail JSON) | ModulePage | Detail page per entity |
| CoalIndex add/edit modal | CoalIndexPage | `/coal-index/create` dst. |
| RaiseFall rf/mrate modal | MasterRaiseFallPage | Page per entitas |

### CONVERT TO INLINE / TOAST
| Sekarang | Menjadi |
|---|---|
| `notice` string tunggal (AppShell) | Toast system dengan severity success/error/info |
| Feedback error RBAC inline (sudah) | Pertahankan, standarkan |
| Validasi form finance (alert-style notice) | Field error inline di bawah input |

---

## E. Large Files

| File | Baris | Masalah | Rencana pecah |
|---|---|---|---|
| `lib/excelDataBundle.ts` | **820.174** | Data Excel hardcoded; penyebab bundle 6,5 MB; hanya dipakai GeneralJournalPage | Pindah ke CSV/JSON asset lazy-loaded ATAU endpoint backend; hapus dari bundle |
| `pages/finance/FormModals.tsx` | 2.696 | 5 form domain dalam 1 file | Pecah per form + konversi ke page |
| `pages/finance/exporters.tsx` | 1.482 | 7 exporter PDF/Excel | OK sebagai modul export, rapikan per domain |
| `pages/GeneralJournalPage.tsx` | 1.358 | 6 domain akuntansi (Entry/Approval/Posting/GL/TB/Closing) via viewTitle+tab | Pecah per domain page |
| `pages/RBACPage.tsx` | 1.276 | Users + Roles + Matrix + Simulate | Pecah `/security/users`, `/security/roles`, matrix, simulate |
| `styles/app.css` | 1.255 | Monolitik, 11 gradient | Split per layer; hapus gradient |
| `pages/finance/useFinanceController.tsx` | 1.137 | 198 state/handler lintas domain | Ikut pecah saat form→page per domain |
| `pages/finance/DetailModal.tsx` | 1.038 | Detail 3 domain | Detail page per domain |
| `pages/finance/BATrackerView.tsx` | 869 | View BA | OK, pisahkan bila perlu |
| `pages/MasterRaiseFallPage.tsx` | 842 | 2 domain (Raise&Fall + Currency/M-Rate) | Pecah 2 page |

---

## F. Component Duplication

| Duplikasi | Bukti |
|---|---|
| **Status badge** | `helpers.renderBAStatusBadge`, `renderInvoiceStatusBadge`, badge inline di ModulePage/RBAC/CoalIndex — style beda-beda |
| **Filter bar** | ModulePage filter-row, BATrackerView filter sendiri, InvoiceView filter sendiri, topbar search global — 4 pola |
| **Form field + Rupiah input** | `RupiahInput` (helpers) vs input manual di CoalIndex/RaiseFall/RBAC |
| **Table** | `DataTable` hanya dipakai DashboardPage & ModulePage; finance views & GeneralJournal & RBAC bikin tabel sendiri |
| **Money formatter** | `money`/`compactMoney` (api.ts!), `formatIDR` (helpers), format inline lain |
| **Service layer dobel** | `FinanceService.getBATrackers` ≡ pemanggilan langsung `api("/api/finance/ba-trackers")` di controller; `JournalService` ≡ fungsi journal di api.ts |
| **PageHeader/Panel** | Sudah reusable ✓ tapi deskripsi ModulePage generik tidak informatif |

---

## G. API Mapping (UI → Endpoint)

### Pola endpoint per modul
```
Dashboard Executive      GET /api/management-dashboard
Dashboard Finance        GET /api/dashboard
Master Data (13 jenis)   GET/POST/PUT/DELETE /api/master-data[?type=...]  (+ bank-accounts, coal-index, variable-sow, raise-fall, daily-exchange-rates)
Customer                 GET/POST /api/finance/customers
BA Tracker               GET/POST/PUT /api/finance/ba-trackers  + /verify /approve /generate-invoice
Invoice                  GET/POST/PUT /api/finance/invoices     + /verify /approve-tier1 /approve-tier2
Payment                  GET/POST /api/finance/payments
Finance Templates        GET /api/finance/templates[/:key]  POST/PUT/DELETE
Transactions             GET/POST/PUT /api/transactions  DELETE=cancel  + /api/approvals/:id/action
Accounting Journals      GET/POST /api/accounting/journals + /verify /approve /post-batch
COA/Sub-ledger/GL/TB/PL/BS  GET/POST /api/accounting/*
Reconciliation           GET/POST /api/reconciliations
Closing Period           GET /api/closing-periods  POST /close
Reports                  GET /api/reports/* (catalog, financial-summary)
Governance               /api/users /api/roles /api/permissions/my /api/audit-logs
Import                   POST /api/imports/:type  GET /api/import/templates/:type
Documents                POST /api/documents
Auth                     /api/auth/login change-password forgot-password reset-password
```

### Endpoint dipakai banyak view (indikasi generic-table syndrome)
- `/api/reports/catalog` → 8 view (Annual/Monthly/Submission/Revision/Transfer budget, TB, BudgetVsActual, Tax, ProjectProfitability)
- `/api/closing-periods` → 5 view period closing
- `/api/reconciliations` → 5 view reconciliation
- `/api/accounting/runs` → 4 view accounting
- `/api/transactions` → 5 view transaction request + Approval Center

### Type safety
- `api.ts`: return type `any` pada seluruh fungsi accounting (getJournals…getBalanceSheet), templates payload `any`.
- `services/*.service.ts`: parameter & return `any` semua.

---

## H. Proposed Architecture (Target)

```
src/
├── app/
│   ├── router/index.tsx          # createBrowserRouter + lazy()
│   ├── router/routes.ts          # SATU sumber konstanta route (aktifkan ulang)
│   ├── router/guards.ts          # RequireAuth, RequirePermission(view+action)
│   └── providers/                # ToastProvider, QueryProvider(optional)
├── layouts/
│   ├── AppShell.tsx              # sidebar+topbar SAJA (tanpa fetch data modul)
│   └── PageLayout.tsx            # breadcrumb + PageHeader + content
├── components/ui/                # Button, Badge(STATUS_CONFIG), Input, Select,
│                                 #   FormSection/FormField/FormRow/FormActions,
│                                 #   DataTable(+Toolbar/Pagination/Empty/Skeleton),
│                                 #   ConfirmDialog, Toast, EmptyState, ErrorState
├── lib/                          # api client, format, auth-helpers (tanpa data raksasa)
├── modules/
│   ├── <domain>/                 # vendor, coal-index, variable-sow, raise-fall,
│   │   ├── pages/                #   ListPage, CreatePage, DetailPage, EditPage
│   │   ├── components/           #   XForm (dipakai create+edit), XTable
│   │   ├── services/x.service.ts
│   │   └── types/x.types.ts
│   ├── finance-ar/               # ba-tracker, invoices, payments, customers
│   ├── accounting/               # journal-entry, journal-approval, posting, gl, tb, closing
│   ├── security/                 # users, roles, audit
│   └── ...
└── styles/                       # tokens.css, base.css, components.css (tanpa gradient)
```

Prinsip:
1. **Satu entitas = satu folder modul** dengan List/Create/Detail/Edit.
2. **routes.ts aktif** — semua navigate lewat konstanta; URL stabil tidak tergantung judul menu.
3. **Create/Edit = page**; modal hanya confirmation irreversible.
4. **Error 3 lapis**: field inline → page error state (Coba Lagi) → toast global.
5. **RBAC 3 lapis**: menu hide + route guard + action guard (`can("vendor.create")`).
6. **AppShell tidak fetch data modul** — tiap page fetch data sendiri (refresh-safe).
7. **Bundle diet**: excelDataBundle keluar dari graph import.

---

## Implementasi Bertahap (Priority)

| Phase | Isi | Status |
|---|---|---|
| 1 | Audit (dokumen ini) | ✅ |
| 2 | Routing cleanup: hapus dead `routes.ts`→aktifkan, hapus route duplikat customer, tambah 404/403, hapus fake route | ✅ |
| 3 | Base components: Toast(severity), STATUS_CONFIG badge, ErrorState/EmptyState, form primitives | 🔜 |
| 4 | Modal→Page: RBAC users/roles, CoalIndex, RaiseFall, lalu finance forms | 🔜 |
| 5 | Pecah halaman besar: GeneralJournalPage(6), RBACPage(3), MasterRaiseFall(2) | 🔜 |
| 6 | Service layer per domain + typed API (hapus any) | 🔜 |
| 7 | RBAC alignment: tambah permission CoalIndex/RaiseFall, action guard | ✅ (menu-level; action-level menyusul) |
| 8 | UI/UX: hapus 11 gradient, standardisasi badge/tabel/format angka-tanggal | 🔜 |
| 9 | Build validation (`tsc -b && vite build` 0 error) | ✅ (berjalan; ulang tiap phase) |
| 10 | Regression test routing & CRUD | 🔜 |

### Bonus Phase 2 (sudah dikerjakan)
- **Bundle diet**: `excelDataBundle.ts` (11,4 MB source) tidak lagi di-import statis oleh `GeneralJournalPage` → dynamic import → bundle utama **6,53 MB → 1,58 MB (-76%)**, chunk Excel terpisah 5,4 MB on-demand.
- **window.confirm dihapus** dari `MasterRaiseFallPage` (delete Raise&Fall) dan `GeneralJournalPage` (reset jurnal) → `ConfirmDialog`.
- **Permission bolong ditambal**: `Coal Index`, `RAISE & FALL` masuk `menuPermissionMap`.

## Risiko & Breaking Change
- **URL slug berubah** bila routing dinormalisasi → butuh redirect legacy (`/raise-fall` tetap hidup).
- **excelDataBundle** dipakai sebagai dataset demo/seed GeneralJournal — penghapusan butuh verifikasi fitur kolaborasi/reset (L570) yang bergantung padanya.
- Backend adalah source of truth — tidak ada endpoint baru yang dikarang; pola POST/PUT campuran diikuti dulu, dirapikan belakangan.

## Recommended Backend Improvement
1. Endpoint filter/pagination server-side untuk list besar (master-data, transactions).
2. Konsistensi response envelope `{ data, error }` + field validation errors per-input.
3. Soft-delete status konsisten (`status: ACTIVE/INACTIVE`) untuk semua master.
