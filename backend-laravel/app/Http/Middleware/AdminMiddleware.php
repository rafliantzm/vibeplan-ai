<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AdminMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || (string) $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'error_code' => 'ADMIN_REQUIRED',
                'message' => 'Akses admin diperlukan untuk endpoint ini.',
            ], 403);
        }

        return $next($request);
    }
}
