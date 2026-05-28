# Dokumentasi API VibePlan AI

Dokumen ini merangkum endpoint REST API yang digunakan oleh VibePlan AI berdasarkan route Laravel pada `backend-laravel/routes/api.php`.

## Catatan Umum

- Base URL lokal backend umumnya: `http://127.0.0.1:8000`
- Seluruh contoh respons di bawah bersifat representatif.
- Beberapa field respons dapat berbeda sesuai serializer backend.
- Endpoint admin membutuhkan:
  - user sudah login
  - role user adalah `admin`

## Format Autentikasi

Untuk endpoint yang membutuhkan login, kirim header:

```http
Authorization: Bearer YOUR_ACCESS_TOKEN
Accept: application/json
Content-Type: application/json
```

---

## 1. Auth API

### 1.1 Register

- **Tujuan**: Membuat akun user baru.
- **Method**: `POST`
- **Endpoint**: `/api/auth/register`
- **Auth**: Tidak perlu login

#### Contoh Request

```json
{
  "name": "Raflian",
  "email": "raflian@example.com",
  "password": "Password123",
  "password_confirmation": "Password123"
}
```

#### Contoh Respons

```json
{
  "success": true,
  "message": "Registrasi berhasil.",
  "token": "USER_ACCESS_TOKEN",
  "user": {
    "id": "6656f1...",
    "name": "Raflian",
    "email": "raflian@example.com",
    "role": "user",
    "token_balance": 10
  }
}
```

#### Catatan

- Jangan pernah menampilkan `password_hash`.

### 1.2 Login

- **Tujuan**: Login user dan mendapatkan bearer token.
- **Method**: `POST`
- **Endpoint**: `/api/auth/login`
- **Auth**: Tidak perlu login

#### Contoh Request

```json
{
  "email": "raflian@example.com",
  "password": "Password123"
}
```

#### Contoh Respons

```json
{
  "success": true,
  "message": "Login berhasil.",
  "token": "USER_ACCESS_TOKEN",
  "user": {
    "id": "6656f1...",
    "name": "Raflian",
    "email": "raflian@example.com",
    "role": "user",
    "token_balance": 9
  }
}
```

### 1.3 Get Current User

- **Tujuan**: Mengambil profil user yang sedang login.
- **Method**: `GET`
- **Endpoint**: `/api/auth/me`
- **Auth**: Wajib login

#### Contoh Respons

```json
{
  "success": true,
  "data": {
    "id": "6656f1...",
    "name": "Raflian",
    "email": "raflian@example.com",
    "role": "user",
    "token_balance": 9
  }
}
```

### 1.4 Logout

- **Tujuan**: Logout user dan mengakhiri token aktif.
- **Method**: `POST`
- **Endpoint**: `/api/auth/logout`
- **Auth**: Wajib login

### 1.5 Forgot Password

- **Tujuan**: Mengirim permintaan reset password.
- **Method**: `POST`
- **Endpoint**: `/api/auth/forgot-password`
- **Auth**: Tidak perlu login

#### Contoh Request

```json
{
  "email": "raflian@example.com"
}
```

### 1.6 Reset Password

- **Tujuan**: Mengganti password dari token reset yang valid.
- **Method**: `POST`
- **Endpoint**: `/api/auth/reset-password`
- **Auth**: Tidak perlu login

#### Contoh Request

```json
{
  "email": "raflian@example.com",
  "token": "RESET_TOKEN",
  "password": "PasswordBaru123",
  "password_confirmation": "PasswordBaru123"
}
```

---

## 2. Generate API

### 2.1 Generate PRD

- **Tujuan**: Menghasilkan Product Requirements Document.
- **Method**: `POST`
- **Endpoint**: `/api/generate/prd`
- **Auth**: Wajib login

#### Contoh Request

```json
{
  "project_name": "VibePlan AI",
  "project_idea": "Platform AI untuk membantu pemula coding.",
  "target_user": "Mahasiswa dan beginner developer",
  "main_problem": "User belum punya perencanaan project yang rapi.",
  "app_type": "Web Application",
  "tech_stack": "Next.js, Laravel, MongoDB",
  "skill_level": "Beginner",
  "initial_prd": "Fokus pada generator dokumen dan history."
}
```

#### Contoh Respons

```json
{
  "success": true,
  "message": "PRD berhasil dibuat.",
  "data": {
    "id": "6657abc...",
    "generation_type": "prd",
    "markdown_content": "# PRD VibePlan AI\n..."
  }
}
```

### 2.2 Generate Next Step Planner

- **Tujuan**: Menghasilkan roadmap implementasi project.
- **Method**: `POST`
- **Endpoint**: `/api/generate/next-step`
- **Auth**: Wajib login

#### Contoh Request dari Form

