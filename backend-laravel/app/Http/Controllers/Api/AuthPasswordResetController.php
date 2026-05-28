<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\ResetPasswordMail;
use App\Models\AuthToken;
use App\Models\PasswordResetToken;
use App\Models\User;
use App\Services\UserActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class AuthPasswordResetController extends Controller
{
    private const RESET_TOKEN_TTL_MINUTES = 30;

    public function __construct(
        private readonly UserActivityLogger $activityLogger,
    ) {
    }

    public function forgotPassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email'],
        ]);

        $email = strtolower($validated['email']);
        $user = User::query()->where('email', $email)->first();

        if ($user) {
            $plainToken = bin2hex(random_bytes(32));
            $expiresAt = Carbon::now()->addMinutes(self::RESET_TOKEN_TTL_MINUTES);

            PasswordResetToken::query()
                ->where('email', $email)
                ->whereNull('used_at')
                ->update(['used_at' => Carbon::now()]);

            PasswordResetToken::query()->create([
                'email' => $email,
                'token_hash' => Hash::make($plainToken),
                'expires_at' => $expiresAt,
                'used_at' => null,
            ]);

            $resetUrl = $this->buildResetUrl($email, $plainToken);

            try {
                Mail::to($email)->send(new ResetPasswordMail($resetUrl));
            } catch (\Throwable $exception) {
                Log::warning('Failed to send password reset email.', [
                    'email' => $email,
                    'mailer' => config('mail.default'),
                    'error' => $exception->getMessage(),
                ]);
            }
        }

        return $this->genericForgotPasswordResponse();
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email'],
            'token' => ['required', 'string'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $email = strtolower($validated['email']);
        $user = User::query()->where('email', $email)->first();
        $resetToken = $this->findValidResetToken($email, $validated['token']);

        if (! $user || ! $resetToken) {
            return response()->json([
                'success' => false,
                'error_code' => 'RESET_TOKEN_INVALID',
                'message' => 'Link reset password tidak valid atau sudah kedaluwarsa.',
            ], 422);
        }

        $user->password_hash = Hash::make($validated['password']);
        $user->save();

        $resetToken->used_at = Carbon::now();
        $resetToken->save();

        AuthToken::query()->where('user_id', (string) $user->getKey())->delete();

        $this->activityLogger->log(
            $request,
            'password_reset_by_email',
            'User mereset password melalui email.',
            ['email' => $user->email],
            $user,
            $user,
        );

        return response()->json([
            'success' => true,
            'message' => 'Password berhasil diperbarui. Silakan login dengan password baru.',
        ]);
    }

    private function genericForgotPasswordResponse(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => 'Jika email terdaftar, link reset password akan dikirim ke email tersebut.',
        ]);
    }

    private function buildResetUrl(string $email, string $plainToken): string
    {
        $baseUrl = rtrim((string) config('services.frontend_url', 'http://localhost:3000'), '/');
        $query = http_build_query([
            'email' => $email,
            'token' => $plainToken,
        ]);

        return $baseUrl.'/reset-password?'.$query;
    }

    private function findValidResetToken(string $email, string $plainToken): ?PasswordResetToken
    {
        $candidates = PasswordResetToken::query()
            ->where('email', $email)
            ->whereNull('used_at')
            ->where('expires_at', '>', Carbon::now())
            ->orderByDesc('created_at')
            ->get();

        return $candidates->first(
            fn (PasswordResetToken $resetToken): bool => Hash::check($plainToken, (string) $resetToken->token_hash)
        );
    }
}
