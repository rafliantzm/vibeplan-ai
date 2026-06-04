<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuthToken;
use App\Models\User;
use App\Services\AuthSessionService;
use App\Services\UserActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function __construct(
        private readonly AuthSessionService $authSessionService,
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
            'display_name' => $validated['name'],
            'email' => strtolower($validated['email']),
            'password_hash' => Hash::make($validated['password']),
            'role' => 'user',
            'token_balance' => 10,
            'status' => 'active',
        ]);

        [$plainToken] = $this->authSessionService->issueAuthToken($user);

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
            'user' => $this->authSessionService->userPayload($user),
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

        [$plainToken] = $this->authSessionService->issueAuthToken($user);

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
            'user' => $this->authSessionService->userPayload($user),
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'success' => true,
            'user' => $this->authSessionService->userPayload($request->user()),
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
}
