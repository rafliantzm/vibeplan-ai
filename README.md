# VibePlan AI

VibePlan AI adalah aplikasi web berbasis AI untuk membantu pengguna menyusun dokumen perencanaan software secara otomatis, terstruktur, dan siap dipakai sebagai fondasi implementasi. Aplikasi ini berfokus pada pembuatan **Product Requirement Document (PRD)**, **Next Step Planner**, dan **Coding Prompt** yang kemudian disimpan ke MongoDB, dapat dibuka kembali melalui history, dan dapat diunduh dalam format Markdown.

README ini diperbarui agar sinkron dengan kondisi project saat ini dan menjawab poin penilaian pada briefing UTS AI 2026: problem statement, fitur AI yang benar-benar dipakai, demo aplikasi web yang berjalan, keamanan API key, dokumentasi setup, dokumentasi penggunaan, dan kontribusi tim.

## 1. Project Overview

**Nama aplikasi:** VibePlan AI

**Deskripsi singkat:**  
VibePlan AI adalah workspace AI untuk membantu mahasiswa, developer pemula, dan tim kecil menyusun requirement software dengan lebih rapi sebelum masuk ke implementasi.

**Tujuan aplikasi:**  
Mengurangi kebingungan saat memulai project dengan menghasilkan dokumen perencanaan yang lebih jelas, konsisten, dan bisa langsung dipakai oleh developer atau coding agent.

**Nilai utama aplikasi:**
- Mempercepat penyusunan PRD dan dokumen turunan.
- Membantu user memahami alur, entitas data, dan proses API lebih awal.
- Menyimpan hasil generate agar bisa dibuka ulang, direvisi, dan diunduh.
- Menyediakan panel admin untuk pengelolaan AI provider, token, user, dan support chat.

**Target pengguna:**  
Mahasiswa, developer pemula, tim startup kecil, UI/UX designer, backend developer, dan tim project yang membutuhkan dokumen awal sebelum coding.

**Ringkasan fitur utama:**
- Login, register, login dengan Google, forgot password
- Generate PRD
- Generate Next Step Planner
- Generate Coding Prompt
- Result detail dan history
- Download Markdown
- Profile management
- Token request
- Admin dashboard
- AI settings
- Live chat / bantuan
- Responsive UI

## 2. Background / Latar Belakang

Banyak mahasiswa dan developer pemula ingin langsung membangun aplikasi menggunakan AI, tetapi sering melewati tahap perencanaan. Akibatnya requirement tidak jelas, user flow belum matang, struktur database belum dipikirkan, API belum terdefinisi, dan hasil coding menjadi tidak konsisten.

Masalah ini makin terasa saat AI coding tools digunakan tanpa konteks yang cukup. Prompt yang terlalu umum membuat hasil kode sulit dipelihara, arsitektur berantakan, dan dokumentasi tidak sinkron dengan implementasi.

VibePlan AI dibuat untuk mengisi celah tersebut. Aplikasi ini membantu user mengubah ide mentah menjadi dokumen kerja yang lebih siap dipakai, mulai dari PRD sampai roadmap implementasi dan coding prompt.

## 3. Problem Statement

Masalah utama yang ingin diselesaikan oleh VibePlan AI adalah:

- Mahasiswa dan developer pemula sering tidak memiliki dokumen requirement yang jelas sebelum coding.
- Struktur data, ERD, API, dan alur user sering tidak terdokumentasi dengan baik.
- Penggunaan AI coding tools menjadi kurang efektif karena input yang diberikan terlalu umum.
- Tim kecil kesulitan menjaga sinkronisasi antara ide produk, desain backend, dan langkah implementasi.

Dampaknya adalah project mudah berubah arah, sulit dikembangkan, dan kualitas output AI menurun karena tidak ada konteks yang cukup kuat. Solusi ini penting karena AI seharusnya membantu mempercepat proses, bukan menambah kebingungan.

## 4. Proposed Solution

VibePlan AI menyelesaikan masalah tersebut dengan menyediakan workflow AI berbasis web yang mencakup:

