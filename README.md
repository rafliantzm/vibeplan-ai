# VibePlan AI

VibePlan AI adalah workspace berbasis AI yang membantu pemula coding menyusun dokumen perencanaan project secara lebih terarah, mulai dari Product Requirements Document (PRD), roadmap implementasi, hingga prompt coding yang siap dipakai pada coding agent.

## Latar Belakang Masalah

Banyak pemula coding langsung meminta AI menghasilkan kode tanpa perencanaan yang jelas. Akibatnya, struktur project menjadi tidak rapi, fitur mudah berubah di tengah jalan, alur pengembangan tidak terkontrol, dan hasil implementasi sulit dipelihara. Kondisi ini membuat penggunaan AI coding tool menjadi kurang efektif karena prompt yang diberikan terlalu umum dan tidak memiliki konteks yang cukup.

## Gambaran Solusi

VibePlan AI menyediakan tiga generator utama untuk mengubah ide mentah menjadi dokumen kerja yang lebih siap digunakan:

1. **PRD Generator** untuk menyusun kebutuhan project secara sistematis.
2. **Next Step Planner** untuk memecah hasil PRD menjadi langkah kerja implementasi.
3. **Coding Prompt Generator** untuk menghasilkan prompt coding yang lebih siap salin-tempel ke coding agent.

Selain itu, sistem juga menyediakan penyimpanan history, unduh hasil Markdown, manajemen profil, dashboard admin, token request, dan live chat support.

## Target Pengguna

- Mahasiswa yang sedang mengerjakan project kuliah.
- Pemula coding yang ingin mulai membuat aplikasi dengan alur yang terstruktur.
- Pengguna vibe coding yang membutuhkan panduan sebelum menggunakan AI coding tool.
- Tim kecil yang ingin membagi proses perencanaan dan implementasi secara rapi.

## Fitur Utama

### Fitur Pengguna

- Registrasi, login, dan logout.
- Generate dokumen AI:
  - PRD Generator
  - Next Step Planner
  - Coding Prompt Generator
- **Mode Ringkas** untuk membantu output lebih pendek dan aman dari pemotongan.
- Menyimpan seluruh hasil generate ke database.
- Melihat halaman history hasil generate.
- Membuka detail hasil generate.
- Mengunduh hasil dalam format Markdown `.md`.
- Mengelola profil pengguna, avatar, nama tampilan, dan password.
- Mengirim permintaan reset token ke admin.
- Live chat support untuk guest maupun user login.

### Fitur Admin

- Dashboard admin.
- Manajemen token request.
- Inbox live chat support.
- User management.
- AI settings dan validasi API key provider.

## Integrasi AI

VibePlan AI menggunakan provider yang kompatibel dengan gaya OpenAI API, seperti:

- **Groq**
- **OpenRouter**

Konfigurasi provider AI dilakukan di sisi backend Laravel melalui file `.env`, sehingga API key tidak pernah ditanamkan di frontend.

## Tech Stack

- **Frontend**: Next.js 16 + React 19
- **Styling**: Tailwind CSS
- **Backend**: Laravel 12 REST API
- **Database**: MongoDB
- **AI Provider**: Groq / OpenAI-compatible API
- **Output Format**: Markdown `.md`

## Struktur Folder

```text
vibeplan-ai/
|-- frontend-next/          # Aplikasi frontend Next.js
|-- backend-laravel/        # REST API Laravel
|-- docs/                   # Dokumentasi project
|-- README.md               # Ringkasan project
```

## Ringkasan Instalasi

1. Clone repository.
2. Siapkan backend Laravel dan MongoDB.
3. Siapkan frontend Next.js.
4. Isi file `.env` backend dan frontend dengan placeholder yang sesuai.
5. Jalankan backend dan frontend secara terpisah.

Panduan lengkap tersedia di [D:/WEB/vibeplan-ai/docs/INSTALLATION.md](D:/WEB/vibeplan-ai/docs/INSTALLATION.md).

## Menjalankan Backend

Masuk ke folder backend:

```powershell
Set-Location D:\WEB\vibeplan-ai\backend-laravel
composer install
Copy-Item .env.example .env
php artisan key:generate
php artisan config:clear
php artisan serve
```

