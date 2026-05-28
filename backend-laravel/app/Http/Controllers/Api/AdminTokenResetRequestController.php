<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TokenResetRequest;
use App\Models\User;
use App\Services\UserActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

class AdminTokenResetRequestController extends Controller
{
    public function __construct(
        private readonly UserActivityLogger $activityLogger,
    ) {
    }

    public function index(): JsonResponse
    {
        $requests = TokenResetRequest::query()
            ->with('user')
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $requests,
        ]);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['required', 'in:approved,rejected'],
            'admin_note' => ['nullable', 'string', 'max:1000'],
            'token_amount' => ['nullable', 'integer', 'min:1'],
        ]);

        $tokenRequest = TokenResetRequest::query()->with('user')->find($id);

        if (! $tokenRequest || ! $tokenRequest->user) {
            throw new RuntimeException('Permintaan reset token tidak ditemukan.');
        }

        $tokenRequest->status = $validated['status'];
        $tokenRequest->admin_note = $validated['admin_note'] ?? null;
        $tokenRequest->save();

        if ($validated['status'] === 'approved') {
            $tokenAmount = (int) ($validated['token_amount'] ?? 10);
            /** @var User $user */
            $user = $tokenRequest->user;
            $previousTokenBalance = (int) $user->token_balance;
            $user->token_balance = (int) $user->token_balance + $tokenAmount;
            $user->save();

            $this->activityLogger->log(
                $request,
                'admin_approved_token_request',
                'Admin menyetujui permintaan reset token user.',
                [
                    'request_id' => (string) $tokenRequest->getKey(),
                    'token_amount' => $tokenAmount,
                    'old_token_balance' => $previousTokenBalance,
                    'new_token_balance' => (int) $user->token_balance,
                    'admin_note' => $tokenRequest->admin_note,
                ],
                $request->user(),
                $user,
            );
        } else {
            $this->activityLogger->log(
                $request,
                'admin_rejected_token_request',
                'Admin menolak permintaan reset token user.',
                [
                    'request_id' => (string) $tokenRequest->getKey(),
                    'admin_note' => $tokenRequest->admin_note,
                ],
                $request->user(),
                $tokenRequest->user,
            );
        }

        return response()->json([
            'success' => true,
            'message' => 'Permintaan reset token berhasil diperbarui.',
            'data' => $tokenRequest->fresh('user'),
        ]);
    }
}
