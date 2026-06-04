# Script Demo Presentasi VibePlan AI

Dokumen ini disiapkan sebagai naskah presentasi dan demo singkat untuk deck UTS VibePlan AI.

## 1. Pembukaan

Selamat pagi. Kami dari tim pengembang akan mempresentasikan **VibePlan AI**, yaitu aplikasi web berbasis AI yang membantu pengguna menyusun dokumen perencanaan software secara otomatis, terstruktur, dan siap dipakai sebagai fondasi implementasi.

## 2. Latar Belakang

Masalah utama yang kami temukan adalah banyak mahasiswa dan developer pemula ingin langsung membuat aplikasi dengan bantuan AI, tetapi belum memiliki requirement, alur pengguna, struktur database, dan rancangan API yang rapi. Akibatnya, proses coding menjadi tidak konsisten dan sulit dikembangkan.

## 3. Solusi

VibePlan AI hadir sebagai workspace AI yang mengubah ide mentah menjadi tiga artefak utama:
- **PRD Generator**
- **Next Step Planner**
- **Coding Prompt Generator**

Hasil generate tidak hanya ditampilkan, tetapi juga disimpan ke history dan dapat diunduh sebagai Markdown.

## 4. Demo PRD Generator

### Input demo
- Nama project: `AI Planner untuk Pemula Coding`
- Ide project: aplikasi AI untuk membantu pemula coding menyusun rencana project
- Target user: mahasiswa dan beginner developer
- Masalah utama: user bingung memulai project dan menulis requirement
- Stack: Next.js, Laravel, MongoDB

### Narasi demo
1. Buka halaman **Generate**.
2. Pilih mode **PRD Generator**.
3. Isi form project.
4. Klik tombol generate.
5. Tunjukkan hasil PRD pada halaman result.

### Output yang ditunjukkan
- ringkasan project
- problem statement
- core features
- user journey
- data model dan ERD
- API design

## 5. Demo Next Step Planner

### Input demo
- Gunakan PRD yang baru saja dihasilkan.

### Narasi demo
1. Pilih mode **Next Step Planner**.
2. Gunakan PRD hasil generate sebagai sumber input.
3. Jalankan proses AI.
4. Tunjukkan roadmap implementasi yang terbagi menjadi langkah kerja terurut.

### Output yang ditunjukkan
- validasi scope
- setup frontend
- setup backend
- setup database
- testing
- deployment

## 6. Demo Coding Prompt Generator

### Input demo
- Gunakan hasil **Next Step Planner**.

### Narasi demo
1. Pilih mode **Coding Prompt Generator**.
2. Upload dokumen roadmap / next step planner.
3. Pilih coding agent, misalnya Codex atau Claude Code.
4. Jalankan generate.
5. Tunjukkan prompt coding yang siap ditempel ke coding agent.

### Output yang ditunjukkan
- prompt implementasi frontend
- prompt implementasi backend
- prompt struktur folder
- prompt API / database

## 7. Demo Fitur Pendukung

Setelah tiga generator utama, tunjukkan fitur pendukung:
- **History** untuk membuka ulang hasil generate
- **Result Detail** untuk membaca dokumen lengkap
- **Download Markdown** untuk mengunduh hasil
- **Profile** untuk mengelola identitas user dan token

## 8. Demo Fitur Admin

Gunakan akun admin untuk menunjukkan:
- **Dashboard Admin**
- **Token Request**
- **Live Chat Support**
- **AI Settings**
- **User Management**

Fokus penjelasan:
- admin dapat mengawasi operasional aplikasi
- admin dapat mengelola provider AI
- admin dapat membantu user melalui live chat

## 9. Testing dan Deployment

Jelaskan bahwa project sudah memiliki:
- checklist testing
- dokumentasi API
- panduan deployment
- README utama

Jika diperlukan saat presentasi, sebutkan bahwa frontend dan backend dipisahkan agar lebih maintainable.

## 10. Penutup

VibePlan AI dirancang untuk membantu pemula coding agar tidak langsung melompat ke coding tanpa perencanaan. Dengan bantuan AI, user dapat menyusun requirement, roadmap, dan coding prompt secara lebih cepat, tetapi tetap terstruktur dan dapat dijalankan sebagai project nyata.
