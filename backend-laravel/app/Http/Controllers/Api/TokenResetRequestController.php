<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TokenResetRequest;
use App\Services\UserActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TokenResetRequestController extends Controller
{
    public function __construct(
        private readonly UserActivityLogger $activityLogger,
    ) {
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'reason' => ['required', 'string', 'max:1000'],
        ]);

        $resetRequest = TokenResetRequest::query()->create([
            'user_id' => (string) $request->user()->getKey(),
            'reason' => $validated['reason'],
            'status' => 'pending',
            'admin_note' => null,
        ]);

        $this->activityLogger->log(
            $request,
            'token_reset_requested',
            'User mengajukan permintaan reset token.',
            ['reason' => $validated['reason'], 'request_id' => (string) $resetRequest->getKey()],
            $request->user(),
            $request->user(),
        );

        return response()->json([
            'success' => true,
            'message' => 'Permintaan reset token berhasil dikirim ke admin.',
            'data' => $resetRequest,
        ], 201);
    }

    public function mine(Request $request): JsonResponse
    {
        $requests = TokenResetRequest::query()
            ->where('user_id', (string) $request->user()->getKey())
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $requests,
        ]);
    }
}
