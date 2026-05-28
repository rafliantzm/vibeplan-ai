# Deployment Guide VibePlan AI

Dokumen ini menjelaskan panduan deployment VibePlan AI untuk kebutuhan production atau demo online.

## 1. Gambaran Arsitektur Deployment

VibePlan AI dipisahkan menjadi dua bagian utama:

- **Frontend Next.js**
- **Backend Laravel REST API**

Database MongoDB dapat ditempatkan pada:

- MongoDB Atlas
- server MongoDB mandiri
- layanan managed MongoDB lainnya

## 2. Deployment Frontend ke Vercel

### Langkah Umum

1. Push code frontend ke repository Git.
2. Hubungkan repository ke [Vercel](https://vercel.com/).
3. Pilih folder project frontend jika repository monorepo.
4. Set root directory ke:

```text
frontend-next
```

5. Tambahkan environment variable:

```env
NEXT_PUBLIC_API_URL=https://your-backend-domain.com
```

6. Jalankan deployment.

### Build Command

Secara default:

```text
npm run build
```

### Output

Vercel akan menghasilkan URL frontend production.

## 3. Deployment Backend Laravel

Backend Laravel dapat ditempatkan pada hosting atau server yang mendukung:

- PHP 8.2+
- Composer
- ekstensi MongoDB/PHP
- web server seperti Nginx atau Apache

### Langkah Umum

1. Deploy folder `backend-laravel`
2. Install dependency:

```powershell
composer install --no-dev --optimize-autoloader
```

3. Salin `.env` production
4. Generate key jika belum ada:

```powershell
php artisan key:generate
```

5. Bersihkan dan cache konfigurasi:

```powershell
php artisan config:clear
php artisan route:clear
php artisan cache:clear
```

### Hosting Laravel-Compatible

Dokumen ini tidak mengunci satu penyedia hosting tertentu. Contoh:

- VPS Ubuntu + Nginx + PHP-FPM
- shared hosting yang mendukung Laravel dan MongoDB extension
- platform container seperti Docker/Cloud Run (opsional)

## 4. Catatan Deployment Database MongoDB

### MongoDB Atlas

Jika menggunakan MongoDB Atlas:

- buat cluster
- buat database `vibeplan_ai`
- buat user database terpisah
- whitelist IP server backend
- simpan URI MongoDB ke `.env` backend

Contoh:

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/vibeplan_ai
```

### Keamanan

- jangan gunakan akun admin cluster untuk aplikasi
- gunakan user database khusus aplikasi
- batasi IP yang boleh mengakses cluster

## 5. Environment Variable Production

### Backend

Contoh:

```env
APP_ENV=production
APP_DEBUG=false
APP_URL=https://your-backend-domain.com
FRONTEND_URL=https://your-frontend-domain.com

DB_CONNECTION=mongodb
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/vibeplan_ai

AI_PROVIDER=groq
AI_BASE_URL=https://api.groq.com/openai/v1
AI_MODEL=your-production-model
AI_API_KEY=YOUR_GROQ_API_KEY
AI_TIMEOUT=120
AI_PRD_MAX_TOKENS=2500
AI_NEXT_STEP_MAX_TOKENS=2200
AI_CODING_PROMPT_MAX_TOKENS=3500
AI_COMPACT_MAX_TOKENS=1200
```

### Frontend

```env
NEXT_PUBLIC_API_URL=https://your-backend-domain.com
```

## 6. CORS Setup

Pastikan backend hanya mengizinkan origin frontend yang digunakan.

Contoh domain yang perlu diizinkan:

- `http://localhost:3000`
- `https://your-frontend-domain.com`

### Catatan

- CORS terlalu longgar dapat meningkatkan risiko penyalahgunaan API.
- Hindari wildcard origin pada production kecuali benar-benar diperlukan.

## 7. Checklist Keamanan Deployment

- [ ] `.env` production tidak di-commit
- [ ] `APP_DEBUG=false`
- [ ] API key hanya di backend
- [ ] HTTPS aktif
- [ ] Token dan password sensitif tidak tampil di frontend
- [ ] Route admin diuji hanya untuk akun admin
- [ ] MongoDB user production dibatasi hak aksesnya

## 8. Post-Deployment Testing

Setelah deployment selesai, lakukan pengujian berikut:

### Frontend

- buka homepage
- register dan login
- buka halaman generate
- buka history
- buka profile

### Backend

- pastikan request API dari frontend berhasil
- pastikan CORS tidak memblokir request
- pastikan AI provider berjalan

### Fitur Inti

- generate PRD
- generate Next Step Planner
- generate Coding Prompt
- simpan history
- download Markdown
- chat support

### Admin

- login admin
- buka dashboard admin
- buka token requests
- buka live chat support
- buka AI settings

## 9. Rekomendasi Operasional

- siapkan backup database MongoDB
- monitor penggunaan token AI provider
- dokumentasikan model AI production yang dipakai
- pisahkan environment development dan production

