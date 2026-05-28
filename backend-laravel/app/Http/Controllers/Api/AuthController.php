<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuthToken;
use App\Models\User;
use App\Services\UserActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    public function __construct(
        private readonly UserActivityLogger $activityLogger,
    ) {
    }

    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'email' => ['required', 'email', 'max:255'],
            'password' => ['required', 'string', 'min:8', 'max:255'],
        ]);

        if (User::query()->where('email', strtolower($validated['email']))->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Email sudah terdaftar. Silakan gunakan email lain atau login.',
            ], 422);
        }

        $user = User::query()->create([
            'name' => $validated['name'],
            'email' => strtolower($validated['email']),
            'password_hash' => Hash::make($validated['password']),
            'role' => 'user',
            'token_balance' => 10,
            'status' => 'active',
        ]);

        [$plainToken] = $this->issueAuthToken($user);

        $this->activityLogger->log(
            $request,
            'user_registered',
            'User berhasil membuat akun baru.',
            ['email' => $user->email, 'role' => $user->role],
            $user,
            $user,
        );

        return response()->json([
            'success' => true,
            'token' => $plainToken,
            'user' => $this->userPayload($user),
        ], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email', 'max:255'],
            'password' => ['required', 'string', 'max:255'],
        ]);

        $user = User::query()->where('email', strtolower($validated['email']))->first();

        if (! $user || ! Hash::check($validated['password'], (string) $user->password_hash)) {
            return response()->json([
                'success' => false,
                'message' => 'Email atau password tidak valid.',
            ], 401);
        }

        if ((string) $user->status === 'blocked') {
            return response()->json([
                'success' => false,
                'message' => 'Akun kamu sedang diblokir. Hubungi admin untuk bantuan lebih lanjut.',
            ], 403);
        }

        [$plainToken] = $this->issueAuthToken($user);

        $this->activityLogger->log(
            $request,
            'user_logged_in',
            'User berhasil login ke aplikasi.',
            ['role' => $user->role],
            $user,
            $user,
        );

        return response()->json([
            'success' => true,
            'token' => $plainToken,
            'user' => $this->userPayload($user),
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'success' => true,
            'user' => $this->userPayload($request->user()),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();
        $token = $request->attributes->get('auth_token');

        if ($token instanceof AuthToken) {
            $token->delete();
        }

        if ($user instanceof User) {
            $this->activityLogger->log(
                $request,
                'user_logged_out',
                'User logout dari aplikasi.',
                [],
                $user,
                $user,
            );
        }

        return response()->json([
            'success' => true,
            'message' => 'Logout berhasil.',
        ]);
    }

    /**
     * @return array{0: string, 1: AuthToken}
     */
    private function issueAuthToken(User $user): array
    {
        $plainToken = Str::random(64);
        $token = AuthToken::query()->create([
            'user_id' => (string) $user->getKey(),
            'token_hash' => hash('sha256', $plainToken),
            'expires_at' => Carbon::now()->addDays(30),
        ]);

        return [$plainToken, $token];
    }

    /**
     * @return array<string, mixed>
     */
    private function userPayload(?User $user): array
    {
        return [
            'id' => (string) $user?->getKey(),
            'name' => (string) $user?->name,
            'email' => (string) $user?->email,
            'avatar_url' => $user?->avatar_url,
            'role' => (string) ($user?->role ?? 'user'),
            'token_balance' => (int) ($user?->token_balance ?? 0),
            'status' => (string) ($user?->status ?? 'active'),
        ];
    }
}
