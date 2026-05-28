# ADMIN UI POLISH CHECKLIST

## Notes
- Scope audit ini hanya untuk frontend admin pages.
- Route "User Management" yang aktif saat ini adalah `/admin/users`, bukan `/admin/user-management`.

## 1. Admin dashboard

- Page/component: `frontend-next/app/admin/page.js`
- Issue: Hero dashboard terlalu generik dan kurang memberi konteks area admin mana yang paling penting atau paling urgent untuk dibuka lebih dulu.
- Severity: medium
- Suggested fix: Tambahkan summary strip atau priority cues seperti jumlah token requests pending, unread live chat, dan status AI settings agar dashboard terasa lebih operasional.

- Page/component: `frontend-next/app/admin/page.js`
- Issue: Keempat dashboard card terlihat setara semua, sehingga hierarki visual antar fitur admin tidak jelas.
- Severity: medium
- Suggested fix: Beri visual emphasis pada card yang paling sering dipakai, misalnya token requests dan live chat support, dengan badge status atau accent panel.

- Page/component: `frontend-next/app/admin/page.js`
- Issue: Card dashboard terlalu mirip satu sama lain dan masih terasa seperti daftar link biasa, belum seperti command center.
- Severity: low
- Suggested fix: Tambahkan metadata singkat per card seperti "pending review", "active chat", atau "config status" agar keputusan klik lebih cepat.

- Page/component: `frontend-next/app/admin/page.js`
- Issue: Tidak ada penanda jelas bahwa halaman ini khusus admin selain heading utama.
- Severity: low
- Suggested fix: Tambahkan helper note atau access badge seperti "Admin only workspace" pada hero.

## 2. Token requests

- Page/component: `frontend-next/app/admin/token-requests/page.js`
- Issue: List request memakai card besar per item, tetapi informasi penting seperti nama, email, alasan, status, dan token amount masih terasa menumpuk dalam satu blok.
- Severity: high
- Suggested fix: Pisahkan card menjadi area summary atas, reason block, dan action block supaya scanning tiap request lebih cepat.

- Page/component: `frontend-next/app/admin/token-requests/page.js`
- Issue: Status request hanya tampil sebagai teks kecil "Status: ..." tanpa badge visual yang kuat.
- Severity: medium
- Suggested fix: Gunakan status badge yang jelas untuk `pending`, `approved`, dan `rejected`.

- Page/component: `frontend-next/app/admin/token-requests/page.js`
- Issue: Form action `token_amount` dan `admin_note` terlihat seperti form mentah dan tidak punya konteks yang cukup.
- Severity: medium
- Suggested fix: Tambahkan label helper singkat, placeholder, dan grouping yang lebih rapi agar admin tahu efek dari approve/reject.

- Page/component: `frontend-next/app/admin/token-requests/page.js`
- Issue: Empty state khusus token request belum ada; saat daftar kosong halaman akan terasa kosong tanpa arahan.
- Severity: medium
- Suggested fix: Tambahkan empty state yang menjelaskan belum ada permintaan token yang perlu ditinjau.

- Page/component: `frontend-next/app/admin/token-requests/page.js`
- Issue: Loading state hanya berupa teks pendek, terasa terlalu lemah untuk halaman operasional admin.
- Severity: low
- Suggested fix: Gunakan loading card/skeleton ringan agar konsisten dengan halaman admin lain.

## 3. Live chat support

- Page/component: `frontend-next/app/admin/support-conversations/page.js`
- Issue: Layout inbox sudah mendekati chat app, tetapi panel kiri dan kanan masih terasa padat di beberapa area, terutama search/filter header dan action header chat.
- Severity: medium
- Suggested fix: Tambahkan spacing yang lebih tegas antara search, filter, unread count, dan status chip agar ritme visual lebih bersih.

- Page/component: `frontend-next/app/admin/support-conversations/page.js`
- Issue: Header halaman live chat masih cukup plain untuk area yang seharusnya real-time dan prioritas tinggi.
- Severity: low
- Suggested fix: Tambahkan summary kecil seperti jumlah percakapan aktif atau menunggu admin di hero atas.

- Page/component: `frontend-next/app/admin/support-conversations/page.js`
- Issue: Status dan unread signals di conversation list cukup kecil dan kurang dominan saat inbox ramai.
- Severity: medium
- Suggested fix: Perkuat unread badge dan state aktif dengan kontras/background yang lebih jelas.

- Page/component: `frontend-next/app/admin/support-conversations/page.js`
- Issue: Composer area admin cukup baik, tetapi helper text tentang password reset berada di area yang cukup besar dan dapat mendorong fokus turun dari chat.
- Severity: low
- Suggested fix: Ubah helper tersebut menjadi info banner yang lebih compact atau collapsible note.

- Page/component: `frontend-next/app/admin/support-conversations/page.js`
- Issue: Empty state di room/chat dan inbox masih generik, belum memberi arahan tindakan selanjutnya.
- Severity: low
- Suggested fix: Tambahkan copy yang lebih operasional, misalnya "Pilih chat baru dari panel kiri" atau "Percakapan dari guest dan user akan masuk di sini."

