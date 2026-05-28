# Script Demo VibePlan AI

Dokumen ini berisi naskah demo presentasi VibePlan AI yang dapat digunakan untuk kebutuhan akademik, video demo, atau presentasi project.

## 1. Opening Script

Selamat datang, kami dari tim pengembang akan mempresentasikan **VibePlan AI**, yaitu workspace berbasis AI yang dirancang untuk membantu pemula coding menyusun perencanaan project secara lebih terstruktur, mulai dari PRD, roadmap implementasi, hingga prompt coding yang siap digunakan.

## 2. Script Latar Belakang Masalah

Banyak pemula coding ingin langsung membangun aplikasi menggunakan bantuan AI. Namun, kendala utamanya adalah mereka sering belum memiliki dokumen perencanaan yang rapi, belum memahami urutan pengembangan, dan belum mampu menulis prompt yang cukup terarah untuk coding agent. Akibatnya, hasil coding menjadi tidak konsisten dan sulit dikembangkan. Dari masalah tersebut, kami membangun VibePlan AI.

## 3. Script Demo Register dan Login

Pada tahap pertama, kami akan menunjukkan proses autentikasi. User dapat melakukan registrasi akun baru, kemudian login ke dalam sistem. Setelah berhasil login, user akan diarahkan ke workspace utama dan dapat mulai menggunakan fitur generate AI.

## 4. Script Demo PRD Generator

Berikutnya, kami membuka halaman **Generate** dan memilih mode **PRD Generator**. Pada bagian ini, user cukup mengisi informasi utama project seperti nama project, ide aplikasi, target user, masalah utama, tipe aplikasi, dan tech stack. Setelah tombol generate ditekan, sistem akan mengirim request ke backend Laravel, lalu backend memproses prompt ke provider AI. Hasilnya berupa Product Requirements Document dalam format Markdown yang rapi dan siap digunakan sebagai dasar pengembangan.

## 5. Script Demo Next Step Planner

Selanjutnya, kami memilih mode **Next Step Planner**. Fitur ini dapat bekerja menggunakan dua sumber input, yaitu form project atau file PRD yang sudah tersedia. Jika user sudah memiliki PRD dalam format Markdown, file tersebut dapat di-upload. Sistem kemudian menghasilkan roadmap implementasi yang lebih jelas, misalnya langkah setup repository, frontend, backend, database, testing, dan deployment.

## 6. Script Demo Coding Prompt Generator

Setelah roadmap tersedia, user dapat melanjutkan ke **Coding Prompt Generator**. Pada tahap ini user mengunggah file Next Step Planner dan memilih coding agent yang diinginkan, misalnya Codex atau GitHub Copilot. Sistem akan menghasilkan prompt coding yang lebih siap salin-tempel ke coding agent, baik pada mode normal maupun mode ringkas.

## 7. Script Demo History dan Download Markdown

Setiap hasil generate yang berhasil diproses akan otomatis disimpan ke database dan muncul di halaman **History**. Dari halaman ini, user dapat membuka detail hasil generate, melihat isi dokumen kembali, mengunduh file Markdown, atau menghapus data yang sudah tidak diperlukan.

## 8. Script Demo Profile

Pada halaman **Profile**, user dapat melihat informasi akun, token yang tersedia, mengubah data profil, mengganti nama tampilan, mengunggah avatar, dan mengganti password. Halaman ini dibuat agar pengguna dapat mengelola identitas akun dan keamanan dasar dari satu tempat.

## 9. Script Demo Admin Token dan Live Chat

Sekarang kami berpindah ke akun admin. Pada dashboard admin, tersedia beberapa area penting seperti **Token Requests**, **Live Chat Support**, **User Management**, dan **AI Settings**. Pada halaman token request, admin dapat meninjau permintaan token dari user lalu menyetujui atau menolak sesuai kebutuhan. Pada halaman live chat support, admin dapat membalas percakapan dari guest maupun user login secara langsung dalam tampilan inbox chat.

## 10. Script Closing

Sebagai penutup, VibePlan AI dirancang untuk membantu pemula coding agar tidak langsung melompat ke tahap implementasi tanpa perencanaan. Dengan bantuan PRD Generator, Next Step Planner, Coding Prompt Generator, history, profile management, dan admin tools, VibePlan AI memberikan alur kerja yang lebih terstruktur, lebih aman, dan lebih mudah dipahami bagi pengguna pemula.

## 11. Template Deskripsi YouTube

```text
VibePlan AI adalah workspace berbasis AI yang membantu pemula coding menyusun PRD, roadmap implementasi, dan coding prompt secara lebih terstruktur.

Fitur utama:
- PRD Generator
- Next Step Planner
- Coding Prompt Generator
- History dan download Markdown
- Profile management
- Admin token request
- Live chat support

Tech stack:
- Frontend: Next.js
- Backend: Laravel REST API
- Database: MongoDB
- AI Provider: Groq / OpenAI-compatible API

Tim Developer:
1. Raflian Taofiq Z.M (24.01.53.0008)
2. Rafif Naraya (24.01.53.0009)

Demo ini dibuat untuk kebutuhan presentasi dan dokumentasi project akademik.
```
