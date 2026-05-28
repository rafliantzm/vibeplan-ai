<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Password VibePlan AI</title>
</head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:Arial,sans-serif;color:#0f172a;">
    <div style="max-width:640px;margin:0 auto;padding:32px 20px;">
        <div style="background-color:#ffffff;border:1px solid #e2e8f0;border-radius:24px;padding:32px;">
            <p style="margin:0 0 12px;font-size:14px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#0284c7;">
                VibePlan AI
            </p>
            <h1 style="margin:0 0 16px;font-size:28px;line-height:1.2;color:#0f172a;">
                Reset password akun kamu
            </h1>
            <p style="margin:0 0 16px;font-size:15px;line-height:1.8;color:#475569;">
                Halo, kami menerima permintaan untuk reset password akun VibePlan AI kamu.
            </p>
            <p style="margin:0 0 24px;font-size:15px;line-height:1.8;color:#475569;">
                Klik tombol di bawah ini untuk membuat password baru. Link ini berlaku selama 30 menit dan hanya bisa digunakan satu kali.
            </p>
            <p style="margin:0 0 28px;">
                <a href="{{ $resetUrl }}" style="display:inline-block;border-radius:9999px;background-color:#0f172a;padding:14px 24px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;">
                    Reset Password
                </a>
            </p>
            <p style="margin:0 0 16px;font-size:14px;line-height:1.8;color:#475569;">
                Jika tombol tidak bekerja, buka link berikut di browser:
            </p>
            <p style="margin:0 0 24px;font-size:14px;line-height:1.8;word-break:break-all;">
                <a href="{{ $resetUrl }}" style="color:#0369a1;text-decoration:none;">{{ $resetUrl }}</a>
            </p>
            <p style="margin:0;font-size:14px;line-height:1.8;color:#64748b;">
                Jika kamu tidak meminta reset password, abaikan email ini. Password kamu saat ini tidak berubah sampai kamu menyelesaikan proses reset.
            </p>
        </div>
    </div>
</body>
</html>
