# Panduan Pengguna VibePlan AI

Dokumen ini ditujukan untuk membantu pengguna memahami alur penggunaan VibePlan AI dari registrasi akun hingga penggunaan fitur admin.

## 1. Registrasi dan Login

### Registrasi

1. Buka halaman utama VibePlan AI.
2. Klik tombol **Register**.
3. Isi nama, email, dan password.
4. Kirim form registrasi.
5. Jika berhasil, akun akan dibuat dan pengguna dapat masuk ke sistem.

### Login

1. Klik tombol **Login**.
2. Masukkan email dan password.
3. Setelah berhasil, pengguna akan diarahkan ke area aplikasi.

### Catatan

- Gunakan email aktif untuk kemudahan identifikasi akun.
- Jika lupa password dan email reset belum aktif, gunakan fitur live chat support sebagai guest untuk menghubungi admin.

## 2. Menggunakan PRD Generator

PRD Generator digunakan untuk menyusun Product Requirements Document berdasarkan konteks project.

### Langkah penggunaan

1. Login ke akun VibePlan AI.
2. Buka halaman **Generate**.
3. Pilih mode **PRD Generator**.
4. Isi form project:
   - Nama project
   - Ide project
   - Target user
   - Masalah utama
   - Tipe aplikasi
   - Tech stack
   - Skill level
   - Catatan/PRD awal (opsional)
5. Klik tombol **Generate PRD**.
6. Tunggu proses AI selesai.
7. Hasil PRD akan terbuka di halaman result.

### Hasil yang diperoleh

PRD umumnya mencakup:

- Overview
- Requirements
- Core Features
- User Flow
- Architecture
- Technical Constraints
- ERD
- Development Phases

## 3. Menggunakan Next Step Planner

Next Step Planner digunakan untuk mengubah konteks project atau dokumen PRD menjadi langkah implementasi yang lebih terstruktur.

### Opsi sumber input

Pengguna dapat memilih:

- **Isi Form Project**
- **Upload File `.md` atau `.txt`**

### Langkah penggunaan

1. Buka halaman **Generate**.
2. Pilih mode **Next Step Planner**.
3. Pilih sumber input:
   - Gunakan form jika mulai dari nol
   - Gunakan upload jika sudah memiliki PRD
4. Jika memilih upload, unggah file PRD `.md` atau `.txt`.
5. Pilih workflow coding agent jika diperlukan.
6. Klik **Generate Next Step Planner**.

### Hasil yang diperoleh

Sistem akan menyusun roadmap langkah kerja implementasi, misalnya:

- validasi scope
- setup repository
- setup frontend
- setup backend
- setup database
- testing
- deployment

## 4. Menggunakan Coding Prompt Generator

Coding Prompt Generator digunakan untuk menghasilkan prompt coding yang lebih siap digunakan pada coding agent.

### Sumber input

Mode ini menggunakan dokumen **Next Step Planner** yang diunggah dalam format `.md` atau `.txt`.

### Langkah penggunaan

1. Buka halaman **Generate**.
2. Pilih mode **Coding Prompt Generator**.
3. Upload file Next Step Planner.
4. Pilih coding agent yang sesuai, misalnya:
   - Codex
   - Claude Code
   - GitHub Copilot
   - Antigravity
   - Manual Guide
5. Pilih mode output:
   - Normal
   - Ringkas
6. Klik **Generate Coding Prompts dari Next Step Planner**.

### Hasil yang diperoleh

Prompt yang dihasilkan biasanya:

- berbahasa Indonesia
- lebih praktis
- mengikuti konteks roadmap
- siap salin-tempel ke coding agent

## 5. Menggunakan Mode Ringkas

Mode Ringkas tersedia pada mode tertentu untuk membantu menjaga output tetap lebih singkat dan aman dari pemotongan.

### Kapan digunakan

Gunakan Mode Ringkas jika:

- file input cukup panjang
- output AI terlalu besar
- provider AI memiliki keterbatasan token
- pengguna ingin hasil yang lebih padat dan fokus

### Dampak Mode Ringkas

- hasil lebih pendek
- lebih aman dari output terpotong
- cocok untuk kebutuhan salin-tempel cepat

## 6. Melihat History

Setiap hasil generate akan disimpan ke history pengguna.

### Langkah penggunaan

1. Buka menu **History**.
2. Daftar hasil generate akan tampil.
3. Gunakan filter jika tersedia.
4. Klik item history untuk membuka detail.

### Manfaat history

- membuka ulang hasil generate
- membandingkan dokumen lama dan baru
- mengunduh ulang file Markdown

## 7. Mengunduh File Markdown

Setiap hasil generate dapat diunduh dalam format `.md`.

### Langkah penggunaan

1. Buka halaman detail hasil generate.
2. Klik tombol **Download Markdown**.
3. File akan terunduh ke perangkat.

### Kegunaan file Markdown

- dokumentasi project
- input ke coding agent
- arsip hasil generate

## 8. Mengelola Profil

Halaman profile digunakan untuk mengelola identitas akun dan keamanan dasar.

### Fitur profile

- melihat nama dan email
- melihat token saat ini
- mengubah nama dan email
- mengubah nama tampilan
- upload avatar
- mengganti password

## 9. Permintaan Token

Jika token pengguna habis, pengguna dapat mengirim permintaan reset/penambahan token ke admin.

### Langkah penggunaan

1. Saat token habis, sistem akan menampilkan informasi bahwa kuota tidak cukup.
2. Klik aksi yang mengarahkan ke permintaan token.
3. Kirim alasan permintaan token.
4. Admin akan meninjau permintaan tersebut.

## 10. Live Chat Support

Fitur live chat support tersedia untuk user login maupun guest.

### Untuk guest

1. Klik tombol **Bantuan**.
2. Isi nama, email, dan pesan pertama.
3. Setelah percakapan dimulai, sistem akan menampilkan chat bubble.
4. Guest dapat melanjutkan chat tanpa login.

### Untuk user login

1. Klik tombol **Bantuan**.
2. Chat akan langsung terbuka.
3. User dapat mengirim pesan ke admin tanpa mengisi nama/email lagi.

### Kegunaan

- bantuan teknis
- bantuan akun
- bantuan token
- alternatif ketika user lupa password

## 11. Fitur Admin

Fitur admin hanya tersedia untuk akun dengan role admin.

### Dashboard Admin

Admin dapat mengakses:

- AI Settings
- Token Requests
- Live Chat Support
- User Management

### Token Requests

Admin dapat:

- melihat daftar request token
- approve request
- reject request

### Live Chat Support

Admin dapat:

- melihat daftar percakapan
- membuka ruang chat
- membalas pesan
- menutup percakapan
- membuka kembali percakapan

### User Management

Admin dapat:

- melihat daftar user
- mengubah data dasar user
- mengubah token user
- reset password user
- melihat log terkait user

### AI Settings

Admin dapat:

- melihat provider aktif
- melihat model AI
- melihat base URL
- memvalidasi API key baru
- memperbarui API key backend

## 12. Catatan Penggunaan Aman

- Jangan membagikan password akun kepada pihak lain.
- Jangan mengirimkan API key melalui chat support.
- Untuk admin: jangan minta password lama user ketika membantu masalah login.
- Gunakan dokumen hasil generate sebagai panduan kerja, lalu sesuaikan kembali dengan kebutuhan project nyata.