## 4. User management

- Page/component: `frontend-next/app/admin/users/page.js`
- Issue: Halaman berjudul user management tetapi layout-nya masih berupa daftar card biasa, sehingga manajemen user skala besar kurang efisien untuk discan.
- Severity: high
- Suggested fix: Pertimbangkan layout table responsif atau card list yang lebih padat dengan kolom status, role, token, dan CTA yang lebih ringkas.

- Page/component: `frontend-next/app/admin/users/page.js`
- Issue: Action link per user terlalu banyak dan tampil setara, sehingga satu card terasa penuh dan noisy.
- Severity: high
- Suggested fix: Kelompokkan aksi sekunder ke dropdown/action menu, sisakan 1-2 CTA primer yang paling sering dipakai.

- Page/component: `frontend-next/app/admin/users/page.js`
- Issue: Filter section sudah fungsional tetapi belum punya hierarki visual yang kuat antara pencarian dan filter sekunder.
- Severity: medium
- Suggested fix: Bedakan field search utama dari select role/status lewat ukuran, icon, atau grouping yang lebih jelas.

- Page/component: `frontend-next/app/admin/users/page.js`
- Issue: Metadata hasil filter "Menampilkan X user..." terasa terpisah dari list dan kurang menonjol.
- Severity: low
- Suggested fix: Jadikan metadata hasil sebagai compact summary bar dengan total user, filter aktif, dan quick reset filter.

- Page/component: `frontend-next/app/admin/users/page.js`
- Issue: Empty state untuk pencarian user ada, tetapi belum menawarkan tindakan reset filter secara eksplisit.
- Severity: low
- Suggested fix: Tambahkan tombol reset filter atau CTA kembali ke semua user.

## 5. AI settings

- Page/component: `frontend-next/app/admin/ai-settings/page.js`
- Issue: Halaman AI settings berisi banyak informasi teknis penting, tetapi grouping-nya belum cukup jelas antara current config, diagnostics, dan action form.
- Severity: high
- Suggested fix: Pisahkan menjadi tiga card/section yang jelas: current config, runtime diagnostics, dan update key form.

- Page/component: `frontend-next/app/admin/ai-settings/page.js`
- Issue: Banyak field ditampilkan sebagai paragraf flat, sehingga scanning provider/model/base URL/masked key terasa lambat.
- Severity: medium
- Suggested fix: Gunakan info grid atau definition list dengan label/value yang lebih tegas.

- Page/component: `frontend-next/app/admin/ai-settings/page.js`
- Issue: Form update API key kurang memberi rasa aman, karena validate dan save berada di level visual yang sama tanpa penjelasan urutan kerja.
- Severity: medium
- Suggested fix: Tambahkan helper flow seperti "1. Validate key, 2. Save key" atau pisahkan tombol utama dan tombol sekunder dengan hierarchy yang lebih jelas.

- Page/component: `frontend-next/app/admin/ai-settings/page.js`
- Issue: Status success/error masih tampil terlalu sederhana dan tidak cukup terintegrasi dengan card form.
- Severity: low
- Suggested fix: Gunakan inline status banner yang konsisten di bawah action row.

## 6. Notification popup placement

- Page/component: `frontend-next/components/admin/AdminNotificationCenter.jsx`
- Issue: Toast notification di `right-6 top-24` berpotensi menumpuk dekat dropdown header admin pada viewport tertentu.
- Severity: medium
- Suggested fix: Evaluasi jarak top/right terhadap header dropdown dan beri adaptive offset untuk mobile/tablet.

- Page/component: `frontend-next/components/admin/AdminNotificationCenter.jsx`
- Issue: Lebar toast `w-[360px]` dengan `max-w-[calc(100vw-2rem)]` sudah aman, tetapi pada layar kecil masih berpotensi terasa dominan.
- Severity: low
- Suggested fix: Gunakan spacing dan type scale sedikit lebih compact di bawah breakpoint kecil.

- Page/component: `frontend-next/components/admin/AdminNotificationCenter.jsx`
- Issue: Notifikasi baru hanya berupa stack toast tanpa badge/summary tetap di shell admin.
- Severity: low
- Suggested fix: Tambahkan optional persistent summary indicator di dashboard atau header admin agar toast tidak jadi satu-satunya sinyal.

## 7. Mobile responsive issues

- Page/component: `frontend-next/app/admin/page.js`
- Issue: Dashboard admin masih memakai card grid generik; pada mobile, semua card menumpuk panjang tanpa ringkasan prioritas.
- Severity: medium
- Suggested fix: Tambahkan grouping atau featured card di bagian atas untuk task paling urgent.

- Page/component: `frontend-next/app/admin/token-requests/page.js`
- Issue: Form input + action buttons di tiap request berpotensi memanjang vertikal dan membuat admin harus scroll terlalu jauh per card.
- Severity: medium
- Suggested fix: Gunakan stacking yang lebih compact di mobile dan sisakan tindakan approval utama lebih dekat dengan summary request.

