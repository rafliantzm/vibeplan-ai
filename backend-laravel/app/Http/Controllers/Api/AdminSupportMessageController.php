<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AdminSupportMessage;
use App\Models\AuthToken;
use App\Models\User;
use App\Services\UserActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class AdminSupportMessageController extends Controller
{
    private const SUPPORT_MESSAGE_MAX = 2000;

    public function __construct(
        private readonly UserActivityLogger $activityLogger,
    ) {
    }

    public function store(Request $request): JsonResponse
    {
        $authenticatedUser = $this->resolveAuthenticatedUser($request);
        $rules = [
            'message' => ['required', 'string', 'max:'.self::SUPPORT_MESSAGE_MAX],
        ];

        if (! $authenticatedUser) {
            $rules['name'] = ['required', 'string', 'max:100'];
            $rules['email'] = ['required', 'email', 'max:150'];
        }

        $validated = $request->validate($rules, $this->supportMessageValidationMessages('message'));

        $message = AdminSupportMessage::query()->create([
            'user_id' => $authenticatedUser ? (string) $authenticatedUser->getKey() : null,
            'name' => $authenticatedUser ? (string) $authenticatedUser->name : trim((string) $validated['name']),
            'email' => $authenticatedUser ? strtolower((string) $authenticatedUser->email) : strtolower((string) $validated['email']),
            'message' => trim((string) $validated['message']),
            'status' => 'open',
            'admin_reply' => null,
            'replied_by' => null,
            'replied_at' => null,
        ]);

        $this->activityLogger->log(
            $request,
            'support_message_created',
            'Pesan bantuan baru dikirim ke admin.',
            [
                'support_message_id' => (string) $message->getKey(),
                'status' => 'open',
                'sender_type' => $authenticatedUser ? 'user' : 'guest',
            ],
            $authenticatedUser,
            $authenticatedUser,
        );

        return response()->json([
            'success' => true,
            'message' => 'Pesan berhasil dikirim ke admin.',
        ], 201);
    }

    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['nullable', 'in:open,replied,closed'],
            'search' => ['nullable', 'string', 'max:200'],
        ]);

        $query = AdminSupportMessage::query()
            ->with(['user', 'repliedByAdmin'])
            ->orderByDesc('created_at');

        if (! empty($validated['status'])) {
            $query->where('status', $validated['status']);
        }

        if (! empty($validated['search'])) {
            $search = trim((string) $validated['search']);
            $query->where(function ($subQuery) use ($search): void {
                $subQuery->where('name', 'like', '%'.$search.'%')
                    ->orWhere('email', 'like', '%'.$search.'%')
                    ->orWhere('message', 'like', '%'.$search.'%')
                    ->orWhere('admin_reply', 'like', '%'.$search.'%');
            });
        }

        $messages = $query->get()->map(fn (AdminSupportMessage $message) => $this->messagePayload($message))->values();

        return response()->json([
            'success' => true,
            'data' => $messages,
        ]);
    }

    public function show(string $id): JsonResponse
    {
        $message = AdminSupportMessage::query()->with(['user', 'repliedByAdmin'])->find($id);

        if (! $message) {
            return response()->json([
                'success' => false,
                'message' => 'Pesan support tidak ditemukan.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $this->messagePayload($message),
        ]);
    }

    public function reply(Request $request, string $id): JsonResponse
    {
        $admin = $request->user();
        $message = AdminSupportMessage::query()->with(['user', 'repliedByAdmin'])->find($id);

        if (! $message) {
            return response()->json([
                'success' => false,
                'message' => 'Pesan support tidak ditemukan.',
            ], 404);
        }

        $validated = $request->validate([
            'admin_reply' => ['required', 'string', 'max:'.self::SUPPORT_MESSAGE_MAX],
        ], $this->supportMessageValidationMessages('admin_reply'));

        $message->admin_reply = trim((string) $validated['admin_reply']);
        $message->status = 'replied';
        $message->replied_by = $admin ? (string) $admin->getKey() : null;
        $message->replied_at = Carbon::now();
        $message->save();

        $this->activityLogger->log(
            $request,
            'support_message_replied',
            'Admin menyimpan balasan untuk pesan bantuan.',
            [
                'support_message_id' => (string) $message->getKey(),
                'status' => 'replied',
            ],
            $admin,
            $message->user,
        );

        return response()->json([
            'success' => true,
            'message' => 'Balasan admin berhasil disimpan.',
            'data' => $this->messagePayload($message->fresh(['user', 'repliedByAdmin'])),
        ]);
    }

    public function close(Request $request, string $id): JsonResponse
    {
        $admin = $request->user();
        $message = AdminSupportMessage::query()->with(['user', 'repliedByAdmin'])->find($id);

        if (! $message) {
            return response()->json([
                'success' => false,
                'message' => 'Pesan support tidak ditemukan.',
            ], 404);
        }

        $message->status = 'closed';
        $message->save();

        $this->activityLogger->log(
            $request,
            'support_message_closed',
            'Admin menutup pesan bantuan.',
            [
                'support_message_id' => (string) $message->getKey(),
                'status' => 'closed',
            ],
            $admin,
            $message->user,
        );

        return response()->json([
            'success' => true,
            'message' => 'Pesan bantuan berhasil ditutup.',
            'data' => $this->messagePayload($message->fresh(['user', 'repliedByAdmin'])),
        ]);
    }

    private function resolveAuthenticatedUser(Request $request): ?User
    {
        $plainToken = $request->bearerToken();

        if (! $plainToken) {
            return null;
        }

        $token = AuthToken::query()
            ->with('user')
            ->where('token_hash', hash('sha256', $plainToken))
            ->first();

        if (! $token || ! $token->user || ($token->expires_at && $token->expires_at->isPast())) {
            return null;
        }

        if ((string) $token->user->status === 'blocked') {
            return null;
        }

        return $token->user;
    }

    /**
     * @return array<string, mixed>
     */
    private function messagePayload(AdminSupportMessage $message): array
    {
        return [
            'id' => (string) $message->getKey(),
            'user_id' => $message->user_id,
            'name' => (string) $message->name,
            'email' => (string) $message->email,
            'message' => (string) $message->message,
            'status' => (string) $message->status,
            'admin_reply' => $message->admin_reply ? (string) $message->admin_reply : null,
            'replied_by' => $message->replied_by,
            'replied_at' => $message->replied_at?->toIso8601String(),
            'created_at' => $message->created_at?->toIso8601String(),
            'updated_at' => $message->updated_at?->toIso8601String(),
            'user' => $message->user ? [
                'id' => (string) $message->user->getKey(),
                'name' => (string) $message->user->name,
                'email' => (string) $message->user->email,
                'role' => (string) ($message->user->role ?? 'user'),
            ] : null,
            'replied_by_admin' => $message->repliedByAdmin ? [
                'id' => (string) $message->repliedByAdmin->getKey(),
                'name' => (string) $message->repliedByAdmin->name,
                'email' => (string) $message->repliedByAdmin->email,
            ] : null,
        ];
    }

    /**
     * @return array<string, string>
     */
    private function supportMessageValidationMessages(string $field): array
    {
        return [
            "{$field}.required" => 'Pesan wajib diisi.',
            "{$field}.string" => 'Pesan harus berupa teks.',
            "{$field}.max" => 'Pesan terlalu panjang. Ringkas pesan maksimal 2000 karakter.',
        ];
    }
}
