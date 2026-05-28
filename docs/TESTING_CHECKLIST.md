# Testing Checklist VibePlan AI

Dokumen ini digunakan sebagai checklist pengujian sebelum demo, submission akademik, atau deployment.

## 1. Perintah Testing Backend

```powershell
Set-Location D:\WEB\vibeplan-ai\backend-laravel
php artisan test
```

Pastikan:

- seluruh test backend lulus
- tidak ada error konfigurasi environment

## 2. Perintah Lint dan Build Frontend

```powershell
Set-Location D:\WEB\vibeplan-ai\frontend-next
npm run lint
npm run build
```

Pastikan:

- lint tidak menghasilkan error
- production build berhasil
- tidak ada hydration error yang diketahui

## 3. Checklist Pengujian AI Generation

### PRD Generator

- [ ] User dapat memilih mode PRD Generator
- [ ] User dapat mengisi form project
- [ ] Generate PRD berhasil
- [ ] Hasil PRD tersimpan ke history
- [ ] Markdown result dapat dibuka

### Next Step Planner

- [ ] User dapat memilih mode Next Step Planner
- [ ] User dapat memilih sumber input form
- [ ] User dapat memilih sumber input upload
- [ ] Upload file PRD `.md` atau `.txt` berjalan
- [ ] Generate roadmap berhasil
- [ ] Compact mode dapat dipilih jika diperlukan

### Coding Prompt Generator

- [ ] User dapat upload file Next Step Planner
- [ ] User dapat memilih coding agent
- [ ] Mode Normal berjalan
- [ ] Mode Ringkas berjalan
- [ ] Hasil prompt tersusun rapi dan relevan

## 4. Checklist History

- [ ] Halaman history dapat dibuka
- [ ] Daftar history tampil
- [ ] Detail history dapat dibuka
- [ ] Download Markdown berjalan
- [ ] Delete history berjalan
- [ ] Empty state history tampil dengan benar

## 5. Checklist Profile

- [ ] Halaman profile dapat dibuka
- [ ] Data user tampil benar
- [ ] Update nama dan email berhasil
- [ ] Update nama tampilan berhasil
- [ ] Upload avatar berhasil
- [ ] Update password berhasil
- [ ] Token balance tampil benar

## 6. Checklist Admin

### Dashboard Admin

- [ ] Dashboard admin dapat dibuka oleh admin
- [ ] Non-admin tidak dapat mengakses dashboard admin

### Token Requests

- [ ] Admin dapat melihat daftar request token
- [ ] Admin dapat approve request
- [ ] Admin dapat reject request
- [ ] Status badge tampil benar

### Live Chat Support

- [ ] Admin dapat melihat daftar percakapan
- [ ] Admin dapat membuka ruang chat
- [ ] Admin dapat membalas pesan
- [ ] Admin dapat menutup percakapan
- [ ] Admin dapat membuka kembali percakapan

### User Management

- [ ] Admin dapat melihat daftar user
- [ ] Admin dapat membuka detail user
- [ ] Admin dapat memperbarui data user
- [ ] Admin dapat memperbarui token user
- [ ] Admin dapat reset password user dengan aman

### AI Settings

- [ ] Admin dapat melihat provider AI aktif
- [ ] Admin dapat melihat model AI aktif
- [ ] API key termasking dengan benar
- [ ] Validasi API key berhasil jika key valid
- [ ] Error AI settings tampil dengan jelas jika key tidak valid

## 7. Checklist Live Chat

### Guest

- [ ] Guest dapat membuka tombol Bantuan
- [ ] Guest dapat memulai percakapan tanpa login
- [ ] Guest dapat melanjutkan chat setelah refresh

### User Login

- [ ] User login dapat langsung chat admin
- [ ] Riwayat percakapan tampil dalam bubble

### Admin

- [ ] Admin menerima update chat melalui polling
- [ ] Admin notification center tidak muncul untuk non-admin
- [ ] Toast notifikasi admin tidak spam berulang

## 8. Checklist Responsive UI

Uji minimal pada:

- 320px
- 360px
- 390px
- tablet
- desktop

Periksa:

- [ ] Tidak ada horizontal overflow
- [ ] Header tetap rapi
- [ ] Footer tetap rapi
- [ ] Generate page tetap nyaman dibaca
- [ ] History page tetap nyaman dibaca
- [ ] Profile page tetap nyaman dibaca
- [ ] Admin pages tetap dapat digunakan

## 9. Checklist Keamanan

- [ ] API key tidak ada di frontend
- [ ] `.env` tidak ikut ter-commit
- [ ] `password_hash` tidak pernah dikirim ke frontend
- [ ] Raw auth token hash tidak pernah ditampilkan
- [ ] Route admin tidak bisa diakses non-admin
- [ ] Error provider AI tidak membocorkan secret

## 10. Final Pre-Deployment Checklist

