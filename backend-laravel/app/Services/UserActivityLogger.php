<?php

namespace App\Services;

use App\Models\User;
use App\Models\UserActivityLog;
use Illuminate\Http\Request;

class UserActivityLogger
{
    /**
     * @param  array<string, mixed>  $metadata
     */
    public function log(
        ?Request $request,
        string $action,
        string $description,
        array $metadata = [],
        ?User $performedBy = null,
        ?User $targetUser = null,
    ): void {
        $resolvedPerformedBy = $performedBy ?? $request?->user();
        $resolvedTargetUser = $targetUser ?? $resolvedPerformedBy;

        UserActivityLog::query()->create([
            'user_id' => $resolvedTargetUser ? (string) $resolvedTargetUser->getKey() : ($resolvedPerformedBy ? (string) $resolvedPerformedBy->getKey() : null),
            'performed_by' => $resolvedPerformedBy ? (string) $resolvedPerformedBy->getKey() : null,
            'target_user_id' => $resolvedTargetUser ? (string) $resolvedTargetUser->getKey() : null,
            'action' => $action,
            'description' => $description,
            'metadata' => $this->sanitizeMetadata($metadata),
            'ip_address' => $request?->ip(),
            'user_agent' => $request?->userAgent(),
        ]);
    }

    /**
     * @param  array<string, mixed>  $metadata
     * @return array<string, mixed>
     */
    private function sanitizeMetadata(array $metadata): array
    {
        $sanitized = [];

        foreach ($metadata as $key => $value) {
            $normalizedKey = strtolower((string) $key);

            if (in_array($normalizedKey, [
                'password',
                'password_hash',
                'current_password',
                'new_password',
                'new_password_confirmation',
                'api_key',
                'token',
                'token_hash',
                'secret',
                'auth_token',
            ], true)) {
                continue;
            }

            if (is_array($value)) {
                $sanitized[$key] = $this->sanitizeMetadata($value);

                continue;
            }

            $sanitized[$key] = $value;
        }

        return $sanitized;
    }
}
