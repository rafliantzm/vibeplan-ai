<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\AiProviderException;
use App\Exceptions\TokenLimitExceededException;
use App\Http\Controllers\Controller;
use App\Services\AiService;
use Illuminate\Http\JsonResponse;
use Throwable;

class AiHealthController extends Controller
{
    public function __construct(
        private readonly AiService $aiService,
    ) {
    }

    public function show(): JsonResponse
    {
        try {
            $result = $this->aiService->healthCheck();

            return response()->json([
                'success' => true,
                'provider' => $result['provider'],
                'model' => $result['model'],
                'message' => $result['message'],
            ]);
        } catch (TokenLimitExceededException $exception) {
            report($exception);

            return response()->json([
                'success' => false,
                'error_code' => 'PROVIDER_LIMIT',
                'message' => 'Provider AI sedang terkena limit.',
                'user_message' => 'Provider AI sedang terkena limit. Coba provider fallback, mode ringkas, atau ulangi beberapa saat lagi.',
                'details' => config('app.debug') ? $exception->rawProviderMessage() : null,
            ], 429);
        } catch (AiProviderException $exception) {
            report($exception);

            return response()->json([
                'success' => false,
                'error_code' => $exception->errorCode(),
                'message' => $exception->getMessage(),
                'user_message' => $exception->userMessage() ?? $exception->getMessage(),
                'details' => config('app.debug')
                    ? ($exception->rawProviderMessage() ?? $exception->getMessage())
                    : null,
            ], $exception->status());
        } catch (Throwable $exception) {
            report($exception);

            return response()->json([
                'success' => false,
                'error_code' => 'AI_PROVIDER_UNREACHABLE',
                'message' => 'Provider AI sedang tidak bisa dijangkau.',
                'user_message' => 'Provider AI sedang tidak bisa dijangkau. Periksa konfigurasi backend atau gunakan provider fallback.',
                'details' => config('app.debug') ? $exception->getMessage() : null,
            ], 503);
        }
    }
}
