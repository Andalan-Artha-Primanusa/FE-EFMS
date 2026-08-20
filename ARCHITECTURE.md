# Frontend Architecture

Frontend dibuat modular supaya fitur finance bisa ditambah tanpa menumpuk semua logic di satu file.

## Struktur

- `src/main.tsx`: entry point React saja.
- `src/App.tsx`: pengatur sesi login dan shell aplikasi.
- `src/layouts`: layout utama seperti navbar, sidebar, dan data fetching level aplikasi.
- `src/pages`: halaman fitur, misalnya dashboard, login, dan modul data.
- `src/components`: komponen reusable seperti table, modal, panel, chart kecil, dan upload CSV.
- `src/data`: konfigurasi menu, mapping endpoint API, dan fallback dashboard.
- `src/lib`: helper API, formatter angka, dan utilitas kecil.
- `src/styles`: Tailwind layer dan styling brand EFMS.

## Pola Menambah Modul

1. Tambahkan menu dan endpoint di `src/data/navigation.ts`.
2. Jika tampilan masih tabel + import, gunakan `ModulePage`.
3. Jika workflow khusus, buat page baru di `src/pages` lalu render dari `AppShell`.
4. Simpan komponen kecil di `src/components`, bukan di page.
5. Simpan call backend di `src/lib/api.ts`, bukan langsung di komponen.

## Integrasi Backend

Menu yang punya `endpoint` membaca data dari backend Fiber/GORM melalui `api<T>()`.
Menu yang punya `importType` otomatis menampilkan tombol download template dan import CSV.