- Generate **PRD** secara otomatis dari brief project
- Generate **User Journey**, **Data Model & ERD**, **Data Dictionary**, dan **API Design** sebagai bagian dari PRD
- Generate **Next Step Planner** untuk menerjemahkan PRD menjadi langkah implementasi
- Generate **Coding Prompt** yang siap dipakai pada coding agent
- Menyimpan seluruh hasil generate ke **MongoDB Atlas**
- Menampilkan hasil pada halaman detail yang bisa dibaca ulang
- Mengunduh hasil dalam format **Markdown**
- Menyediakan **Admin AI Settings** untuk validasi dan penggantian provider/model AI
- Menyediakan **Live Chat / Bantuan** untuk user dan guest

## 5. Target Users

| Target User | Needs | Benefit |
| --- | --- | --- |
| Mahasiswa | Menyusun project kuliah dengan lebih rapi | Mendapat PRD, flow, ERD, dan roadmap lebih cepat |
| Developer pemula | Butuh arahan sebelum mulai coding | Prompt dan dokumen awal menjadi lebih terstruktur |
| Tim startup kecil | Menyatukan product, backend, dan AI workflow | Requirement lebih sinkron sebelum development |
| UI/UX designer | Memahami konteks fitur dan user journey | Dapat melihat alur dan struktur sistem lebih jelas |
| Backend developer | Butuh gambaran database dan API lebih awal | Data dictionary dan API design lebih siap dijadikan acuan |
| Project team | Butuh artefak yang bisa disimpan dan dibagikan | History dan Markdown download memudahkan kolaborasi |

## 6. Main Features

Berikut fitur yang benar-benar tersedia berdasarkan codebase dan route aplikasi saat ini.

### Authentication
- Register user
- Login user
- Login dengan Google
- Logout
- Forgot password
- Reset password

### Authentication Flow
- Login email/password dengan token custom backend (`auth_tokens`)
- Login Google OAuth dengan callback ke backend Laravel
- Penyimpanan token di frontend melalui auth helper yang sama dengan login lama
- Protected route tetap memakai header `Authorization: Bearer <token>`

### AI Document Generation
- **PRD Generator**
- **Next Step Planner**
- **Coding Prompt Generator**
- **Mode Ringkas** untuk output yang lebih stabil jika dokumen terlalu panjang

### Enterprise PRD Output
- Executive/overview section
- User journey
- Data model & ERD
- Data dictionary
- API design
- Validation & business rules
- UI pages / screens
- Milestones & timeline
- Risks & mitigations

### Result & History
- Halaman result detail
- History list
- History detail
- Delete history
- Download Markdown

### User Features
- Profile page
- Update nama dan email
- Update display name
- Upload avatar
- Update password
- Token balance display
- Token reset request

### Admin Features
- Admin dashboard
- Token request management
- User management
- Update/reset token user
- Reset password user
- AI settings & diagnostics
- Available AI model listing
- Live chat support inbox
- Delete support conversation / delete individual support message

### Support / Bantuan
- Guest support conversation
- Logged-in user support conversation
- Admin reply and conversation management

### Responsive Design
- Desktop, tablet, dan mobile layout tersedia
- Screenshot mobile untuk generate page tersedia

## 7. AI Integration

VibePlan AI mendukung beberapa provider AI yang dikonfigurasi dari backend Laravel melalui environment variable atau admin AI settings.

Provider yang saat ini didukung dari konfigurasi backend:
- OpenRouter
- Groq
- OpenAI-compatible provider
- Gemini
- Mock/demo fallback untuk pengembangan lokal

Alur kerja AI:
1. User mengisi brief project dari frontend Next.js.
2. Frontend mengirim request generate ke backend Laravel.
3. Backend memvalidasi input dan menyusun prompt sesuai generation type.
4. Backend meneruskan prompt ke AI provider aktif.
5. AI mengembalikan hasil dokumen dalam format markdown.
6. Backend menyimpan hasil generate ke MongoDB Atlas.
7. Frontend menampilkan result dan menyediakannya untuk history serta download.

