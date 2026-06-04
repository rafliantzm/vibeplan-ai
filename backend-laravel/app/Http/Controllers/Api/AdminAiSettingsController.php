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
        $runtimeApiKey = trim((string) config('services.ai.api_key'));
        $runtimeFallbackModels = config('services.ai.fallback_models', []);

        return response()->json([
            'success' => true,
            'data' => [
                'provider' => (string) config('services.ai.provider'),
                'model' => (string) config('services.ai.model'),
                'fallback_models' => is_array($runtimeFallbackModels) ? array_values($runtimeFallbackModels) : [],
                'base_url' => (string) config('services.ai.base_url'),
                'masked_api_key' => $runtimeApiKey !== '' ? $this->maskKey($runtimeApiKey) : 'Belum ada',
                'updated_by' => $settings?->updated_by,
                'updated_at' => $settings?->updated_at,
            ],
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
                'fallback_models' => array_values((array) config('services.ai.fallback_models', [])),
                'base_url' => (string) config('services.ai.base_url'),
                'masked_runtime_api_key' => $runtimeApiKey !== '' ? $this->maskKey($runtimeApiKey) : null,
                'masked_env_api_key' => $envApiKey !== '' ? $this->maskKey($envApiKey) : null,
                'runtime_key_mismatch' => $runtimeApiKey !== '' && $envApiKey !== '' && hash_equals($runtimeApiKey, $envApiKey) === false,
            ],
        ]);
    }

    public function availableModels(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'provider' => ['required', 'in:groq,openrouter,gemini'],
            'api_key' => ['nullable', 'string', 'max:500'],
        ]);

        $provider = (string) $validated['provider'];
        $apiKey = trim((string) ($validated['api_key'] ?? '')) ?: trim((string) config('services.ai.api_key'));

        if ($provider === 'gemini') {
            if ($apiKey === '') {
                return response()->json([
                    'success' => false,
                    'error_code' => 'AI_KEY_INVALID',
                    'message' => 'API key belum tersedia. Masukkan API key Google AI Studio terlebih dahulu.',
                ], 422);
            }

            try {
                return response()->json([
                    'success' => true,
                    'data' => $this->fetchGeminiAvailableModels($apiKey),
                ]);
            } catch (\RuntimeException $exception) {
                return response()->json([
                    'success' => false,
                    'error_code' => str_contains(strtolower($exception->getMessage()), 'api key')
                        ? 'AI_KEY_INVALID'
                        : 'AI_PROVIDER_UNREACHABLE',
                    'message' => $exception->getMessage(),
                ], str_contains(strtolower($exception->getMessage()), 'api key') ? 422 : 503);
            }
        }

        return response()->json([
            'success' => true,
            'data' => $this->fallbackModelOptions($provider),
        ]);
    }

    public function validateKey(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'provider' => ['required', 'in:groq,openrouter,gemini'],
            'api_key' => ['nullable', 'string', 'max:500'],
            'primary_model' => ['nullable', 'string', 'max:120'],
            'fallback_models' => ['nullable', 'array'],
            'fallback_models.*' => ['nullable', 'string', 'max:120'],
        ]);

        $result = $this->performValidationRequest(
            $validated['provider'],
            trim((string) ($validated['api_key'] ?? '')) ?: trim((string) config('services.ai.api_key')),
            trim((string) ($validated['primary_model'] ?? '')),
            $this->normalizeFallbackModels($validated['fallback_models'] ?? [], trim((string) ($validated['primary_model'] ?? '')))
        );

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
            'provider' => ['required', 'in:groq,openrouter,gemini'],
            'api_key' => ['nullable', 'string', 'max:500'],
            'primary_model' => ['nullable', 'string', 'max:120'],
            'fallback_models' => ['nullable', 'array'],
            'fallback_models.*' => ['nullable', 'string', 'max:120'],
        ]);

        $effectiveApiKey = trim((string) ($validated['api_key'] ?? '')) ?: trim((string) config('services.ai.api_key'));
        $providerConfig = $this->providerConfig(
            $validated['provider'],
            trim((string) ($validated['primary_model'] ?? '')),
            $this->normalizeFallbackModels($validated['fallback_models'] ?? [], trim((string) ($validated['primary_model'] ?? '')))
        );

        $result = $this->performValidationRequest(
            $validated['provider'],
            $effectiveApiKey,
            $providerConfig['model'],
            $providerConfig['fallback_models']
        );

        if (! $result['success']) {
            return response()->json([
                'success' => false,
                'error_code' => $result['error_code'],
                'message' => $result['message'],
            ], $result['status']);
        }

        // Writing to .env from API is only for local MVP. In production, use environment variables or secret manager.
        $this->envFileService->updateValue(base_path('.env'), 'AI_PROVIDER', $validated['provider']);
        $this->envFileService->updateValue(base_path('.env'), 'AI_BASE_URL', $providerConfig['base_url']);
        $this->envFileService->updateValue(base_path('.env'), 'AI_MODEL', $providerConfig['model']);
        $this->envFileService->updateValue(base_path('.env'), 'AI_FALLBACK_MODEL', $providerConfig['fallback_models'][0] ?? '');
        $this->envFileService->updateValue(base_path('.env'), 'AI_FALLBACK_MODELS', implode(',', $providerConfig['fallback_models']));
        $this->envFileService->updateValue(base_path('.env'), 'AI_API_KEY', $effectiveApiKey);

        Artisan::call('optimize:clear');
        Artisan::call('config:clear');
        Artisan::call('cache:clear');

        config([
            'services.ai.provider' => $validated['provider'],
            'services.ai.base_url' => $providerConfig['base_url'],
            'services.ai.model' => $providerConfig['model'],
            'services.ai.fallback_model' => $providerConfig['fallback_models'][0] ?? '',
            'services.ai.fallback_models' => $providerConfig['fallback_models'],
            'services.ai.api_key' => $effectiveApiKey,
        ]);

        $setting = AiSetting::query()->orderByDesc('updated_at')->first() ?? new AiSetting();
        $setting->provider = $validated['provider'];
        $setting->masked_api_key = $this->maskKey($effectiveApiKey);
        $setting->model = $providerConfig['model'];
        $setting->fallback_models = $providerConfig['fallback_models'];
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
    private function performValidationRequest(string $provider, string $apiKey, string $primaryModel = '', array $fallbackModels = []): array
    {
        if ($apiKey === '') {
            return [
                'success' => false,
                'error_code' => 'AI_KEY_INVALID',
                'message' => 'API key belum tersedia. Masukkan API key Google AI Studio terlebih dahulu.',
                'status' => 422,
            ];
        }

        $providerConfig = $this->providerConfig($provider, $primaryModel, $fallbackModels);
        $model = $providerConfig['model'];

        if ($provider === 'gemini') {
            return $this->performGeminiValidationRequest(
                $providerConfig['base_url'],
                $model,
                $apiKey
            );
        }

        $endpoint = $this->buildChatCompletionsUrl($providerConfig['base_url']);
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
    private function providerConfig(string $provider, string $primaryModel = '', array $fallbackModels = []): array
    {
        if ($provider === 'groq') {
            return [
                'base_url' => 'https://api.groq.com/openai/v1',
                'model' => $primaryModel !== '' ? $primaryModel : 'llama-3.1-8b-instant',
                'fallback_models' => $fallbackModels,
            ];
        }

        if ($provider === 'openrouter') {
            return [
                'base_url' => rtrim((string) config('services.ai.base_url'), '/'),
                'model' => $primaryModel !== '' ? $primaryModel : (string) config('services.ai.model'),
                'fallback_models' => $fallbackModels,
            ];
        }

        return [
            'base_url' => 'https://generativelanguage.googleapis.com/v1beta',
            'model' => $primaryModel !== '' ? $primaryModel : (string) config('services.ai.model'),
            'fallback_models' => $fallbackModels,
        ];
    }

    /**
     * @return array{success: bool, error_code?: string, message?: string, status?: int}
     */
    private function performGeminiValidationRequest(string $baseUrl, string $model, string $apiKey): array
    {
        $endpoint = rtrim($baseUrl, '/')."/models/{$model}:generateContent";

        try {
            Http::withHeaders([
                'Content-Type' => 'application/json',
                'Accept' => 'application/json',
                'x-goog-api-key' => $apiKey,
            ])
                ->timeout((int) config('services.ai.timeout', 60))
                ->post($endpoint, [
                    'contents' => [[
                        'role' => 'user',
                        'parts' => [['text' => 'ping']],
                    ]],
                    'generationConfig' => [
                        'maxOutputTokens' => 8,
                        'temperature' => 0.1,
                        'thinkingConfig' => [
                            'thinkingBudget' => 0,
                        ],
                    ],
                ])
                ->throw();

            return ['success' => true];
        } catch (ConnectionException $exception) {
            Log::warning('AI settings Gemini validation connection failed.', [
                'provider' => 'gemini',
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
            Log::warning('AI settings Gemini validation failed.', [
                'provider' => 'gemini',
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
     * @return array<int, array{value: string, label: string, note: string}>
     */
    private function fetchGeminiAvailableModels(string $apiKey): array
    {
        $endpoint = 'https://generativelanguage.googleapis.com/v1beta/models';
        $models = [];
        $pageToken = null;

        do {
            try {
                $response = Http::withHeaders([
                    'Accept' => 'application/json',
                    'x-goog-api-key' => $apiKey,
                ])
                    ->timeout((int) config('services.ai.timeout', 60))
                    ->get($endpoint, array_filter([
                        'pageSize' => 100,
                        'pageToken' => $pageToken,
                    ]))
                    ->throw();
            } catch (ConnectionException $exception) {
                Log::warning('Failed to load Gemini model list.', [
                    'endpoint' => $endpoint,
                    'message' => $exception->getMessage(),
                ]);

                throw new \RuntimeException('Provider Google AI Studio sedang tidak bisa dijangkau saat memuat daftar model.');
            } catch (RequestException $exception) {
                $body = $exception->response?->json();
                $message = (string) (
                    data_get($body, 'error.message')
                    ?? data_get($body, 'message')
                    ?? $exception->getMessage()
                );

                Log::warning('Failed to load Gemini model list.', [
                    'endpoint' => $endpoint,
                    'status' => $exception->response?->status(),
                    'body' => $body,
                ]);

                if ($this->isApiKeyInvalidMessage($message)) {
                    throw new \RuntimeException('API key Google AI Studio tidak valid atau tidak bisa dipakai untuk memuat daftar model.');
                }

                throw new \RuntimeException('Gagal memuat daftar model dari Google AI Studio.');
            }

            $payload = $response->json();

            foreach ((array) data_get($payload, 'models', []) as $item) {
                $modelId = $this->extractGeminiModelId((string) data_get($item, 'name', ''));

                if ($modelId === '' || ! $this->isAllowedGeminiDocumentModel($modelId, (array) data_get($item, 'supportedGenerationMethods', []))) {
                    continue;
                }

                $models[$modelId] = [
                    'value' => $modelId,
                    'label' => (string) (data_get($item, 'displayName') ?: $this->humanizeModelId($modelId)),
                    'note' => $this->buildGeminiModelNote($modelId),
                    'recommended' => $this->isRecommendedGeminiModel($modelId),
                ];
            }

            $pageToken = data_get($payload, 'nextPageToken');
        } while (is_string($pageToken) && $pageToken !== '');

        $priority = array_flip([
            'gemini-2.5-flash',
            'gemini-2.5-flash-lite',
            'gemini-2.5-pro',
            'gemini-2.0-flash',
            'gemini-2.0-flash-lite',
            'gemini-flash-latest',
            'gemini-flash-lite-latest',
            'gemini-pro-latest',
            'gemma-4-31b-it',
            'gemma-4-26b-a4b-it',
        ]);

        uasort($models, static function (array $left, array $right) use ($priority): int {
            $leftPriority = $priority[$left['value']] ?? 999;
            $rightPriority = $priority[$right['value']] ?? 999;

            if ($leftPriority === $rightPriority) {
                return strcmp($left['label'], $right['label']);
            }

            return $leftPriority <=> $rightPriority;
        });

        return array_values($models);
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

        if ($this->isApiKeyInvalidMessage($message)) {
            return [
                'success' => false,
                'error_code' => 'AI_KEY_INVALID',
                'message' => 'API key tidak valid atau tidak memiliki akses model.',
                'status' => 422,
            ];
        }

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
                'message' => 'API key valid, tetapi model yang dipilih tidak diizinkan atau tidak tersedia untuk provider ini.',
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
            'message' => str_contains($normalizedMessage, 'high demand') || str_contains($normalizedMessage, 'temporarily unavailable')
                ? 'Model AI sedang sibuk karena traffic tinggi. Coba model fallback lain atau ulangi beberapa saat lagi.'
                : 'Provider AI sedang tidak bisa dijangkau.',
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

    /**
     * @param  array<int, mixed>  $fallbackModels
     * @return array<int, string>
     */
    private function normalizeFallbackModels(array $fallbackModels, string $primaryModel = ''): array
    {
        return array_values(array_unique(array_filter(array_map(
            static fn ($item): string => trim((string) $item),
            $fallbackModels
        ), static fn (string $item) => $item !== '' && $item !== $primaryModel)));
    }

    /**
     * @return array<int, array{value: string, label: string, note: string, recommended?: bool}>
     */
    private function fallbackModelOptions(string $provider): array
    {
        return match ($provider) {
            'groq' => [
                ['value' => 'llama-3.1-8b-instant', 'label' => 'Llama 3.1 8B Instant', 'note' => 'Cepat dan hemat biaya.'],
                ['value' => 'llama-3.3-70b-versatile', 'label' => 'Llama 3.3 70B Versatile', 'note' => 'Lebih kuat untuk reasoning umum.'],
                ['value' => 'deepseek-r1-distill-llama-70b', 'label' => 'DeepSeek R1 Distill Llama 70B', 'note' => 'Cocok untuk reasoning yang lebih dalam.'],
                ['value' => 'qwen/qwen3-32b', 'label' => 'Qwen 3 32B', 'note' => 'Alternatif model umum.'],
            ],
            'openrouter' => [
                ['value' => 'google/gemini-2.5-flash', 'label' => 'Google Gemini 2.5 Flash', 'note' => 'Cepat untuk tugas dokumen.'],
                ['value' => 'google/gemini-2.5-flash-lite', 'label' => 'Google Gemini 2.5 Flash Lite', 'note' => 'Fallback ringan.'],
                ['value' => 'anthropic/claude-3.5-sonnet', 'label' => 'Claude 3.5 Sonnet', 'note' => 'Analisis dan penulisan kuat.'],
                ['value' => 'openai/gpt-4o-mini', 'label' => 'GPT-4o Mini', 'note' => 'Alternatif cepat dan stabil.'],
            ],
            default => [],
        };
    }

    private function extractGeminiModelId(string $rawName): string
    {
        return trim(str_starts_with($rawName, 'models/') ? substr($rawName, 7) : $rawName);
    }

    /**
     * @param  array<int, mixed>  $supportedMethods
     */
    private function isAllowedGeminiDocumentModel(string $modelId, array $supportedMethods): bool
    {
        $normalizedId = strtolower($modelId);
        $methods = array_map(static fn ($item): string => strtolower((string) $item), $supportedMethods);

        if (! in_array('generatecontent', $methods, true)) {
            return false;
        }

        if (! str_starts_with($normalizedId, 'gemini-') && ! str_starts_with($normalizedId, 'gemma-')) {
            return false;
        }

        foreach (['tts', 'audio', 'live', 'image', 'imagen', 'veo', 'lyria', 'embedding', 'robotics', 'computer-use', 'nano-banana'] as $blockedKeyword) {
            if (str_contains($normalizedId, $blockedKeyword)) {
                return false;
            }
        }

        return true;
    }

    private function humanizeModelId(string $modelId): string
    {
        return ucwords(str_replace(['-', '_'], ' ', $modelId));
    }

    private function buildGeminiModelNote(string $modelId): string
    {
        return match (true) {
            str_contains($modelId, '2.5-flash-lite') => 'Fallback ringan untuk traffic tinggi.',
            str_contains($modelId, '2.5-flash') => 'Cepat dan stabil untuk generate dokumen.',
            str_contains($modelId, '2.5-pro') => 'Butuh kuota/akses lebih tinggi. Cocok jika project Anda mendukung.',
            str_contains($modelId, '2.0-flash-lite') => 'Model lama, kadang dibatasi kuota project.',
            str_contains($modelId, '2.0-flash') => 'Model lama, kadang dibatasi kuota project.',
            str_contains($modelId, 'flash-latest') => 'Alias latest untuk lini Flash.',
            str_contains($modelId, 'flash-lite-latest') => 'Alias latest untuk lini Flash Lite.',
            str_contains($modelId, 'pro-latest') => 'Alias latest untuk lini Pro. Butuh kuota/akses lebih tinggi.',
            str_contains($modelId, 'gemma-4-31b') => 'Lebih berat, cocok sebagai opsi tambahan jika stabil.',
            str_contains($modelId, 'gemma-4-26b') => 'Alternatif Gemma yang sedikit lebih ringan.',
            default => 'Model text generation yang bisa dipakai untuk generator dokumen.',
        };
    }

    private function isApiKeyInvalidMessage(string $message): bool
    {
        $normalized = strtolower($message);

        foreach ([
            'api key not valid',
            'api_key_invalid',
            'invalid api key',
        ] as $keyword) {
            if (str_contains($normalized, $keyword)) {
                return true;
            }
        }

        return false;
    }

    private function isRecommendedGeminiModel(string $modelId): bool
    {
        return in_array($modelId, [
            'gemini-2.5-flash',
            'gemini-2.5-flash-lite',
            'gemini-flash-latest',
            'gemini-flash-lite-latest',
            'gemma-4-31b-it',
            'gemma-4-26b-a4b-it',
        ], true);
    }
}
