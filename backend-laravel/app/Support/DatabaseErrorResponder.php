<?php

namespace App\Support;

use Illuminate\Http\JsonResponse;
use Throwable;

class DatabaseErrorResponder
{
    public static function extensionMissing(string $context = 'endpoint'): JsonResponse
    {
        return response()->json([
            'success' => false,
            'error_code' => 'DATABASE_DRIVER_MISSING',
            'message' => 'MongoDB PHP extension belum aktif.',
            'user_message' => "MongoDB PHP extension belum aktif. Install ext-mongodb sebelum menggunakan {$context}.",
            'details' => null,
        ], 500);
    }

    public static function mongoUnavailable(Throwable $exception, ?string $fallbackMessage = null, ?int $status = null): JsonResponse
    {
        [$message, $resolvedStatus] = self::resolveMongoMessage($exception, $fallbackMessage, $status);

        return response()->json([
            'success' => false,
            'error_code' => 'DATABASE_CONNECTION_FAILED',
            'message' => $message,
            'user_message' => $message,
            'details' => config('app.debug') ? $exception->getMessage() : null,
        ], $resolvedStatus);
    }

    public static function isMongoConnectivityError(Throwable $exception): bool
    {
        if (self::isMongoThrowable($exception)) {
            return true;
        }

        $message = strtolower($exception->getMessage());

        return str_contains($message, 'mongodb')
            || str_contains($message, 'tls handshake failed')
            || str_contains($message, 'serverselectiontryonce')
            || str_contains($message, 'no suitable servers found')
            || str_contains($message, 'server selection')
            || str_contains($message, 'ssl routines')
            || str_contains($message, 'failed to resolve')
            || str_contains($message, 'getaddrinfo')
            || str_contains($message, 'connection refused');
    }

    private static function resolveMongoMessage(Throwable $exception, ?string $fallbackMessage, ?int $status): array
    {
        $message = strtolower($exception->getMessage());
        $resolvedStatus = $status ?? 503;

        if (str_contains($message, 'authentication failed') || str_contains($message, 'bad auth')) {
            return [
                'Koneksi MongoDB ditolak. Periksa username, password, auth database, dan akses user database di MongoDB Atlas.',
                503,
            ];
        }

        if (
            str_contains($message, 'tls handshake failed')
            || str_contains($message, 'ssl routines')
            || str_contains($message, 'certificate')
        ) {
            return [
                'Database belum tersambung. Periksa konfigurasi MongoDB Atlas, TLS/CA certificate, dan Network Access/IP whitelist.',
                503,
            ];
        }

        if (
            str_contains($message, 'failed to resolve')
            || str_contains($message, 'getaddrinfo')
            || str_contains($message, 'dns')
        ) {
            return [
                'Host MongoDB Atlas tidak dapat di-resolve. Periksa DNS lokal, VPN/proxy, firewall, atau jaringan internet yang sedang dipakai.',
                503,
            ];
        }

        if (
            str_contains($message, 'serverselectiontryonce')
            || str_contains($message, 'no suitable servers found')
            || str_contains($message, 'server selection')
            || str_contains($message, 'timed out')
        ) {
            return [
                'Database sedang tidak dapat diakses. Periksa MongoDB Atlas Network Access, status cluster, dan kestabilan jaringan lokal.',
                503,
            ];
        }

        return [
            $fallbackMessage ?: 'Database sedang tidak dapat diakses. Periksa konfigurasi MongoDB Atlas atau coba lagi beberapa saat.',
            $resolvedStatus,
        ];
    }

    private static function isMongoThrowable(Throwable $exception): bool
    {
        $className = ltrim($exception::class, '\\');

        return str_starts_with($className, 'MongoDB\\')
            || str_contains($className, 'MongoDB');
    }
}
