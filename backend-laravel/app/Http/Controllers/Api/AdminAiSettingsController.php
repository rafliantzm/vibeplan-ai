<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AiSetting;
use App\Services\EnvFileService;
use App\Services\UserActivityLogger;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AdminAiSettingsController extends Controller
{
    public function __construct(
        private readonly EnvFileService $envFileService,
        private readonly UserActivityLogger $activityLogger,
    ) {
    }

    public function show(): JsonResponse
    {
        $settings = AiSetting::query()->orderByDesc('updated_at')->first();

        return response()->json([
            'success' => true,
            'data' => $settings,
        ]);
    }

    public function diagnostics(): JsonResponse
    {
        $runtimeApiKey = trim((string) config('services.ai.api_key'));
        $envApiKey = trim((string) $this->envFileService->readValue(base_path('.env'), 'AI_API_KEY'));

        return response()->json([
            'success' => true,
            'data' => [
                'provider' => (string) config('services.ai.provider'),
                'model' => (string) config('services.ai.model'),
                'base_url' => (string) config('services.ai.base_url'),
                'masked_runtime_api_key' => $runtimeApiKey !== '' ? $this->maskKey($runtimeApiKey) : null,
                'masked_env_api_key' => $envApiKey !== '' ? $this->maskKey($envApiKey) : null,
                'runtime_key_mismatch' => $runtimeApiKey !== '' && $envApiKey !== '' && hash_equals($runtimeApiKey, $envApiKey) === false,
            ],
        ]);
    }

    public function validateKey(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'provider' => ['required', 'in:groq,openrouter'],
            'api_key' => ['required', 'string', 'max:500'],
        ]);

        $result = $this->performValidationRequest($validated['provider'], $validated['api_key']);

        if (! $result['success']) {
            return response()->json([
                'success' => false,
                'error_code' => $result['error_code'],
                'message' => $result['message'],
            ], $result['status']);
        }

        return response()->json([
            'success' => true,
            'message' => 'API key valid dan siap digunakan.',
        ]);
    }

    public function updateKey(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'provider' => ['required', 'in:groq,openrouter'],
            'api_key' => ['required', 'string', 'max:500'],
        ]);

        $result = $this->performValidationRequest($validated['provider'], $validated['api_key']);

        if (! $result['success']) {
            return response()->json([
                'success' => false,
                'error_code' => $result['error_code'],
                'message' => $result['message'],
            ], $result['status']);
        }

        $providerConfig = $this->providerConfig($validated['provider']);

        // Writing to .env from API is only for local MVP. In production, use environment variables or secret manager.
        $this->envFileService->updateValue(base_path('.env'), 'AI_PROVIDER', $validated['provider']);
        $this->envFileService->updateValue(base_path('.env'), 'AI_BASE_URL', $providerConfig['base_url']);
        $this->envFileService->updateValue(base_path('.env'), 'AI_MODEL', $providerConfig['model']);
        $this->envFileService->updateValue(base_path('.env'), 'AI_API_KEY', $validated['api_key']);

        Artisan::call('optimize:clear');
        Artisan::call('config:clear');
        Artisan::call('cache:clear');

        config([
            'services.ai.provider' => $validated['provider'],
            'services.ai.base_url' => $providerConfig['base_url'],
            'services.ai.model' => $providerConfig['model'],
            'services.ai.api_key' => $validated['api_key'],
        ]);

        $setting = AiSetting::query()->orderByDesc('updated_at')->first() ?? new AiSetting();
        $setting->provider = $validated['provider'];
        $setting->masked_api_key = $this->maskKey($validated['api_key']);
        $setting->model = $providerConfig['model'];
        $setting->base_url = $providerConfig['base_url'];
        $setting->updated_by = (string) $request->user()->getKey();
        $setting->updated_at = now();
        $setting->save();

        $this->activityLogger->log(
            $request,
            'admin_updated_ai_settings',
            'Admin memperbarui pengaturan AI lokal.',
            [
                'provider' => $validated['provider'],
                'model' => $providerConfig['model'],
                'base_url' => $providerConfig['base_url'],
                'masked_api_key' => $setting->masked_api_key,
            ],
            $request->user(),
            $request->user(),
        );

        return response()->json([
            'success' => true,
            'message' => 'API key berhasil divalidasi dan diperbarui.',
            'data' => $setting,
        ]);
    }

    /**
     * @return array{success: bool, error_code?: string, message?: string, status?: int}
     */
    private function performValidationRequest(string $provider, string $apiKey): array
    {
        $providerConfig = $this->providerConfig($provider);
        $endpoint = $this->buildChatCompletionsUrl($providerConfig['base_url']);
        $model = $providerConfig['model'];
        $headers = [
            'Authorization' => 'Bearer '.$apiKey,
            'Content-Type' => 'application/json',
            'Accept' => 'application/json',
        ];

        try {
            Http::withHeaders($headers)
                ->timeout((int) config('services.ai.timeout', 60))
                ->post($endpoint, [
                    'model' => $model,
                    'messages' => [
                        ['role' => 'user', 'content' => 'ping'],
                    ],
                    'max_tokens' => 10,
                ])
                ->throw();

            return ['success' => true];
        } catch (ConnectionException $exception) {
            Log::warning('AI settings key validation connection failed.', [
                'provider' => $provider,
                'model' => $model,
                'endpoint' => $endpoint,
                'message' => $exception->getMessage(),
            ]);

            return [
                'success' => false,
                'error_code' => 'AI_PROVIDER_UNREACHABLE',
                'message' => 'Provider AI sedang tidak bisa dijangkau.',
                'status' => 503,
            ];
        } catch (RequestException $exception) {
            Log::warning('AI settings key validation failed.', [
                'provider' => $provider,
                'model' => $model,
                'endpoint' => $endpoint,
                'status' => $exception->response?->status(),
                'body' => $exception->response?->json(),
            ]);

            return $this->mapValidationFailure(
                (int) ($exception->response?->status() ?? 500),
                (string) (
                    data_get($exception->response?->json(), 'error.message')
                    ?? data_get($exception->response?->json(), 'message')
                    ?? $exception->getMessage()
                ),
            );
        }
    }

    /**
     * @return array{base_url: string, model: string}
     */
    private function providerConfig(string $provider): array
    {
        if ($provider === 'groq') {
            return [
                'base_url' => 'https://api.groq.com/openai/v1',
                'model' => 'llama-3.1-8b-instant',
            ];
        }

        return [
            'base_url' => rtrim((string) config('services.ai.base_url'), '/'),
            'model' => (string) config('services.ai.model'),
        ];
    }

    private function buildChatCompletionsUrl(string $baseUrl): string
    {
        $normalizedBaseUrl = rtrim($baseUrl, '/');

        if (str_ends_with($normalizedBaseUrl, '/chat/completions')) {
            return $normalizedBaseUrl;
        }

        return $normalizedBaseUrl.'/chat/completions';
    }

    /**
     * @return array{success: false, error_code: string, message: string, status: int}
     */
    private function mapValidationFailure(int $status, string $message): array
    {
        $normalizedMessage = strtolower($message);

        if ($this->isProviderLimitError($normalizedMessage)) {
            return [
                'success' => false,
                'error_code' => 'PROVIDER_LIMIT',
                'message' => 'Provider AI sedang terkena limit. Coba lagi nanti atau gunakan mode ringkas.',
                'status' => 429,
            ];
        }

        if (
            str_contains($normalizedMessage, 'model_not_found')
            || str_contains($normalizedMessage, 'model not found')
            || (
                str_contains($normalizedMessage, 'model')
                && (
                    str_contains($normalizedMessage, 'not allowed')
                    || str_contains($normalizedMessage, 'not permitted')
                    || str_contains($normalizedMessage, 'does not have access')
                    || str_contains($normalizedMessage, 'permission')
                )
            )
        ) {
            return [
                'success' => false,
                'error_code' => 'MODEL_NOT_ALLOWED',
                'message' => 'API key valid, tetapi model tidak diizinkan pada project Groq ini.',
                'status' => 403,
            ];
        }

        if (in_array($status, [401, 403], true)) {
            return [
                'success' => false,
                'error_code' => 'AI_KEY_INVALID',
                'message' => 'API key tidak valid atau tidak memiliki akses model.',
                'status' => $status,
            ];
        }

        return [
            'success' => false,
            'error_code' => 'AI_PROVIDER_UNREACHABLE',
            'message' => 'Provider AI sedang tidak bisa dijangkau.',
            'status' => 503,
        ];
    }

    private function isProviderLimitError(string $normalizedMessage): bool
    {
        foreach ([
            'rate_limit',
            'rate limit',
            'tokens per minute',
            'tpm',
            'requests per minute',
            'rpm',
            'request too large',
            'rate limit exceeded',
            'limit 6000',
            'reduce your message size',
        ] as $keyword) {
            if (str_contains($normalizedMessage, $keyword)) {
                return true;
            }
        }

        return false;
    }

    private function maskKey(string $apiKey): string
    {
        $length = strlen($apiKey);

        if ($length <= 8) {
            return str_repeat('*', max($length, 4));
        }

        return substr($apiKey, 0, 6).'...'.substr($apiKey, -4);
    }
}
