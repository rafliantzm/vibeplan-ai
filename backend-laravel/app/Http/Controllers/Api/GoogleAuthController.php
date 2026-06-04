<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\AuthSessionService;
use App\Services\UserActivityLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;
use Laravel\Socialite\Facades\Socialite;
use Throwable;

class GoogleAuthController extends Controller
{
    public function __construct(
        private readonly AuthSessionService $authSessionService,
        private readonly UserActivityLogger $activityLogger,
    ) {
    }

    public function redirect(): RedirectResponse
    {
        if (! $this->hasGoogleConfig()) {
            return $this->redirectToFrontendError('google_config_missing');
        }

        try {
            return Socialite::driver('google')
                ->stateless()
                ->redirect();
        } catch (Throwable $exception) {
            Log::warning('Google OAuth redirect failed.', [
                'message' => $exception->getMessage(),
            ]);

            return $this->redirectToFrontendError('google_login_failed');
        }
    }

    public function callback(Request $request): RedirectResponse
    {
        if (! $this->hasGoogleConfig()) {
            return $this->redirectToFrontendError('google_config_missing');
        }

        try {
            $googleUser = Socialite::driver('google')
                ->stateless()
                ->user();
        } catch (Throwable $exception) {
            Log::warning('Google OAuth callback failed.', [
                'message' => $exception->getMessage(),
                'code' => $exception->getCode(),
            ]);

            return $this->redirectToFrontendError('google_callback_invalid');
        }

        $email = strtolower(trim((string) $googleUser->getEmail()));

        if ($email === '') {
            return $this->redirectToFrontendError('google_callback_invalid');
        }

        try {
            $user = User::query()->where('email', $email)->first();

            if ($user instanceof User) {
                if ((string) $user->status === 'blocked') {
                    return $this->redirectToFrontendError('google_login_failed');
                }

                $user->fill(array_filter([
                    'google_id' => $googleUser->getId() ?: null,
                    'avatar_url' => $googleUser->getAvatar() ?: $user->avatar_url,
                    'provider' => $user->provider ?: 'google',
                    'email_verified_at' => $user->email_verified_at ?: Carbon::now(),
                    'is_active' => $user->is_active ?? true,
                ], static fn ($value) => $value !== null));
                $user->save();
            } else {
                $fallbackName = strstr($email, '@', true) ?: 'Google User';
                $resolvedName = trim((string) ($googleUser->getName() ?: $googleUser->getNickname() ?: $fallbackName));

                $user = User::query()->create([
                    'name' => $resolvedName,
                    'display_name' => $resolvedName,
                    'email' => $email,
                    'password_hash' => null,
                    'google_id' => $googleUser->getId() ?: null,
                    'avatar_url' => $googleUser->getAvatar() ?: null,
                    'provider' => 'google',
                    'role' => 'user',
                    'token_balance' => 10,
                    'status' => 'active',
                    'is_active' => true,
                    'email_verified_at' => Carbon::now(),
                ]);

                $this->activityLogger->log(
                    $request,
                    'user_registered_google',
                    'User berhasil membuat akun baru melalui Google.',
                    ['email' => $user->email, 'role' => $user->role],
                    $user,
                    $user,
                );
            }

            [$plainToken] = $this->authSessionService->issueAuthToken($user);

            $this->activityLogger->log(
                $request,
                'user_logged_in_google',
                'User berhasil login melalui Google.',
                ['role' => $user->role],
                $user,
                $user,
            );

            return redirect()->away($this->frontendCallbackUrl($plainToken));
        } catch (Throwable $exception) {
            Log::error('Google OAuth login persistence failed.', [
                'message' => $exception->getMessage(),
            ]);

            return $this->redirectToFrontendError('google_login_failed');
        }
    }

    private function hasGoogleConfig(): bool
    {
        return filled(config('services.google.client_id'))
            && filled(config('services.google.client_secret'))
            && filled(config('services.google.redirect'));
    }

    private function frontendBaseUrl(): string
    {
        return rtrim((string) config('services.frontend_url', 'http://localhost:3000'), '/');
    }

    private function redirectToFrontendError(string $errorCode): RedirectResponse
    {
        return redirect()->away($this->frontendBaseUrl().'/login?error='.$errorCode);
    }

    private function frontendCallbackUrl(string $token): string
    {
        return $this->frontendBaseUrl().'/auth/callback?token='.urlencode($token);
    }
}