```json
{
  "prd_source_mode": "form",
  "generation_mode": "normal",
  "agent_mode": "auto",
  "selected_agent": null,
  "project_name": "VibePlan AI",
  "project_idea": "Platform AI untuk planning project.",
  "target_user": "Pemula coding",
  "main_problem": "Belum ada workflow project yang rapi.",
  "app_type": "Web Application",
  "tech_stack": "Next.js, Laravel, MongoDB",
  "skill_level": "Beginner",
  "initial_prd": ""
}
```

#### Contoh Request dari Upload

```json
{
  "prd_source_mode": "upload",
  "prd_markdown": "# PRD\nIsi PRD di sini",
  "uploaded_prd_filename": "my-prd.md",
  "generation_mode": "compact",
  "agent_mode": "manual",
  "selected_agent": "codex"
}
```

### 2.3 Generate Coding Prompt

- **Tujuan**: Menghasilkan prompt coding dari file Next Step Planner.
- **Method**: `POST`
- **Endpoint**: `/api/generate/coding-prompt`
- **Auth**: Wajib login

#### Contoh Request

```json
{
  "prompt_source_mode": "next-step-upload",
  "next_step_markdown": "# Next Step Planner\n...",
  "uploaded_next_step_filename": "next-step.md",
  "selected_agent": "codex",
  "generation_mode": "compact"
}
```

#### Catatan

- `generation_mode` dapat berupa `normal` atau `compact`.
- Compact mode ditujukan untuk output yang lebih singkat dan stabil.

---

## 3. History API

### 3.1 Get History List

- **Tujuan**: Mengambil daftar history generate milik user.
- **Method**: `GET`
- **Endpoint**: `/api/history`
- **Auth**: Wajib login

#### Query Parameter (opsional)

- `search`
- `type`
- `page`

#### Contoh Respons

```json
{
  "success": true,
  "data": [
    {
      "id": "6657abc...",
      "generation_type": "prd",
      "title": "PRD VibePlan AI",
      "created_at": "2026-05-28T10:00:00Z"
    }
  ]
}
```

### 3.2 Get History Detail

- **Tujuan**: Mengambil detail satu hasil generate.
- **Method**: `GET`
- **Endpoint**: `/api/history/{id}`
- **Auth**: Wajib login

### 3.3 Download Markdown

- **Tujuan**: Mengunduh hasil generate sebagai file `.md`.
- **Method**: `GET`
- **Endpoint**: `/api/download/{id}`
- **Auth**: Wajib login

### 3.4 Delete History

- **Tujuan**: Menghapus history tertentu.
- **Method**: `DELETE`
- **Endpoint**: `/api/history/{id}`
- **Auth**: Wajib login

---

## 4. Profile API

### 4.1 Get Profile

- **Tujuan**: Mengambil data profil user.
- **Method**: `GET`
- **Endpoint**: `/api/profile`
- **Auth**: Wajib login

### 4.2 Update Profile

- **Tujuan**: Mengubah nama dan email utama user.
- **Method**: `PATCH`
- **Endpoint**: `/api/profile`
- **Auth**: Wajib login

#### Contoh Request

```json
{
  "name": "Raflian Baru",
  "email": "rafli.baru@example.com"
}
```

### 4.3 Update Display Name

- **Tujuan**: Mengubah nama tampilan cepat.
- **Method**: `PATCH`
- **Endpoint**: `/api/profile/name`
- **Auth**: Wajib login

#### Contoh Request

```json
{
  "name": "Rafli"
}
```

### 4.4 Update Password

- **Tujuan**: Mengubah password user.
- **Method**: `PATCH`
- **Endpoint**: `/api/profile/password`
- **Auth**: Wajib login

#### Contoh Request

```json
{
  "current_password": "PasswordLama123",
  "password": "PasswordBaru123",
  "password_confirmation": "PasswordBaru123"
}
```

### 4.5 Upload Avatar

- **Tujuan**: Mengunggah foto profil.
- **Method**: `POST`
- **Endpoint**: `/api/profile/avatar`
- **Auth**: Wajib login
- **Content-Type**: `multipart/form-data`

#### Field

- `avatar`: file JPG/PNG/WebP

---

## 5. Admin API

## 5.1 AI Settings

### Get AI Settings

- **Method**: `GET`
- **Endpoint**: `/api/admin/ai-settings`
- **Auth**: Admin only

### Get AI Diagnostics

- **Method**: `GET`
- **Endpoint**: `/api/admin/ai-settings/diagnostics`
- **Auth**: Admin only

### Validate API Key

- **Method**: `POST`
- **Endpoint**: `/api/admin/ai-settings/validate-key`
- **Auth**: Admin only

#### Contoh Request

```json
{
  "provider": "groq",
  "api_key": "YOUR_GROQ_API_KEY",
  "base_url": "https://api.groq.com/openai/v1",
  "model": "your-model-name"
}
```

### Update API Key

- **Method**: `POST`
- **Endpoint**: `/api/admin/ai-settings/update-key`
- **Auth**: Admin only

#### Catatan

