<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuthToken;
use App\Models\SupportChatMessage;
use App\Models\SupportConversation;
use App\Models\User;
use App\Services\UserActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class SupportChatController extends Controller
{
    private const ACTIVE_STATUSES = ['open', 'waiting_admin', 'waiting_user'];
    private const SUPPORT_MESSAGE_MAX = 2000;

    public function __construct(
        private readonly UserActivityLogger $activityLogger,
    ) {
    }

    public function storeConversation(Request $request): JsonResponse
    {
        $authenticatedUser = $this->resolveAuthenticatedUser($request);
        $rules = [
            'message' => ['required', 'string', 'max:'.self::SUPPORT_MESSAGE_MAX],
        ];

        if ($authenticatedUser) {
            $senderType = 'user';
        } else {
            $senderType = 'guest';
            $rules['guest_session_id'] = ['required', 'string', 'max:150'];
            $rules['name'] = ['required', 'string', 'max:100'];
            $rules['email'] = ['required', 'email', 'max:150'];
        }

        $validated = $request->validate($rules, $this->supportMessageValidationMessages());
        $messageContent = trim((string) $validated['message']);

        $conversation = $this->findReusableConversation(
            $authenticatedUser,
            $validated['guest_session_id'] ?? null,
        );

        if (! $conversation) {
            $conversation = SupportConversation::query()->create([
                'user_id' => $authenticatedUser ? (string) $authenticatedUser->getKey() : null,
                'guest_session_id' => $authenticatedUser ? null : (string) $validated['guest_session_id'],
                'name' => $authenticatedUser ? (string) $authenticatedUser->name : trim((string) $validated['name']),
                'email' => $authenticatedUser ? strtolower((string) $authenticatedUser->email) : strtolower((string) $validated['email']),
                'status' => 'open',
                'last_message' => '',
                'last_message_at' => Carbon::now(),
                'unread_for_admin' => 0,
                'unread_for_user' => 0,
            ]);
        } else {
            $conversation->name = $authenticatedUser ? (string) $authenticatedUser->name : trim((string) $validated['name']);
            $conversation->email = $authenticatedUser ? strtolower((string) $authenticatedUser->email) : strtolower((string) $validated['email']);
            $conversation->save();
        }

        $this->appendMessage(
            $conversation,
            $senderType,
            $authenticatedUser ? (string) $authenticatedUser->getKey() : null,
            $conversation->name,
            $messageContent,
        );

        $this->activityLogger->log(
            $request,
            'support_conversation_started',
            'Percakapan support dibuat atau digunakan kembali.',
            [
                'conversation_id' => (string) $conversation->getKey(),
                'sender_type' => $senderType,
                'status' => 'waiting_admin',
            ],
            $authenticatedUser,
            $authenticatedUser,
        );

        return response()->json([
            'success' => true,
            'data' => $this->conversationData((string) $conversation->getKey()),
        ], 201);
    }

    public function getConversationMessages(Request $request, string $id): JsonResponse
    {
        $conversation = SupportConversation::query()->find($id);

        if (! $conversation) {
            return response()->json([
                'success' => false,
                'message' => 'Percakapan support tidak ditemukan.',
            ], 404);
        }

        $authenticatedUser = $this->resolveAuthenticatedUser($request);
        $guestSessionId = (string) $request->query('guest_session_id', '');

        if (! $this->canAccessConversation($conversation, $authenticatedUser, $guestSessionId)) {
            return response()->json([
                'success' => false,
                'message' => 'Akses percakapan tidak valid.',
            ], 403);
        }

        $this->markConversationReadForUser($conversation);

        return response()->json([
            'success' => true,
            'data' => $this->conversationData((string) $conversation->getKey()),
        ]);
    }

    public function postConversationMessage(Request $request, string $id): JsonResponse
    {
        $conversation = SupportConversation::query()->find($id);

        if (! $conversation) {
            return response()->json([
                'success' => false,
                'message' => 'Percakapan support tidak ditemukan.',
            ], 404);
        }

        $authenticatedUser = $this->resolveAuthenticatedUser($request);
        $rules = [
            'message' => ['required', 'string', 'max:'.self::SUPPORT_MESSAGE_MAX],
        ];

        if (! $authenticatedUser) {
            $rules['guest_session_id'] = ['required', 'string', 'max:150'];
        }

        $validated = $request->validate($rules, $this->supportMessageValidationMessages());
        $guestSessionId = (string) ($validated['guest_session_id'] ?? '');

        if (! $this->canAccessConversation($conversation, $authenticatedUser, $guestSessionId)) {
            return response()->json([
                'success' => false,
                'message' => 'Akses percakapan tidak valid.',
            ], 403);
        }

        if ((string) $conversation->status === 'closed') {
            return response()->json([
                'success' => false,
                'message' => 'Percakapan ini sudah ditutup. Mulai percakapan baru jika masih butuh bantuan.',
            ], 422);
        }

        $senderType = $authenticatedUser ? 'user' : 'guest';
        $senderName = $authenticatedUser ? (string) $authenticatedUser->name : (string) $conversation->name;

        $this->appendMessage(
            $conversation,
            $senderType,
            $authenticatedUser ? (string) $authenticatedUser->getKey() : null,
            $senderName,
            trim((string) $validated['message']),
        );

        $this->activityLogger->log(
            $request,
            'support_message_sent',
            'User atau guest mengirim pesan baru ke percakapan support.',
            [
                'conversation_id' => (string) $conversation->getKey(),
                'sender_type' => $senderType,
                'status' => 'waiting_admin',
            ],
            $authenticatedUser,
            $authenticatedUser,
        );

        return response()->json([
            'success' => true,
            'message' => 'Pesan terkirim.',
            'data' => $this->conversationData((string) $conversation->getKey()),
        ]);
    }

    public function adminIndex(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['nullable', 'in:open,waiting_admin,waiting_user,closed'],
            'search' => ['nullable', 'string', 'max:200'],
        ]);

        $query = SupportConversation::query()->orderByDesc('last_message_at');

        if (! empty($validated['status'])) {
            $query->where('status', $validated['status']);
        }

        if (! empty($validated['search'])) {
            $search = trim((string) $validated['search']);
            $query->where(function ($subQuery) use ($search): void {
                $subQuery->where('name', 'like', '%'.$search.'%')
                    ->orWhere('email', 'like', '%'.$search.'%')
                    ->orWhere('last_message', 'like', '%'.$search.'%');
            });
        }

        $conversations = $query->get()
            ->map(fn (SupportConversation $conversation) => $this->conversationPayload($conversation))
            ->values();

        return response()->json([
            'success' => true,
            'data' => $conversations,
        ]);
    }

    public function adminShow(string $id): JsonResponse
    {
        $conversation = SupportConversation::query()->find($id);

        if (! $conversation) {
            return response()->json([
                'success' => false,
                'message' => 'Percakapan support tidak ditemukan.',
            ], 404);
        }

        $this->markConversationReadForAdmin($conversation);

        return response()->json([
            'success' => true,
            'data' => $this->conversationData((string) $conversation->getKey()),
        ]);
    }

    public function adminPostMessage(Request $request, string $id): JsonResponse
    {
        $conversation = SupportConversation::query()->find($id);
        $admin = $request->user();

        if (! $conversation) {
            return response()->json([
                'success' => false,
                'message' => 'Percakapan support tidak ditemukan.',
            ], 404);
        }

        if ((string) $conversation->status === 'closed') {
            return response()->json([
                'success' => false,
                'message' => 'Percakapan ini sudah ditutup. Buka kembali sebelum membalas.',
            ], 422);
        }

        $validated = $request->validate([
            'message' => ['required', 'string', 'max:'.self::SUPPORT_MESSAGE_MAX],
        ], $this->supportMessageValidationMessages());

        $this->appendMessage(
            $conversation,
            'admin',
            $admin ? (string) $admin->getKey() : null,
            $admin ? (string) $admin->name : 'Admin',
            trim((string) $validated['message']),
        );

        $this->activityLogger->log(
            $request,
            'support_admin_replied',
            'Admin mengirim balasan ke percakapan support.',
            [
                'conversation_id' => (string) $conversation->getKey(),
                'status' => 'waiting_user',
            ],
            $admin,
            $conversation->user,
        );

        return response()->json([
            'success' => true,
            'message' => 'Pesan admin berhasil dikirim.',
            'data' => $this->conversationData((string) $conversation->getKey()),
        ]);
    }

    public function adminDestroy(Request $request, string $id): JsonResponse
    {
        $conversation = SupportConversation::query()->find($id);
        $admin = $request->user();

        if (! $conversation) {
            return response()->json([
                'success' => false,
                'message' => 'Percakapan support tidak ditemukan.',
            ], 404);
        }

        SupportChatMessage::query()
            ->where('conversation_id', (string) $conversation->getKey())
            ->delete();

        $conversation->delete();

        $this->activityLogger->log(
            $request,
            'support_conversation_deleted',
            'Admin menghapus percakapan support beserta seluruh pesan di dalamnya.',
            [
                'conversation_id' => (string) $id,
            ],
            $admin,
            $conversation->user,
        );

        return response()->json([
            'success' => true,
            'message' => 'Percakapan berhasil dihapus.',
        ]);
    }

    public function adminDestroyMessage(Request $request, string $id, string $messageId): JsonResponse
    {
        $conversation = SupportConversation::query()->find($id);
        $admin = $request->user();

        if (! $conversation) {
            return response()->json([
                'success' => false,
                'message' => 'Percakapan support tidak ditemukan.',
            ], 404);
        }

        $message = SupportChatMessage::query()
            ->where('conversation_id', (string) $conversation->getKey())
            ->find($messageId);

        if (! $message) {
            return response()->json([
                'success' => false,
                'message' => 'Pesan support tidak ditemukan.',
            ], 404);
        }

        $message->delete();
        $this->refreshConversationSummary($conversation);

        $this->activityLogger->log(
            $request,
            'support_message_deleted',
            'Admin menghapus satu pesan dari percakapan support.',
            [
                'conversation_id' => (string) $id,
                'message_id' => (string) $messageId,
            ],
            $admin,
            $conversation->user,
        );

        return response()->json([
            'success' => true,
            'message' => 'Pesan berhasil dihapus.',
            'data' => $this->conversationData((string) $conversation->getKey()),
        ]);
    }

    public function adminClose(Request $request, string $id): JsonResponse
    {
        $conversation = SupportConversation::query()->find($id);
        $admin = $request->user();

        if (! $conversation) {
            return response()->json([
                'success' => false,
                'message' => 'Percakapan support tidak ditemukan.',
            ], 404);
        }

        $conversation->status = 'closed';
        $conversation->save();

        $this->activityLogger->log(
            $request,
            'support_conversation_closed',
            'Admin menutup percakapan support.',
            [
                'conversation_id' => (string) $conversation->getKey(),
                'status' => 'closed',
            ],
            $admin,
            $conversation->user,
        );

        return response()->json([
            'success' => true,
            'message' => 'Percakapan berhasil ditutup.',
            'data' => $this->conversationData((string) $conversation->getKey()),
        ]);
    }

    public function adminReopen(Request $request, string $id): JsonResponse
    {
        $conversation = SupportConversation::query()->find($id);
        $admin = $request->user();

        if (! $conversation) {
            return response()->json([
                'success' => false,
                'message' => 'Percakapan support tidak ditemukan.',
            ], 404);
        }

        $conversation->status = 'open';
        $conversation->save();

        $this->activityLogger->log(
            $request,
            'support_conversation_reopened',
            'Admin membuka kembali percakapan support.',
            [
                'conversation_id' => (string) $conversation->getKey(),
                'status' => 'open',
            ],
            $admin,
            $conversation->user,
        );

        return response()->json([
            'success' => true,
            'message' => 'Percakapan berhasil dibuka kembali.',
            'data' => $this->conversationData((string) $conversation->getKey()),
        ]);
    }

    private function findReusableConversation(?User $authenticatedUser, ?string $guestSessionId): ?SupportConversation
    {
        $query = SupportConversation::query()
            ->whereIn('status', self::ACTIVE_STATUSES)
            ->orderByDesc('last_message_at');

        if ($authenticatedUser) {
            return $query->where('user_id', (string) $authenticatedUser->getKey())->first();
        }

        if ($guestSessionId) {
            return $query->where('guest_session_id', (string) $guestSessionId)->first();
        }

        return null;
    }

    private function appendMessage(
        SupportConversation $conversation,
        string $senderType,
        ?string $senderId,
        string $senderName,
        string $messageContent,
    ): SupportChatMessage {
        $timestamp = Carbon::now();

        $message = SupportChatMessage::query()->create([
            'conversation_id' => (string) $conversation->getKey(),
            'sender_type' => $senderType,
            'sender_id' => $senderId,
            'sender_name' => $senderName,
            'message' => $messageContent,
            'read_at' => null,
        ]);

        $conversation->last_message = $messageContent;
        $conversation->last_message_at = $timestamp;

        if ($senderType === 'admin') {
            $conversation->status = 'waiting_user';
            $conversation->unread_for_admin = 0;
            $conversation->unread_for_user = (int) $conversation->unread_for_user + 1;
        } else {
            $conversation->status = 'waiting_admin';
            $conversation->unread_for_user = 0;
            $conversation->unread_for_admin = (int) $conversation->unread_for_admin + 1;
        }

        $conversation->save();

        return $message;
    }

    private function canAccessConversation(
        SupportConversation $conversation,
        ?User $authenticatedUser,
        string $guestSessionId,
    ): bool {
        if ($authenticatedUser) {
            return (string) $conversation->user_id === (string) $authenticatedUser->getKey();
        }

        return $guestSessionId !== '' && (string) $conversation->guest_session_id === $guestSessionId;
    }

    private function markConversationReadForUser(SupportConversation $conversation): void
    {
        $timestamp = Carbon::now();

        SupportChatMessage::query()
            ->where('conversation_id', (string) $conversation->getKey())
            ->where('sender_type', 'admin')
            ->whereNull('read_at')
            ->update(['read_at' => $timestamp]);

        if ((int) $conversation->unread_for_user > 0) {
            $conversation->unread_for_user = 0;
            $conversation->save();
        }
    }

    private function markConversationReadForAdmin(SupportConversation $conversation): void
    {
        $timestamp = Carbon::now();

        SupportChatMessage::query()
            ->where('conversation_id', (string) $conversation->getKey())
            ->whereIn('sender_type', ['guest', 'user'])
            ->whereNull('read_at')
            ->update(['read_at' => $timestamp]);

        if ((int) $conversation->unread_for_admin > 0) {
            $conversation->unread_for_admin = 0;
            $conversation->save();
        }
    }

    private function refreshConversationSummary(SupportConversation $conversation): void
    {
        $conversationId = (string) $conversation->getKey();
        $latestMessage = SupportChatMessage::query()
            ->where('conversation_id', $conversationId)
            ->orderByDesc('created_at')
            ->first();

        $conversation->last_message = $latestMessage?->message ?? '';
        $conversation->last_message_at = $latestMessage?->created_at;
        $conversation->unread_for_admin = SupportChatMessage::query()
            ->where('conversation_id', $conversationId)
            ->whereIn('sender_type', ['guest', 'user'])
            ->whereNull('read_at')
            ->count();
        $conversation->unread_for_user = SupportChatMessage::query()
            ->where('conversation_id', $conversationId)
            ->where('sender_type', 'admin')
            ->whereNull('read_at')
            ->count();
        $conversation->save();
    }

    /**
     * @return array{conversation: array<string, mixed>, messages: array<int, array<string, mixed>>}
     */
    private function conversationData(string $conversationId): array
    {
        /** @var SupportConversation|null $conversation */
        $conversation = SupportConversation::query()->find($conversationId);

        $messages = SupportChatMessage::query()
            ->where('conversation_id', $conversationId)
            ->orderBy('created_at')
            ->get()
            ->map(fn (SupportChatMessage $message) => $this->messagePayload($message))
            ->values()
            ->all();

        return [
            'conversation' => $this->conversationPayload($conversation),
            'messages' => $messages,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function conversationPayload(?SupportConversation $conversation): array
    {
        return [
            'id' => (string) $conversation?->getKey(),
            'user_id' => $conversation?->user_id,
            'guest_session_id' => $conversation?->guest_session_id,
            'name' => (string) ($conversation?->name ?? ''),
            'email' => (string) ($conversation?->email ?? ''),
            'status' => (string) ($conversation?->status ?? 'open'),
            'last_message' => (string) ($conversation?->last_message ?? ''),
            'last_message_at' => $conversation?->last_message_at?->toIso8601String(),
            'unread_for_admin' => (int) ($conversation?->unread_for_admin ?? 0),
            'unread_for_user' => (int) ($conversation?->unread_for_user ?? 0),
            'created_at' => $conversation?->created_at?->toIso8601String(),
            'updated_at' => $conversation?->updated_at?->toIso8601String(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function messagePayload(SupportChatMessage $message): array
    {
        return [
            'id' => (string) $message->getKey(),
            'conversation_id' => (string) $message->conversation_id,
            'sender_type' => (string) $message->sender_type,
            'sender_id' => $message->sender_id,
            'sender_name' => (string) $message->sender_name,
            'message' => (string) $message->message,
            'created_at' => $message->created_at?->toIso8601String(),
            'updated_at' => $message->updated_at?->toIso8601String(),
            'read_at' => $message->read_at?->toIso8601String(),
        ];
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
     * @return array<string, string>
     */
    private function supportMessageValidationMessages(): array
    {
        return [
            'message.required' => 'Pesan wajib diisi.',
            'message.string' => 'Pesan harus berupa teks.',
            'message.max' => 'Pesan terlalu panjang. Ringkas pesan maksimal 2000 karakter.',
        ];
    }
}
