<?php

namespace App\Services;

use App\Models\AuthToken;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

class AuthSessionService
{
    /**
     * @return array{0: string, 1: AuthToken}
     */
    public function issueAuthToken(User $user): array
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
    public function userPayload(?User $user): array
    {
        return [
            'id' => (string) $user?->getKey(),
            'name' => (string) $user?->name,
            'display_name' => (string) ($user?->display_name ?: $user?->name),
            'email' => (string) $user?->email,
            'avatar_url' => $user?->avatar_url,
            'role' => (string) ($user?->role ?? 'user'),
            'token_balance' => (int) ($user?->token_balance ?? 0),
            'status' => (string) ($user?->status ?? 'active'),
        ];
    }
}