- Raw API key tidak boleh ditampilkan penuh pada frontend.

## 5.2 User Management

### Get Users

- **Method**: `GET`
- **Endpoint**: `/api/admin/users`
- **Auth**: Admin only

### Get User Detail

- **Method**: `GET`
- **Endpoint**: `/api/admin/users/{id}`
- **Auth**: Admin only

### Update User

- **Method**: `PATCH`
- **Endpoint**: `/api/admin/users/{id}`
- **Auth**: Admin only

### Reset User Password

- **Method**: `PATCH`
- **Endpoint**: `/api/admin/users/{id}/password`
- **Auth**: Admin only

#### Catatan

- Password lama tidak perlu ditampilkan pada UI admin.

### Update User Tokens

- **Method**: `PATCH`
- **Endpoint**: `/api/admin/users/{id}/tokens`
- **Auth**: Admin only

### Get User Logs

- **Method**: `GET`
- **Endpoint**: `/api/admin/users/{id}/logs`
- **Auth**: Admin only

---

## 6. Token Request API

### 6.1 Create Token Request

- **Tujuan**: User mengajukan permintaan reset/penambahan token.
- **Method**: `POST`
- **Endpoint**: `/api/token-reset-requests`
- **Auth**: Wajib login

#### Contoh Request

```json
{
  "reason": "Token saya habis saat menggunakan fitur generate AI."
}
```

### 6.2 Get My Token Requests

- **Method**: `GET`
- **Endpoint**: `/api/token-reset-requests/my`
- **Auth**: Wajib login

### 6.3 Admin Get Token Requests

- **Method**: `GET`
- **Endpoint**: `/api/admin/token-reset-requests`
- **Auth**: Admin only

### 6.4 Admin Update Token Request

- **Method**: `PATCH`
- **Endpoint**: `/api/admin/token-reset-requests/{id}`
- **Auth**: Admin only

#### Contoh Request

```json
{
  "status": "approved",
  "admin_note": "Disetujui untuk testing lanjutan.",
  "token_amount": 10
}
```

#### Catatan

- Nilai `status` umumnya: `pending`, `approved`, `rejected`.

---

## 7. Support Chat API

## 7.1 Legacy Support Message API

Endpoint ini masih ada untuk kompatibilitas:

### Create Support Message

- **Method**: `POST`
- **Endpoint**: `/api/support/messages`
- **Auth**: Guest atau login

#### Contoh Request Guest

```json
{
  "name": "Guest User",
  "email": "guest@example.com",
  "message": "Saya butuh bantuan login."
}
```

## 7.2 Live Chat Conversation API

### Start Conversation

- **Method**: `POST`
- **Endpoint**: `/api/support/conversations`
- **Auth**: Guest atau login

#### Contoh Request Guest

```json
{
  "guest_session_id": "guest-123456",
  "name": "Guest User",
  "email": "guest@example.com",
  "message": "Saya lupa password dan tidak bisa login."
}
```

#### Contoh Request User Login

```json
{
  "message": "Saya butuh bantuan token."
}
```

### Get Conversation Messages

- **Method**: `GET`
- **Endpoint**: `/api/support/conversations/{id}/messages`
- **Auth**: Guest sesuai `guest_session_id` atau user pemilik conversation

#### Query Guest

```text
guest_session_id=guest-123456
```

### Send Conversation Message

- **Method**: `POST`
- **Endpoint**: `/api/support/conversations/{id}/messages`
- **Auth**: Guest sesuai `guest_session_id` atau user pemilik conversation

#### Contoh Request

```json
{
  "guest_session_id": "guest-123456",
  "message": "Apakah admin bisa bantu reset akun saya?"
}
```

## 7.3 Admin Support Chat API

### Get Support Conversations

- **Method**: `GET`
- **Endpoint**: `/api/admin/support/conversations`
- **Auth**: Admin only

### Get Conversation Detail

- **Method**: `GET`
- **Endpoint**: `/api/admin/support/conversations/{id}`
- **Auth**: Admin only

### Send Admin Reply

- **Method**: `POST`
- **Endpoint**: `/api/admin/support/conversations/{id}/messages`
- **Auth**: Admin only

#### Contoh Request

```json
{
  "message": "Baik, kami bantu cek akun Anda."
}
```

### Close Conversation

- **Method**: `PATCH`
- **Endpoint**: `/api/admin/support/conversations/{id}/close`
- **Auth**: Admin only

### Reopen Conversation

- **Method**: `PATCH`
- **Endpoint**: `/api/admin/support/conversations/{id}/reopen`
- **Auth**: Admin only

---

## Catatan Keamanan API

- Jangan pernah menampilkan `password_hash`.
- Jangan pernah menampilkan raw auth token hash.
- Jangan pernah mengirim API key provider ke frontend.
- Endpoint admin harus selalu dilindungi middleware admin.
- Respons error ke user akhir sebaiknya menggunakan pesan yang aman dan mudah dipahami.

