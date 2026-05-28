# Panduan Instalasi VibePlan AI

Dokumen ini menjelaskan langkah instalasi VibePlan AI pada lingkungan pengembangan lokal menggunakan Windows PowerShell. Jika menggunakan sistem operasi lain, penyesuaian path dan command mungkin diperlukan.

## 1. Kebutuhan Sistem

Sebelum memulai, pastikan perangkat sudah memiliki:

- PHP 8.2 atau lebih baru
- Composer
- Node.js 18 atau lebih baru
- npm
- MongoDB lokal atau akses MongoDB server
- Git

Disarankan juga tersedia:

- Visual Studio Code
- MongoDB Compass
- Postman atau tools sejenis untuk pengujian API

## 2. Clone Repository

```powershell
Set-Location D:\
git clone https://github.com/your-username/vibeplan-ai.git
Set-Location D:\WEB\vibeplan-ai
```

Jika repository sudah ada, cukup masuk ke folder project:

```powershell
Set-Location D:\WEB\vibeplan-ai
```

## 3. Setup Backend Laravel

Masuk ke folder backend:

```powershell
Set-Location D:\WEB\vibeplan-ai\backend-laravel
```

Install dependency PHP:

```powershell
composer install
```

Buat file `.env` dari contoh:

```powershell
Copy-Item .env.example .env
```

Generate application key:

```powershell
php artisan key:generate
```

Bersihkan cache konfigurasi:

```powershell
php artisan config:clear
```

## 4. Setup Frontend Next.js

Masuk ke folder frontend:

```powershell
Set-Location D:\WEB\vibeplan-ai\frontend-next
```

Install dependency JavaScript:

```powershell
npm install
```

Buat file environment frontend jika belum ada:

```powershell
New-Item -Path .env.local -ItemType File -Force
```

## 5. Setup MongoDB

VibePlan AI menggunakan MongoDB sebagai database utama. Anda dapat menggunakan MongoDB lokal atau MongoDB server/cloud.

### Opsi A: MongoDB Lokal

Pastikan service MongoDB berjalan pada port default:

```text
127.0.0.1:27017
```

Buat database:

```text
vibeplan_ai
```

### Opsi B: MongoDB URI

Jika menggunakan MongoDB Atlas atau server terpisah, siapkan URI koneksi dan gunakan variabel:

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/vibeplan_ai
```

## 6. Konfigurasi `.env` Backend

Contoh konfigurasi dasar backend:

```env
APP_NAME="VibePlan AI"
APP_ENV=local
APP_DEBUG=true
APP_URL=http://127.0.0.1:8000
FRONTEND_URL=http://localhost:3000

DB_CONNECTION=mongodb
MONGODB_HOST=127.0.0.1
MONGODB_PORT=27017
MONGODB_DATABASE=vibeplan_ai
MONGODB_USERNAME=
MONGODB_PASSWORD=
MONGODB_AUTH_DATABASE=admin

AI_PROVIDER=groq
AI_BASE_URL=https://api.groq.com/openai/v1
AI_MODEL=your-model-name
AI_API_KEY=YOUR_GROQ_API_KEY
AI_TIMEOUT=120
AI_PRD_MAX_TOKENS=2500
AI_NEXT_STEP_MAX_TOKENS=2200
AI_CODING_PROMPT_MAX_TOKENS=3500
AI_COMPACT_MAX_TOKENS=1200
```

Jika menggunakan URI penuh:

```env
DB_CONNECTION=mongodb
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/vibeplan_ai
```

### Catatan Keamanan

- Jangan pernah menulis API key asli di README atau dokumentasi publik.
- Jangan meng-commit file `.env`.
- Gunakan placeholder seperti `YOUR_GROQ_API_KEY`.

## 7. Konfigurasi `.env` Frontend

Isi file `frontend-next/.env.local` dengan:

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

Catatan:

- `NEXT_PUBLIC_API_URL` mengarah ke backend Laravel.
- Variabel ini aman untuk frontend karena hanya berisi base URL backend, bukan API key.

## 8. Menjalankan Backend

Masuk ke folder backend:

```powershell
Set-Location D:\WEB\vibeplan-ai\backend-laravel
php artisan serve
```

Secara default backend berjalan di:

```text
http://127.0.0.1:8000
```

Jika ingin memakai host/port lain:

```powershell
php artisan serve --host=127.0.0.1 --port=8000
```

## 9. Menjalankan Frontend

Masuk ke folder frontend:

```powershell
Set-Location D:\WEB\vibeplan-ai\frontend-next
npm run dev
```

Secara default frontend berjalan di:

```text
http://localhost:3000
```

## 10. Verifikasi Awal

Setelah backend dan frontend berjalan:

1. Buka `http://localhost:3000`
2. Pastikan halaman utama tampil tanpa error
3. Lakukan registrasi akun baru
4. Login
5. Uji salah satu generator

## 11. Troubleshooting

### A. Backend tidak bisa connect ke MongoDB

Periksa:

- Service MongoDB aktif
- Host dan port benar
- Nama database benar
- Username dan password sesuai

### B. Frontend tidak bisa request ke backend

Periksa:

- `NEXT_PUBLIC_API_URL` benar
- Backend Laravel sedang berjalan
- CORS backend mengizinkan origin frontend

### C. Generate gagal karena AI provider

Periksa:

- `AI_API_KEY` valid
- `AI_BASE_URL` sesuai provider
- `AI_MODEL` tersedia untuk akun provider
- quota provider belum habis

### D. Build frontend gagal

Coba:

```powershell
Set-Location D:\WEB\vibeplan-ai\frontend-next
npm install
npm run lint
npm run build
```

### E. Cache konfigurasi backend masih lama

Jalankan:

```powershell
Set-Location D:\WEB\vibeplan-ai\backend-laravel
php artisan config:clear
php artisan cache:clear
```

## 12. Saran Workflow Pengembangan

Urutan kerja yang disarankan:

1. Jalankan MongoDB
2. Jalankan backend Laravel
3. Jalankan frontend Next.js
4. Uji register/login
5. Uji PRD Generator
6. Uji Next Step Planner
7. Uji Coding Prompt Generator
8. Uji history, profile, dan admin