- [ ] Backend `.env` production terisi benar
- [ ] Frontend `.env` production terisi benar
- [ ] CORS sudah sesuai domain production
- [ ] Build frontend berhasil
- [ ] Test backend berhasil
- [ ] Fitur generate utama berhasil
- [ ] History dan download berjalan
- [ ] Role admin dan user telah diuji
- [ ] Video demo atau screenshot dokumentasi sudah disiapkan

## 11. Hasil Pengujian Aktual

Tanggal dan waktu pengujian:

```text
2026-05-28 09:37:32 +07:00
```

### Backend

#### 1. Clear Cache dan Optimisasi

- **Command**: `php artisan optimize:clear`
- **Status**: Passed
- **Catatan**: Cache bootstrap, config, routes, views, dan event berhasil dibersihkan.

- **Command**: `php artisan config:clear`
- **Status**: Passed
- **Catatan**: Cache konfigurasi backend berhasil dibersihkan.

- **Command**: `php artisan cache:clear`
- **Status**: Passed
- **Catatan**: Application cache berhasil dibersihkan.

#### 2. Route Check

- **Command**: `php artisan route:list`
- **Status**: Passed
- **Catatan**: Total route yang terdaftar sebanyak 50 route.

- **Command**: `php artisan route:list --path=api/auth`
- **Status**: Passed
- **Catatan**: Terdeteksi 6 route auth, termasuk register, login, me, logout, forgot-password, dan reset-password.

- **Command**: `php artisan route:list --path=api/generate`
- **Status**: Passed
- **Catatan**: Terdeteksi 3 route generate: PRD, Next Step, dan Coding Prompt.

- **Command**: `php artisan route:list --path=api/history`
- **Status**: Passed
- **Catatan**: Terdeteksi 3 route history: list, detail, dan delete.

- **Command**: `php artisan route:list --path=api/profile`
- **Status**: Passed
- **Catatan**: Terdeteksi 5 route profile: show, update, update name, update password, dan avatar upload.

- **Command**: `php artisan route:list --path=api/admin`
- **Status**: Passed
- **Catatan**: Terdeteksi 21 route admin, mencakup AI settings, support, token requests, dan user management.

- **Command**: `php artisan route:list --path=api/support`
- **Status**: Passed
- **Catatan**: Terdeteksi 4 route support publik/live chat.

#### 3. Backend Test Suite

- **Command**: `php artisan test`
- **Status**: Passed
- **Catatan**: 2 test berjalan dan seluruhnya lulus.

### Frontend

#### 1. Lint

- **Command**: `npm run lint`
- **Status**: Passed
- **Catatan**: ESLint selesai tanpa error.

#### 2. Production Build

- **Command**: `npm run build`
- **Status**: Passed
- **Catatan**: Next.js production build berhasil. Semua route utama ter-generate tanpa error build.

### Security Check

#### 1. `.env` Ignore Check

- **Command**: `git check-ignore backend-laravel/.env backend-laravel/.env.example frontend-next/.env.local frontend-next/.env`
- **Status**: Failed to verify directly
- **Catatan**: Folder kerja saat pengujian tidak memiliki metadata `.git`, sehingga `git check-ignore` tidak bisa dijalankan. Sebagai verifikasi pengganti, file `.gitignore` root berisi pattern:
  - `backend-laravel/.env`
  - `backend-laravel/.env.*`
  - `frontend-next/.env`
  - `frontend-next/.env.*`

#### 2. Pencarian API Key pada File Project

- **Command**: `rg -n --hidden --glob '!**/.env' --glob '!**/.env.*' --glob '!**/.next/**' --glob '!**/node_modules/**' --glob '!**/.git/**' "(sk-[A-Za-z0-9_-]{10,}|gsk_[A-Za-z0-9_-]{10,}|AIza[0-9A-Za-z\\-_]{20,}|ghp_[A-Za-z0-9]{20,}|AIzaSy|OPENAI_API_KEY=|GROQ_API_KEY=|AI_API_KEY=)" D:\WEB\vibeplan-ai`
- **Status**: Passed with notes
- **Catatan**: Tidak ditemukan real API key yang terlihat committed pada source utama. Temuan yang ada hanya:
  - placeholder dokumentasi seperti `YOUR_GROQ_API_KEY`
  - placeholder pada `docs/PRD_VibePlan_AI.md`
  - noise dari file tool/vendor yang bukan source aplikasi

#### 3. Pencarian Eksposur API Key dan `password_hash` di Frontend

- **Command**: `rg -n "password_hash|AI_API_KEY|OPENAI_API_KEY|GROQ_API_KEY" D:\WEB\vibeplan-ai\frontend-next --glob '!**/.next/**'`
- **Status**: Passed
- **Catatan**: Tidak ditemukan referensi `AI_API_KEY`, `OPENAI_API_KEY`, `GROQ_API_KEY`, maupun `password_hash` pada source frontend.
