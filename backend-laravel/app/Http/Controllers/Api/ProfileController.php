<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\UserActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ProfileController extends Controller
{
    public function __construct(
        private readonly UserActivityLogger $activityLogger,
    ) {
    }

    public function show(Request $request): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $this->profilePayload($request->user(), $request),
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $user = $request->user();
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'email' => ['required', 'email', 'max:150'],
        ]);

        $email = strtolower($validated['email']);
        $emailExists = User::query()
            ->where('email', $email)
            ->where('_id', '!=', $user->getKey())
            ->exists();

        if ($emailExists) {
            return response()->json([
                'success' => false,
                'message' => 'Email sudah digunakan oleh akun lain.',
            ], 422);
        }

        $user->fill([
            'name' => $validated['name'],
            'email' => $email,
        ]);
        $user->save();

        $this->activityLogger->log(
            $request,
            'profile_updated',
            'User memperbarui profil akun.',
            ['name' => $user->name, 'email' => $user->email],
            $user,
            $user,
        );

        return response()->json([
            'success' => true,
            'message' => 'Profil berhasil diperbarui.',
            'data' => $this->profilePayload($user->fresh(), $request),
        ]);
    }

    public function updateName(Request $request): JsonResponse
    {
        $user = $request->user();
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
        ]);

        $user->name = $validated['name'];
        $user->save();

        $this->activityLogger->log(
            $request,
            'profile_name_updated',
            'User memperbarui nama tampilan akun.',
            ['name' => $user->name],
            $user,
            $user,
        );

        return response()->json([
            'success' => true,
            'message' => 'Nama berhasil diperbarui.',
            'data' => $this->profilePayload($user->fresh(), $request),
        ]);
    }

    public function updateAvatar(Request $request): JsonResponse
    {
        $user = $request->user();
        $validated = $request->validate([
            'avatar' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
        ]);

        if (! empty($user->avatar_path) && Storage::disk('public')->exists($user->avatar_path)) {
            Storage::disk('public')->delete($user->avatar_path);
        }

        $file = $validated['avatar'];
        $safeFilename = Str::uuid()->toString().'.'.$file->getClientOriginalExtension();
        $path = $file->storeAs('avatars', $safeFilename, 'public');
        $relativeUrl = Storage::disk('public')->url($path);

        $user->avatar_path = $path;
        $user->avatar_url = $this->resolveAbsoluteUrl($request, $relativeUrl);
        $user->save();

        $this->activityLogger->log(
            $request,
            'profile_avatar_updated',
            'User memperbarui foto profil.',
            ['avatar_path' => $path],
            $user,
            $user,
        );

        return response()->json([
            'success' => true,
            'message' => 'Foto profil berhasil diperbarui.',
            'data' => $this->profilePayload($user->fresh(), $request),
        ]);
    }

    public function updatePassword(Request $request): JsonResponse
    {
        $user = $request->user();
        $validated = $request->validate([
            'current_password' => ['required', 'string'],
            'new_password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        if (! Hash::check($validated['current_password'], (string) $user->password_hash)) {
            return response()->json([
                'success' => false,
                'error_code' => 'CURRENT_PASSWORD_INVALID',
                'message' => 'Password lama tidak sesuai.',
            ], 422);
        }

        $user->password_hash = Hash::make($validated['new_password']);
        $user->save();

        $this->activityLogger->log(
            $request,
            'password_changed',
            'User mengganti password akun.',
            [],
            $user,
            $user,
        );

        return response()->json([
            'success' => true,
            'message' => 'Password berhasil diperbarui.',
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function profilePayload(?User $user, ?Request $request = null): array
    {
        return [
            'id' => (string) $user?->getKey(),
            'name' => (string) $user?->name,
            'email' => (string) $user?->email,
            'avatar_url' => $this->resolveAvatarUrl($user, $request),
            'role' => (string) ($user?->role ?? 'user'),
            'token_balance' => (int) ($user?->token_balance ?? 0),
            'status' => (string) ($user?->status ?? 'active'),
            'created_at' => $user?->created_at?->toIso8601String(),
            'updated_at' => $user?->updated_at?->toIso8601String(),
        ];
    }

    private function resolveAvatarUrl(?User $user, ?Request $request = null): ?string
    {
        $avatarUrl = trim((string) ($user?->avatar_url ?? ''));

        if ($avatarUrl === '' && ! empty($user?->avatar_path)) {
            $avatarUrl = Storage::disk('public')->url($user->avatar_path);
        }

        if ($avatarUrl === '') {
            return null;
        }

        if (Str::startsWith($avatarUrl, ['http://', 'https://'])) {
            return $avatarUrl;
        }

        return $this->resolveAbsoluteUrl($request, $avatarUrl);
    }

    private function resolveAbsoluteUrl(?Request $request, string $path): string
    {
        if (Str::startsWith($path, ['http://', 'https://'])) {
            return $path;
        }

        $normalizedPath = '/'.ltrim($path, '/');

        if ($request) {
            return rtrim($request->getSchemeAndHttpHost(), '/').$normalizedPath;
        }

        return rtrim((string) config('app.url'), '/').$normalizedPath;
    }
}