```mermaid
sequenceDiagram
    actor User
    participant Frontend as "Next.js Frontend"
    participant Backend as "Laravel API"
    participant AI as "AI Provider"
    participant DB as "MongoDB Atlas"

    User->>Frontend: Input ide project
    Frontend->>Backend: Send generate request
    Backend->>AI: Send prompt
    AI-->>Backend: Return PRD content
    Backend->>DB: Save generation result
    Backend-->>Frontend: Return result
    Frontend-->>User: Display PRD
```

## 8. Technology Stack

| Layer | Technology | Purpose |
| --- | --- | --- |
| Frontend | Next.js 16, React 19 | UI aplikasi web |
| Styling | Tailwind CSS 4, CSS custom | Styling dan responsive layout |
| Markdown Rendering | react-markdown, remark-gfm, Mermaid | Menampilkan dokumen AI, ERD, dan diagram |
| Backend | Laravel 12 | REST API |
| Database | MongoDB Atlas | Menyimpan user, history, settings, support chat |
| AI Provider | OpenRouter / Groq / Gemini / OpenAI-compatible | Generate PRD, Next Step, Coding Prompt |
| Auth | Token-based auth di backend | Autentikasi user dan admin |
| Tools | Git, GitHub, VS Code, Postman | Development dan testing |

## 9. System Architecture

```mermaid
flowchart LR
    User["User"] --> Frontend["Next.js Frontend"]
    Frontend --> Backend["Laravel Backend API"]
    Backend --> MongoDB[("MongoDB Atlas")]
    Backend --> AIProvider["AI Provider"]
    Backend --> Admin["Admin Module"]
```

Penjelasan komponen:
- **Next.js Frontend**: menangani UI, form generate, history, profile, admin pages, dan live chat widget.
- **Laravel Backend API**: menangani auth, generate logic, history, profile, admin tools, dan health checks.
- **MongoDB Atlas**: menyimpan hasil generate, user, token request, team members, AI settings, dan support conversations.
- **AI Provider**: provider generatif yang aktif melalui `.env` atau AI settings admin.
- **Admin Module**: area pengelolaan token request, AI settings, user management, dan support conversations.

## 10. Folder Structure

```txt
vibeplan-ai/
|-- backend-laravel/
|-- docs/
|-- frontend-next/
|-- public/
|-- screenshot/
|-- prd-final-vibeplan-ai.md
|-- README.md
`-- AGENTS.md
```

Struktur folder frontend App Router yang relevan:

```txt
frontend-next/app/
|-- page.js
|-- about-team/page.js
|-- admin/page.js
|-- admin/ai-settings/page.js
|-- admin/support-conversations/page.js
|-- admin/token-requests/page.js
|-- admin/users/page.js
|-- forgot-password/page.js
|-- generate/page.js
|-- history/page.js
|-- history/[id]/page.js
|-- login/page.js
|-- pricing/page.js
|-- profile/page.js
|-- register/page.js
|-- reset-password/page.js
`-- result/[id]/page.js
```

## 11. Installation Guide

### Prerequisites

- Node.js 18+ atau versi modern yang kompatibel
- npm
- PHP 8.2+
- Composer
- MongoDB Atlas account atau MongoDB lokal
- AI Provider API key
- Git

### Backend Setup

```bash
cd backend-laravel
composer install
cp .env.example .env
php artisan key:generate
php artisan optimize:clear
php artisan config:clear
php artisan route:clear
php artisan serve --host=127.0.0.1 --port=8000
```

### Frontend Setup

```bash
cd frontend-next
npm install
cp .env.local.example .env.local
npm run dev
```

Detail tambahan tersedia di [docs/INSTALLATION.md](docs/INSTALLATION.md).

## 12. Environment Configuration

### Backend `.env`

Contoh variabel penting:

