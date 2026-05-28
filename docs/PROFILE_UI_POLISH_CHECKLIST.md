# PROFILE UI POLISH CHECKLIST

Checklist ini berisi audit UI untuk halaman `/profile` VibePlan AI berdasarkan implementasi saat ini di [D:/WEB/vibeplan-ai/frontend-next/app/profile/page.js](D:/WEB/vibeplan-ai/frontend-next/app/profile/page.js). Fokus audit hanya pada kualitas visual, hierarki, kenyamanan penggunaan, dan konsistensi antarseksi. Tidak ada perubahan kode pada tahap ini.

## 1. Hero dan ringkasan profil

- Area: `ProfileHero`
- Masalah: Hero sudah lebih baik dari versi awal, tetapi kartu kanan "Account Workspace" masih terasa seperti ringkasan statis. Nilai role, status, dan token hanya tampil sebagai chip tanpa hierarki utama, sehingga area kanan terlihat kurang kuat sebagai panel informasi.
- Severity: medium
- Saran perbaikan: Buat satu metrik utama yang lebih dominan di panel kanan, misalnya token balance atau status akun. Pertimbangkan memberi urutan visual yang lebih jelas antara judul, deskripsi, dan chip agar panel kanan terasa seperti summary dashboard, bukan sekadar kumpulan badge.

## 2. Overview card terasa padat di bagian atas, kosong di bawah

- Area: `ProfileOverviewCard`
- Masalah: Bagian atas card memuat avatar, nama, email, badge, dan token card sekaligus. Setelah itu langsung masuk ke grid info 6 item yang cukup besar. Hasilnya, bagian atas terasa padat, sementara keseluruhan card menjadi cukup tinggi dan tidak seimbang secara vertikal.
- Severity: medium
- Saran perbaikan: Ringankan bagian atas dengan mengurangi duplikasi badge/token yang juga sudah muncul di section lain. Grid fakta bisa dibuat lebih rapat atau dibagi menjadi kelompok informasi inti dan informasi sekunder.

## 3. Duplikasi informasi identitas terlalu sering

- Area: `ProfileHero`, `ProfileOverviewCard`, `ProfileIdentityCard`, `ProfileStatsCards`
- Masalah: Nama, email, role, status, dan token diulang terlalu banyak di beberapa card. Secara fungsional tidak salah, tetapi secara visual membuat halaman terasa repetitif dan kurang efisien.
- Severity: medium
- Saran perbaikan: Tetapkan peran yang lebih spesifik untuk setiap card. Misalnya, overview fokus ke data inti, identity card fokus ke personal branding/visual, stats card fokus ke token dan status saja.

## 4. Layout kolom kanan terlalu penuh dibanding kolom kiri

- Area: grid utama `lg:grid-cols-12`
- Masalah: Kolom kanan berisi identity, avatar upload, display name, dan stats cards yang semuanya terpisah menjadi blok vertikal. Di desktop ini membuat kolom kanan terasa sangat “bertingkat” dan ramai, sementara kolom kiri hanya dua card sebelum password section.
- Severity: medium
- Saran perbaikan: Kurangi fragmentasi di kolom kanan dengan menggabungkan section yang sangat terkait, atau ubah urutan visual agar beban vertikal kanan tidak terasa terlalu berat.

## 5. Avatar upload masih terasa seperti utilitas form, belum terasa premium

- Area: `ProfileAvatarUploadCard`
- Masalah: Area upload sudah aman dan rapi, tetapi masih terasa seperti form teknis standar. Input file langsung tampil dominan, sementara preview dan metadata file terasa sekunder dan tidak terlalu menyatu.
- Severity: medium
- Saran perbaikan: Jadikan area upload lebih visual, misalnya dengan dropzone yang lebih jelas, preview yang lebih menonjol, dan metadata file yang lebih ringkas. Tombol submit bisa lebih dekat dengan preview agar flow unggah terasa satu rangkaian.

## 6. Card stats status/token kurang kuat sebagai “mini dashboard”

- Area: `ProfileStatsCards`
- Masalah: Dua mini stat card sudah memakai tone warna, tetapi perbedaan antara “status akun” dan “token saat ini” belum cukup tegas. Caption terasa generik dan value belum cukup dominan untuk menjadi elemen dashboard yang menarik.
- Severity: low
- Saran perbaikan: Perkuat kontras visual value utama, bedakan lagi tone status vs token, dan buat caption lebih operasional agar pengguna langsung paham fungsi masing-masing card.

## 7. Form nama/email masih terlalu flat

- Area: `ProfileAccountFormCard`
- Masalah: Struktur form sangat lurus: heading, dua field, satu tombol. Secara fungsi sudah baik, tetapi terasa datar dan belum memberi konteks yang cukup tentang dampak perubahan data akun.
- Severity: medium
- Saran perbaikan: Tambahkan helper note atau info ringan di dalam card, misalnya implikasi perubahan email/nama. Layout field juga bisa dibuat sedikit lebih “bernapas” agar card tidak terasa seperti form default.

## 8. Quick display name card kurang membedakan diri dari form akun utama

