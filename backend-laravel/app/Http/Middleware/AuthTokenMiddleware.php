<?php

namespace App\Http\Middleware;

use App\Models\AuthToken;
use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AuthTokenMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $plainToken = $request->bearerToken();

        if (! $plainToken) {
            return $this->unauthorizedResponse();
        }

        $token = AuthToken::query()
            ->with('user')
            ->where('token_hash', hash('sha256', $plainToken))
            ->first();

        if (! $token || ! $token->user || ($token->expires_at && $token->expires_at->isPast())) {
            return $this->unauthorizedResponse();
        }

        if ((string) $token->user->status === 'blocked') {
            return response()->json([
                'success' => false,
                'error_code' => 'ACCOUNT_BLOCKED',
                'message' => 'Akun kamu sedang diblokir. Hubungi admin untuk bantuan lebih lanjut.',
            ], 403);
        }

        $request->attributes->set('auth_token', $token);
        $request->attributes->set('auth_user', $token->user);
        $request->setUserResolver(static fn () => $token->user);

        return $next($request);
    }

    private function unauthorizedResponse(): JsonResponse
    {
        return response()->json([
            'success' => false,
            'error_code' => 'AUTH_REQUIRED',
            'message' => 'Silakan login terlebih dahulu untuk menggunakan fitur generate AI.',
        ], 401);
    }
}