```env
APP_URL=http://127.0.0.1:8000
FRONTEND_URL=http://localhost:3000

DB_CONNECTION=mongodb
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/vibeplan_ai?retryWrites=true&w=majority&appName=Cluster0
MONGODB_DATABASE=vibeplan_ai

AI_PROVIDER=your_provider
AI_MODEL=your_model
AI_BASE_URL=https://your-provider.example.com

OPENROUTER_API_KEY=your_api_key
GROQ_API_KEY=your_api_key
OPENAI_API_KEY=your_api_key
GEMINI_API_KEY=your_api_key

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://127.0.0.1:8000/api/auth/google/callback
```

### Frontend `.env.local`

```env
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
NEXT_PUBLIC_GENERATE_TIMEOUT_MS=300000
```

Catatan keamanan:
- Jangan commit `.env`.
- Gunakan `.env.example` sebagai template.
- API key wajib disimpan di backend environment variable.
- MongoDB Atlas memerlukan Network Access / IP whitelist yang benar.

### Google Login Setup

1. Buka [Google Cloud Console](https://console.cloud.google.com/).
2. Masuk ke `Google Auth Platform` atau `APIs & Services > Credentials`.
3. Buat `OAuth Client ID` bertipe `Web application`.
4. Tambahkan `Authorized redirect URI` lokal:

```txt
http://127.0.0.1:8000/api/auth/google/callback
```

5. Isi `GOOGLE_CLIENT_ID` dan `GOOGLE_CLIENT_SECRET` di `backend-laravel/.env`.
6. Pastikan `FRONTEND_URL=http://localhost:3000`.
7. Setelah mengubah `.env`, jalankan ulang backend Laravel.

## 13. Database Setup

VibePlan AI menggunakan MongoDB Atlas sebagai penyimpanan utama.

Langkah setup:
1. Buat cluster MongoDB Atlas.
2. Buat database user khusus aplikasi.
3. Tambahkan IP device/server pada `Network Access`.
4. Copy connection string Atlas.
5. Isi `MONGODB_URI` pada `backend-laravel/.env`.
6. Pastikan `MONGODB_DATABASE` sesuai.
7. Jalankan health check backend.

Endpoint test:

```txt
GET http://127.0.0.1:8000/api/health/database
```

Expected response:

```json
{
  "success": true,
  "database": "mongodb",
  "message": "MongoDB connection is healthy"
}
```

Jika gagal, periksa:
- IP whitelist Atlas
- format `MONGODB_URI`
- CA/TLS certificate
- DNS jaringan lokal

## 14. API Documentation Summary

Ringkasan endpoint utama berdasarkan route aktual `backend-laravel/routes/api.php`:

| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `/api/auth/register` | Register user |
| POST | `/api/auth/login` | Login user |
| GET | `/api/auth/google/redirect` | Redirect ke Google OAuth |
| GET | `/api/auth/google/callback` | Proses callback Google OAuth |
| GET | `/api/auth/me` | Ambil user login aktif |
| POST | `/api/auth/logout` | Logout user |
| POST | `/api/generate/prd` | Generate PRD |
| POST | `/api/generate/next-step` | Generate Next Step Planner |
| POST | `/api/generate/coding-prompt` | Generate Coding Prompt |
| GET | `/api/history` | Get generation history |
| GET | `/api/history/{id}` | Get result detail |
| GET | `/api/download/{id}` | Download Markdown |
| GET | `/api/profile` | Get user profile |
| PATCH | `/api/profile/display-name` | Update display name |
| GET | `/api/health/database` | Database health check |
| GET | `/api/health/ai` | AI provider health check |
| GET | `/api/admin/ai-settings` | Show AI settings |
| POST | `/api/admin/ai-settings/validate-key` | Validate AI config |
| POST | `/api/admin/ai-settings/update-key` | Update AI config |
| GET | `/api/admin/support/conversations` | Admin support inbox |
| POST | `/api/support/conversations` | Start support conversation |

Detail API tersedia di [docs/API_DOCUMENTATION.md](docs/API_DOCUMENTATION.md).

## 15. How to Use

1. Buka aplikasi di browser.
2. Register akun baru atau login.
3. Jika ingin login Google, klik tombol **Login dengan Google** di halaman login.
4. Selesaikan consent screen Google.
5. Setelah callback berhasil, user akan diarahkan ke halaman generate dengan sesi login aktif.
6. Masuk ke halaman **Generate**.
7. Isi ide project dan pilih jenis generate:
   - PRD Generator
   - Next Step Planner
   - Coding Prompt Generator
8. Klik generate dan tunggu hasil AI selesai.
9. Buka halaman result untuk membaca dokumen.
10. Buka history untuk melihat hasil generate sebelumnya.
11. Download Markdown bila diperlukan.
12. Jika token habis, ajukan token reset request.
13. Jika Anda admin, buka dashboard admin untuk AI settings, live chat, dan user management.

Panduan penggunaan lebih detail tersedia di [docs/USER_GUIDE.md](docs/USER_GUIDE.md).

## 16. Demo Account

Karena tidak ada akun demo hardcoded yang aman untuk dibagikan di repository, gunakan salah satu opsi berikut:

```txt
Demo account can be created through the Register page.
```

Untuk fitur admin:

```txt
TODO: Siapkan akun admin demo yang aman atau jelaskan proses pembuatan admin lokal saat presentasi.
```

## 17. Screenshots

### Home
![Home](screenshot/home.png)

### Generate
![Generate](screenshot/generate.png)

### History
![History](screenshot/history.png)

### Result
![Result](screenshot/result.png)

### Profile
![Profile](screenshot/profile.png)

### Admin Dashboard
![Admin Dashboard](screenshot/admin-dashboard.png)

### Live Chat Admin
![Live Chat Admin](screenshot/live-chat-admin.png)

### Token Request
![Token Request](screenshot/token-request.png)

### Responsive Mobile
![Mobile Generate](screenshot/mobile-generate.png)

## 18. Testing

| Test Case | Expected Result | Status |
| --- | --- | --- |
| Register user | User berhasil dibuat | Done |
| Login user | User berhasil masuk dashboard | Done |
| Login Google user baru | User baru dibuat tanpa duplikasi | Done |
| Login Google user existing | User existing dipakai ulang, role tidak berubah | Done |
| Logout setelah login Google | Token terhapus dan sesi selesai | Done |
| Generate PRD | AI menghasilkan PRD | Done |
| Save history | Result tersimpan ke MongoDB | Done |
| Open result | Detail PRD tampil | Done |
| Download markdown | File `.md` terdownload | Done |
| Database health | MongoDB connected / handled properly | Done |
| AI provider health | Provider reachable / handled error | Done |
| Responsive mobile | UI tetap usable | Done |

Manual commands:

```bash
cd backend-laravel
php artisan test
curl http://127.0.0.1:8000/api/health/database
curl http://127.0.0.1:8000/api/health/ai

cd ../frontend-next
npm run lint
npm run build
```

Manual test Google Login:
1. Isi `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, dan `GOOGLE_REDIRECT_URI` di `backend-laravel/.env`.
2. Restart backend Laravel setelah ubah `.env`.
3. Buka `http://localhost:3000/login`.
4. Klik tombol **Login dengan Google**.
5. Pilih akun Google.
6. Pastikan browser kembali ke frontend dan user masuk ke halaman generate.
7. Cek profile atau halaman protected lain untuk memastikan token/session aktif.

Checklist pengujian lengkap tersedia di [docs/TESTING_CHECKLIST.md](docs/TESTING_CHECKLIST.md).

## 19. Deployment / Demo Links

- Frontend URL: `TODO`
- Backend URL: `TODO`
- GitHub Repository: `TODO`
- YouTube Demo: `TODO`

Deployment guide tersedia di [docs/DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md).

## 20. Security Notes

- API key tidak boleh di-hardcode di frontend.
- File `.env` tidak boleh di-commit.
- Password disimpan dalam bentuk hash.
- Google Client Secret hanya boleh disimpan di backend `.env`.
- Redirect URI Google harus cocok persis dengan yang didaftarkan di Google Cloud Console.
- MongoDB Atlas sebaiknya memakai IP whitelist / Network Access yang ketat.
- Production wajib memakai HTTPS.
- Debug error tidak boleh diekspos ke user production.
- Secret harus diganti jika pernah bocor atau dipakai di tempat tidak aman.
- Endpoint admin wajib dilindungi role admin.

## 21. UTS Requirement Mapping

Berikut mapping langsung terhadap poin briefing UTS AI 2026.

| UTS Requirement | Implementation in VibePlan AI |
| --- | --- |
| Web-based application | Built with Next.js frontend and Laravel backend |
| Minimal 1 AI feature | PRD Generator, Next Step Planner, dan Coding Prompt Generator |
| Problem statement jelas | Documented in this README and `docs/PRD_VibePlan_AI.md` |
| Demo can run | Local setup, test commands, dan screenshots tersedia |
| Source code submitted | Repository structure and source folders documented |
| Uses AI API | Configurable AI provider via backend `.env` and admin AI settings |
| Documentation | README utama + folder `docs/` |
| Responsive UI | Frontend supports desktop and mobile, termasuk screenshot mobile |
| API key security | API key stored in environment variables, not in frontend |

## 22. Team Members / Contribution

| Name | Student ID | Role / Contribution |
| --- | --- | --- |
| Raflian Taofiq Z.M | 24.01.53.0008 | Full-stack development, AI integration, backend, frontend, testing, deployment, documentation |
| Rafif Naraya | 24.01.53.0009 | Database planning, database management, analysis testing, and document preparation |

Jika komposisi tim berubah, bagian ini perlu disesuaikan kembali sebelum submission akhir.

## 23. Limitations

- Output AI tetap perlu direview ulang oleh manusia.
- Provider AI dapat terkena rate limit, timeout, atau limit model.
- Kualitas PRD sangat bergantung pada kualitas brief/prompt yang dimasukkan user.
- Beberapa output enterprise bisa panjang dan memerlukan mode ringkas atau continuation logic.
- Deployment production membutuhkan konfigurasi keamanan yang lebih ketat daripada environment lokal.
- Koneksi MongoDB Atlas masih sensitif terhadap TLS/CA certificate, DNS, dan IP whitelist.

## 24. Future Development

- Export PDF
- Multi-template PRD
- Collaboration mode / workspace team
- AI fallback provider yang lebih agresif
- Token usage monitoring
- Team workspace multi-user
- GitHub integration
- Advanced admin analytics
- PRD section renderer yang lebih kaya untuk Data Dictionary dan API Design

## 25. Originality Statement

VibePlan AI dikembangkan sebagai project UTS Kecerdasan Buatan 2026. Project ini menggunakan framework, library, dan referensi teknis yang umum dipakai dalam pengembangan software, tetapi implementasi aplikasi, workflow fitur AI, integrasi frontend-backend, dan dokumentasi project dikembangkan secara nyata untuk kebutuhan tugas ini. Jika ada referensi eksternal yang dipakai, referensi tersebut harus diposisikan sebagai bahan belajar atau acuan teknis, bukan disalin mentah sebagai project jadi.

## 26. License / Closing

Project ini disiapkan untuk kebutuhan pembelajaran, presentasi akademik, dan pengembangan lebih lanjut. Silakan gunakan README ini sebagai panduan setup, demo, dan evaluasi awal project.

---

## Referensi Dokumentasi Tambahan

- [docs/PRD_VibePlan_AI.md](docs/PRD_VibePlan_AI.md)
- [docs/INSTALLATION.md](docs/INSTALLATION.md)
- [docs/API_DOCUMENTATION.md](docs/API_DOCUMENTATION.md)
- [docs/TESTING_CHECKLIST.md](docs/TESTING_CHECKLIST.md)
- [docs/DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md)
- [docs/USER_GUIDE.md](docs/USER_GUIDE.md)
- [docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md)
