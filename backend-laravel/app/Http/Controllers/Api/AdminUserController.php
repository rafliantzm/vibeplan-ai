<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\UserActivityLog;
use App\Services\UserActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AdminUserController extends Controller
{
    public function __construct(
        private readonly UserActivityLogger $activityLogger,
    ) {
    }

    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:150'],
            'role' => ['nullable', 'in:user,admin'],
            'status' => ['nullable', 'in:active,blocked'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:50'],
        ]);

        $query = User::query()->orderByDesc('created_at');

        if (! empty($validated['search'])) {
            $search = trim((string) $validated['search']);
            $query->where(function ($subQuery) use ($search): void {
                $subQuery->where('name', 'like', '%'.$search.'%')
                    ->orWhere('email', 'like', '%'.$search.'%');
            });
        }

        if (! empty($validated['role'])) {
            $query->where('role', $validated['role']);
        }

        if (! empty($validated['status'])) {
            $query->where('status', $validated['status']);
        }

        $users = $query->paginate((int) ($validated['per_page'] ?? 10));
        $users->setCollection($users->getCollection()->map(fn (User $user) => $this->userPayload($user)));

        return response()->json([
            'success' => true,
            'data' => $users->items(),
            'meta' => [
                'current_page' => $users->currentPage(),
                'last_page' => $users->lastPage(),
                'per_page' => $users->perPage(),
                'total' => $users->total(),
            ],
        ]);
    }

    public function show(string $id): JsonResponse
    {
        $user = User::query()->find($id);

        if (! $user) {
            return response()->json([
                'success' => false,
                'message' => 'User tidak ditemukan.',
            ], 404);
        }

        $recentLogs = UserActivityLog::query()
            ->where('target_user_id', (string) $user->getKey())
            ->orWhere('user_id', (string) $user->getKey())
            ->orderByDesc('created_at')
            ->limit(5)
            ->get()
            ->map(fn (UserActivityLog $log) => [
                'action' => $log->action,
                'description' => $log->description,
                'created_at' => $log->created_at?->toIso8601String(),
            ])
            ->values();

        return response()->json([
            'success' => true,
            'data' => array_merge(
                $this->userPayload($user),
                ['recent_activity_summary' => $recentLogs],
            ),
        ]);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $admin = $request->user();
        $user = User::query()->find($id);

        if (! $user) {
            return response()->json([
                'success' => false,
                'message' => 'User tidak ditemukan.',
            ], 404);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'email' => ['required', 'email', 'max:150'],
            'role' => ['required', 'in:user,admin'],
            'status' => ['required', 'in:active,blocked'],
        ]);

        $email = strtolower($validated['email']);
        $emailExists = User::query()
            ->where('email', $email)
            ->where('_id', '!=', $user->getKey())
            ->exists();

        if ($emailExists) {
            return response()->json([
                'success' => false,
                'message' => 'Email sudah digunakan oleh user lain.',
            ], 422);
        }

        $original = [
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'status' => $user->status,
        ];

        $user->fill([
            'name' => $validated['name'],
            'email' => $email,
            'role' => $validated['role'],
            'status' => $validated['status'],
        ]);
        $user->save();

        $this->activityLogger->log(
            $request,
            'admin_updated_user_profile',
            'Admin memperbarui profil user.',
            [
                'before' => $original,
                'after' => [
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role,
                    'status' => $user->status,
                ],
            ],
            $admin,
            $user,
        );

        return response()->json([
            'success' => true,
            'message' => 'Profil user berhasil diperbarui.',
            'data' => $this->userPayload($user->fresh()),
        ]);
    }

    public function resetPassword(Request $request, string $id): JsonResponse
    {
        $admin = $request->user();
        $user = User::query()->find($id);

        if (! $user) {
            return response()->json([
                'success' => false,
                'message' => 'User tidak ditemukan.',
            ], 404);
        }

        $validated = $request->validate([
            'new_password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $user->password_hash = Hash::make($validated['new_password']);
        $user->save();

        $this->activityLogger->log(
            $request,
            'admin_reset_user_password',
            'Admin mereset password user.',
            [],
            $admin,
            $user,
        );

        return response()->json([
            'success' => true,
            'message' => 'Password user berhasil direset.',
        ]);
    }

    public function updateTokens(Request $request, string $id): JsonResponse
    {
        $admin = $request->user();
        $user = User::query()->find($id);

        if (! $user) {
            return response()->json([
                'success' => false,
                'message' => 'User tidak ditemukan.',
            ], 404);
        }

        $validated = $request->validate([
            'token_balance' => ['required', 'integer', 'min:0'],
            'reason' => ['nullable', 'string', 'max:1000'],
        ]);

        $oldTokenBalance = (int) $user->token_balance;
        $user->token_balance = (int) $validated['token_balance'];
        $user->save();

        $this->activityLogger->log(
            $request,
            'admin_updated_user_tokens',
            'Admin memperbarui token balance user.',
            [
                'reason' => $validated['reason'] ?? null,
                'old_token_balance' => $oldTokenBalance,
                'new_token_balance' => (int) $user->token_balance,
            ],
            $admin,
            $user,
        );

        return response()->json([
            'success' => true,
            'message' => 'Token user berhasil diperbarui.',
            'data' => $this->userPayload($user->fresh()),
        ]);
    }

    public function logs(string $id): JsonResponse
    {
        $user = User::query()->find($id);

        if (! $user) {
            return response()->json([
                'success' => false,
                'message' => 'User tidak ditemukan.',
            ], 404);
        }

        $logs = UserActivityLog::query()
            ->where(function ($query) use ($user): void {
                $query->where('target_user_id', (string) $user->getKey())
                    ->orWhere('user_id', (string) $user->getKey());
            })
            ->orderByDesc('created_at')
            ->limit(50)
            ->get()
            ->map(function (UserActivityLog $log): array {
                return [
                    'id' => (string) $log->getKey(),
                    'action' => $log->action,
                    'description' => $log->description,
                    'metadata' => $log->metadata ?? [],
                    'created_at' => $log->created_at?->toIso8601String(),
                    'performed_by' => $log->performed_by,
                    'target_user_id' => $log->target_user_id,
                ];
            })
            ->values();

        return response()->json([
            'success' => true,
            'data' => $logs,
        ]);
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
            'role' => (string) ($user?->role ?? 'user'),
            'token_balance' => (int) ($user?->token_balance ?? 0),
            'status' => (string) ($user?->status ?? 'active'),
            'created_at' => $user?->created_at?->toIso8601String(),
            'updated_at' => $user?->updated_at?->toIso8601String(),
        ];
    }
}