- Page/component: `frontend-next/app/admin/support-conversations/page.js`
- Issue: Mobile chat mode cukup fungsional, tetapi perpindahan list ke room masih bisa terasa abrupt tanpa context header yang lebih kuat.
- Severity: low
- Suggested fix: Tambahkan sticky room header yang lebih ringkas dan indikator "kembali ke inbox" yang lebih jelas.

- Page/component: `frontend-next/app/admin/users/page.js`
- Issue: Daftar action link pada setiap user card terlalu banyak untuk mobile dan cenderung membuat card sangat tinggi.
- Severity: high
- Suggested fix: Ubah action cluster menjadi dropdown, segmented controls, atau tombol primer + link detail.

- Page/component: `frontend-next/app/admin/ai-settings/page.js`
- Issue: Banyak blok info bertumpuk pada mobile, sehingga halaman terasa seperti dump konfigurasi.
- Severity: medium
- Suggested fix: Gunakan accordion ringan atau section cards yang lebih jelas agar beban visual turun.

## 8. Empty/loading/error states

- Page/component: `frontend-next/app/admin/token-requests/page.js`
- Issue: Loading state hanya teks, error state ada tetapi tidak selalu diimbangi empty state yang informatif.
- Severity: medium
- Suggested fix: Standarkan loading/empty/error dengan komponen visual yang konsisten.

- Page/component: `frontend-next/app/admin/users/page.js`
- Issue: Empty state cukup jelas, tetapi loading state masih terasa sangat utilitarian.
- Severity: low
- Suggested fix: Tambahkan loading skeleton/list placeholder untuk memberi konteks struktur halaman.

- Page/component: `frontend-next/app/admin/ai-settings/page.js`
- Issue: Loading state hanya teks singkat dalam card utama.
- Severity: low
- Suggested fix: Gunakan info placeholder atau skeleton untuk blok current config/diagnostics/form.

- Page/component: `frontend-next/app/admin/support-conversations/page.js`
- Issue: Error global dan notice global sudah ada, tetapi belum dipisahkan jelas dari area chat/list.
- Severity: low
- Suggested fix: Gunakan placement yang lebih kontekstual, misalnya error inbox dekat panel kiri dan notice reply dekat composer.

## 9. Button consistency

- Page/component: `frontend-next/app/admin/*`
- Issue: Admin pages memakai campuran rounded-full, rounded-2xl, filled, outline, dan text action yang belum sepenuhnya konsisten.
- Severity: medium
- Suggested fix: Definisikan button hierarchy admin yang konsisten: primary, secondary, destructive, ghost.

- Page/component: `frontend-next/app/admin/users/page.js`
- Issue: ActionLink untuk user management terlihat ringan seperti link biasa, padahal beberapa aksi bersifat penting.
- Severity: medium
- Suggested fix: Naikkan hierarki visual untuk aksi primer dan turunkan aksi sekunder.

- Page/component: `frontend-next/app/admin/token-requests/page.js`
- Issue: Approve/Reject button sudah berbeda warna, tetapi penempatan dan ukuran belum terasa setara dan terukur.
- Severity: low
- Suggested fix: Gunakan action row yang lebih konsisten dengan destructive/confirm button styles yang sama dengan halaman admin lain.

## 10. Card spacing and hierarchy

- Page/component: `frontend-next/app/admin/page.js`
- Issue: Hero dan grid card belum punya jembatan visual; terasa seperti dua blok terpisah.
- Severity: low
- Suggested fix: Tambahkan spacing rhythm atau summary strip di antara hero dan grid.

- Page/component: `frontend-next/app/admin/token-requests/page.js`
- Issue: Card request cenderung panjang ke bawah dan kurang punya pembagian section internal.
- Severity: medium
- Suggested fix: Bagi card menjadi summary, admin controls, dan action row.

- Page/component: `frontend-next/app/admin/users/page.js`
- Issue: User cards belum menonjolkan informasi yang paling penting lebih dulu.
- Severity: medium
- Suggested fix: Naikkan prioritas visual untuk name/email/status, turunkan metadata sekunder seperti created_at.

- Page/component: `frontend-next/app/admin/ai-settings/page.js`
- Issue: Semua blok info dan form terasa berada pada level yang sama.
- Severity: medium
- Suggested fix: Gunakan hierarchy yang lebih tegas antara diagnostic info dan form tindakan.

## 11. Admin-only access clarity

- Page/component: `frontend-next/app/admin/*`
- Issue: Access denied state sudah ada, tetapi masing-masing halaman menyampaikan pesan admin-only dengan gaya yang sedikit berbeda-beda.
- Severity: low
- Suggested fix: Standarkan copy dan CTA untuk semua halaman admin agar pengalaman lebih konsisten.

- Page/component: `frontend-next/app/admin/page.js`, `frontend-next/app/admin/users/page.js`, `frontend-next/app/admin/token-requests/page.js`, `frontend-next/app/admin/ai-settings/page.js`, `frontend-next/app/admin/support-conversations/page.js`
- Issue: Tidak ada badge atau shell marker yang konsisten untuk menandakan bahwa user sedang berada di workspace admin.
- Severity: low
- Suggested fix: Tambahkan visual marker admin workspace yang konsisten di hero atau shell admin.
