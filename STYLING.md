# FEAST Project Styling & UI/UX Guidelines (FE-EFMS)

Dokumen ini berisi standar styling dan panduan UI/UX (User Interface & User Experience) yang wajib diikuti dalam pengembangan proyek FEAST (FE-EFMS). Standar ini dibuat untuk menjamin konsistensi visual, pengalaman pengguna tingkat *enterprise*, dan kemudahan *maintainability* di seluruh modul.

## 1. Identitas Visual Enterprise (Universal Enterprise Visual Standard)

Proyek ini menggunakan tema desain **Enterprise Profesional yang Bersih dan Fungsional**, dengan referensi identitas visual resmi dari AAP Brand Ink.

### A. Palet Warna (Color Palette)
- **Tema Gelap (Header Modal / Elemen Utama)**: `bg-[#1A1612]` (Charcoal/Dark Ink) dengan warna teks putih.
- **Aksen Bronze (Brand Color)**: `text-[#A57C50]` dan border semi-transparan `border-amber-900/30`.
- **Tombol Aksi Utama (Primary Action)**: Menggunakan warna bronze enterprise `bg-[#A57C50] hover:bg-[#8e6941] text-white font-extrabold`.
- **Tombol Aksi Alternatif (Secondary / Charcoal)**: `bg-[#1A1612] text-white`.
- **Tombol Batal / Aksi Netral**: `bg-slate-100 hover:bg-slate-200 text-slate-700`.

### B. Bentuk dan Radius Sudut (Border Radius)
Hindari bentuk melengkung yang berlebihan agar tetap terlihat formal dan tegas.
- **Kontainer Modal / Card Utama**: `rounded-[4px]`.
- **Tombol, Input Field, dan Icon-Box**: `rounded-[3px]`.
- **DILARANG KERAS**: Menggunakan `rounded-2xl`, `rounded-full` (kecuali avatar/badge tertentu), border bulat/norak, atau gradien warna-warni seperti desain aplikasi non-formal.

### C. Desain "Zero-Fluff" (Bersih & Fokus)
- Antarmuka harus bebas dari polusi visual.
- **DILARANG** menambahkan ornamen dekoratif yang tidak berguna (seperti icon Sparkles `✨`).
- **DILARANG** menggunakan badge atau tombol dengan *preset* warna-warni mencolok yang merusak estetika enterprise.
- **DILARANG** meletakkan banner narasi atau paragraf penjelasan yang bertele-tele di dalam form.
- Modal dan form input harus *to-the-point*, rapi, fungsional, dan bersih.

## 2. Standar Interaksi & Feedback (Interactive State Standards)

Setiap aksi asinkron dan interaktif (seperti Hapus, Verifikasi, Approval, Akrual AR, Generate Invoice, Simpan/Update) wajib menangani *state* dengan benar untuk mencegah kebingungan pengguna dan error *race condition* / *double-click*.

### Aturan Wajib Komponen Interaktif:
1. **Loading Spinner**: Tambahkan inline spinner berputar pada tombol yang sedang diklik (contoh: gunakan icon `Loader2` dari `lucide-react` dengan atribut `animate-spin`).
2. **Disable State**: Selalu berikan atribut `disabled={isLoading}` pada tombol saat proses asinkron berlangsung agar pengguna tidak dapat menekan tombol berkali-kali.
3. **Notifikasi Instan**: Berikan notifikasi atau pesan toast saat aksi berhasil maupun gagal secara ringkas, *to-the-point*, dan tanpa menggunakan emoji berlebihan.
4. **Larangan "Silent Fails"**: Jangan menelan/mengabaikan error secara diam-diam (seperti `catch(() => {})`). Jika mutasi data gagal dari server, wajib tampilkan pesan error aslinya agar pengguna tahu apa yang salah.

## 3. Komponen & Helper Modular (Reusable SSOT Design Patterns)

Selalu manfaatkan fungsi utilitas (helper) terpusat untuk menjaga Single Source of Truth (SSOT). Dengan demikian, jika ada perubahan format/desain, hanya perlu mengubah satu file dan akan berlaku secara global di seluruh aplikasi.

### Helper & Pattern Wajib Pakai:
Gunakan fungsi-fungsi yang telah tersedia di `helpers.tsx` atau direktori utilitas ketika Anda membutuhkannya:
- **`renderBAStatusBadge(status)`**: Untuk merender badge status dokumen/BA dengan gaya dan warna seragam.
- **`formatIDR(amount)`**: Untuk memformat teks angka menjadi format mata uang Rupiah secara konsisten.
- Gunakan state terisolasi seperti **`deletingKey`** atau **`actionLoadingKey`** untuk mengatur state *loading* spesifik pada baris tabel tertentu, sehingga tidak mengunci seluruh halaman dengan loading global yang mengganggu.

## 4. Standar Kode Komponen (Modular Architecture)

Untuk menjamin performa IDE dan agar kode UI selalu mudah dirawat:
- **Max Line Limit**: Jaga panjang baris satu file komponen idealnya di angka **300 - 500 baris**. Batas absolut maksimal toleransi adalah **800 baris**.
- **Wajib Dekomposisi**: Jika ukuran file terlalu besar, pecah menjadi beberapa modul terpisah:
  1. **Sub-komponen UI / Modals / Sheets** (misal dalam folder `modals/`, `details/`, atau `components/`).
  2. **Custom Hooks / State Machines** untuk memisahkan logika UI dari layout (misal: `useInvoiceState.ts`, `useFormHandlers.ts`).
  3. **Pure Helper Functions** untuk memisahkan fungsi kalkulasi murni atau *exporter* (misal: `*Calculations.ts`, `*Exporters.ts`).