- Area: `ProfileDisplayNameCard`
- Masalah: Card ini terlalu mirip dengan form akun utama, padahal fungsinya berbeda. Pengguna bisa merasa bagian ini redundan karena “Nama Tampilan” dan “Nama” di form utama terlihat sangat dekat maknanya.
- Severity: medium
- Saran perbaikan: Jelaskan dengan microcopy yang lebih tegas kapan display name dipakai dan kenapa dipisah dari nama utama akun. Secara visual card ini juga bisa dibuat lebih ringkas agar jelas bahwa ini adalah “quick action”, bukan form besar kedua.

## 9. Form ganti password terasa kaku dan cukup berat dibaca

- Area: `ProfilePasswordCard`
- Masalah: Tiga field password sejajar di desktop memang efisien, tetapi terasa kaku dan terlalu “teknis”. Untuk user biasa, tiga input sejajar memberi beban visual cukup tinggi, apalagi jika labelnya panjang.
- Severity: medium
- Saran perbaikan: Pertimbangkan memperbaiki ritme spacing antar input, memperjelas prioritas field, dan membuat area tips keamanan lebih terasa membantu, bukan hanya tempelan di sisi kanan.

## 10. Spacing antarseksi belum punya ritme yang benar-benar konsisten

- Area: keseluruhan halaman `/profile`
- Masalah: Hampir semua card memakai padding dan jarak yang mirip, tetapi ritme antarblok masih terasa “seragam semua”. Ini membuat halaman terlihat aman, tetapi kurang punya momen visual yang kuat dan sedikit membosankan saat discroll.
- Severity: low
- Saran perbaikan: Buat variasi ritme yang lebih intentional, misalnya section penting lebih lapang, quick action lebih ringkas, dan section keamanan lebih punya penekanan visual.

## 11. Button belum sepenuhnya konsisten dari segi peran visual

- Area: seluruh halaman, terutama `ProfileAccountFormCard`, `ProfileAvatarUploadCard`, `ProfileDisplayNameCard`, `ProfilePasswordCard`
- Masalah: Ada beberapa gaya tombol yang berbeda dan itu memang disengaja, tetapi hierarkinya belum selalu terasa jelas. Tombol outline pada display name terasa sangat ringan dibanding fungsi update, sementara tombol gradient muncul di avatar dan password tanpa pola yang benar-benar konsisten.
- Severity: medium
- Saran perbaikan: Definisikan ulang hierarki tombol berdasarkan aksi utama, aksi sekunder, dan aksi cepat. Pastikan pengguna bisa mengenali mana aksi terpenting di setiap card hanya dari gaya tombolnya.

## 12. Status banner global berpotensi terasa terlalu jauh dari konteks error

- Area: `MessageBanner` global di atas grid
- Masalah: Error global muncul di atas seluruh layout. Jika error sebenarnya terkait avatar, password, atau profile form tertentu, jarak visual dari sumber masalah bisa membuat feedback terasa kurang kontekstual.
- Severity: medium
- Saran perbaikan: Pertahankan banner global untuk error umum, tetapi pertimbangkan pemisahan yang lebih jelas antara error halaman dan error per-form agar pengguna langsung tahu masalahnya ada di area mana.

## 13. Mobile layout aman, tetapi belum sepenuhnya optimal untuk ritme baca

- Area: layout mobile seluruh halaman
- Masalah: Semua card akan menumpuk secara vertikal di mobile. Ini aman secara teknis, tetapi dengan banyaknya section, halaman bisa terasa panjang dan sedikit repetitif saat discroll.
- Severity: medium
- Saran perbaikan: Perkuat ringkasan di bagian atas, kurangi pengulangan informasi antarkartu, dan pastikan section yang paling sering dipakai berada lebih awal agar flow mobile lebih nyaman.

## 14. Avatar fallback dan visual identity sudah bagus, tapi masih bisa terasa lebih personal

- Area: `AvatarDisplay`, `ProfileIdentityCard`
- Masalah: Avatar fallback gradient sudah cukup premium, tetapi ketika tidak ada foto profil, keseluruhan identitas masih terasa generik. Card identitas belum memberi rasa “akun milik saya” yang kuat selain nama dan email.
- Severity: low
- Saran perbaikan: Tambahkan sedikit nuance visual atau microcopy yang membuat identity card terasa lebih personal, misalnya peran akun atau deskripsi ringan tentang fungsi avatar/profile identity.

## 15. Microcopy masih cukup aman, belum sepenuhnya terasa handcrafted

- Area: seluruh page copy, terutama section header dan helper text
- Masalah: Copy sudah jelas dan lebih baik dari sebelumnya, tetapi beberapa kalimat masih terasa generik seperti teks dashboard standar. Ini membuat halaman masih sedikit terasa “template polished”, belum benar-benar punya karakter product yang khas.
- Severity: low
- Saran perbaikan: Perhalus microcopy agar lebih natural, spesifik, dan terasa ditulis untuk konteks pengguna VibePlan AI, terutama pada section avatar, display name, token, dan keamanan akun.

## Prioritas polish yang paling berdampak

Jika dipoles pada tahap berikutnya, urutan prioritas yang paling berpengaruh terhadap persepsi kualitas UI:

1. Kurangi duplikasi informasi identitas antarcard
2. Rapikan layout kolom kanan agar tidak terlalu bertumpuk
3. Buat avatar upload terasa lebih visual dan premium
4. Perjelas hierarki tombol antarsection
5. Perhalus microcopy agar tidak terlalu generik