Secara default backend akan berjalan di:

```text
http://127.0.0.1:8000
```

## Menjalankan Frontend

Masuk ke folder frontend:

```powershell
Set-Location D:\WEB\vibeplan-ai\frontend-next
npm install
npm run dev
```

Secara default frontend akan berjalan di:

```text
http://localhost:3000
```

## Variabel Lingkungan

### Backend Laravel (`backend-laravel/.env`)

Contoh variabel penting:

```env
APP_URL=http://127.0.0.1:8000
FRONTEND_URL=http://localhost:3000

DB_CONNECTION=mongodb
MONGODB_HOST=127.0.0.1
MONGODB_PORT=27017
MONGODB_DATABASE=vibeplan_ai

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

### Frontend Next.js (`frontend-next/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

## Perintah Testing dan Quality Check

### Backend

```powershell
Set-Location D:\WEB\vibeplan-ai\backend-laravel
php artisan test
```

### Frontend

```powershell
Set-Location D:\WEB\vibeplan-ai\frontend-next
npm run lint
npm run build
```

Checklist pengujian lengkap tersedia di [D:/WEB/vibeplan-ai/docs/TESTING_CHECKLIST.md](D:/WEB/vibeplan-ai/docs/TESTING_CHECKLIST.md).

## Dokumentasi Tambahan

- [D:/WEB/vibeplan-ai/docs/INSTALLATION.md](D:/WEB/vibeplan-ai/docs/INSTALLATION.md)
- [D:/WEB/vibeplan-ai/docs/USER_GUIDE.md](D:/WEB/vibeplan-ai/docs/USER_GUIDE.md)
- [D:/WEB/vibeplan-ai/docs/API_DOCUMENTATION.md](D:/WEB/vibeplan-ai/docs/API_DOCUMENTATION.md)
- [D:/WEB/vibeplan-ai/docs/TESTING_CHECKLIST.md](D:/WEB/vibeplan-ai/docs/TESTING_CHECKLIST.md)
- [D:/WEB/vibeplan-ai/docs/DEPLOYMENT_GUIDE.md](D:/WEB/vibeplan-ai/docs/DEPLOYMENT_GUIDE.md)
- [D:/WEB/vibeplan-ai/docs/DEMO_SCRIPT.md](D:/WEB/vibeplan-ai/docs/DEMO_SCRIPT.md)

## Bagian Screenshot

Tambahkan screenshot final project pada bagian ini sebelum submission atau demo akhir:

- Halaman login dan register
- Halaman generate
- Hasil PRD Generator
- Hasil Next Step Planner
- Hasil Coding Prompt Generator
- Halaman history
- Halaman profile
- Dashboard admin
- Live chat support

Contoh struktur folder screenshot yang disarankan:

```text
docs/screenshots/
|-- login-page.png
|-- generate-page.png
|-- history-page.png
|-- admin-dashboard.png
```

## Tim Developer

### 1. Raflian Taofiq Z.M

- **NIM**: 24.01.53.0008
- **Role**: Developer Team
- **Kontribusi**:
  - Membuat planner system
  - Merancang PRD
  - Membuat back-end
  - Setting API
  - Membuat front-end
  - Error fixing
  - Testing system
  - Deployment

### 2. Rafif Naraya

- **NIM**: 24.01.53.0009
- **Role**: Developer Team and Planner
- **Kontribusi**:
  - Database planner
  - Database management
  - Analysis testing
  - Paper document maker

## Catatan Keamanan

- Jangan menaruh API key di frontend.
- Jangan meng-commit file `.env`.
- Jangan menuliskan password asli pada dokumentasi atau video demo.
- Gunakan placeholder seperti `YOUR_GROQ_API_KEY`.
- Pastikan endpoint admin hanya dapat diakses akun dengan role admin.
- Gunakan HTTPS pada deployment production.

## Placeholder Link Deployment / Demo

Isi bagian ini secara manual setelah deployment atau publikasi demo selesai:

- **Frontend URL**: `https://your-frontend-url.example.com`
- **Backend URL**: `https://your-backend-url.example.com`
- **Video Demo**: `https://youtube.com/your-demo-link`
