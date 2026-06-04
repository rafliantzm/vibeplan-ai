<?php

namespace App\Services;

use App\Exceptions\AiProviderException;
use App\Exceptions\TokenLimitExceededException;
use App\Models\AiSetting;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class AiService
{
    /**
     * @return array{
     *   provider: string,
     *   base_url: string,
     *   model: string,
     *   fallback_models: array<int, string>,
     *   fallback_providers: array<int, string>,
     *   api_key: string,
     *   timeout: int,
     *   thinking_budget: int,
     *   max_tokens: int,
     *   enable_mock_fallback: bool
     * }
     */
    public function runtimeConfig(): array
    {
        return $this->resolveRuntimeAiConfig();
    }

    /**
     * @return array{success: bool, provider: string, model: string, message: string}
     */
    public function healthCheck(): array
    {
        $runtimeConfig = $this->resolveRuntimeAiConfig();
        $providerChain = $this->buildProviderChain($runtimeConfig, [
            'max_tokens' => 24,
            'skip_mock' => true,
        ]);
        $lastException = null;

        foreach ($providerChain as $index => $candidate) {
            try {
                $this->probeProviderHealth($candidate);

                return [
                    'success' => true,
                    'provider' => $candidate['provider'],
                    'model' => $candidate['model'],
                    'message' => 'AI provider is reachable',
                ];
            } catch (TokenLimitExceededException $exception) {
                $lastException = $exception;

                if (! isset($providerChain[$index + 1])) {
                    throw $exception;
                }

                Log::info('Retrying AI health check with fallback provider after limit reached.', [
                    'failed_provider' => $candidate['provider'],
                    'failed_model' => $candidate['model'],
                    'next_provider' => $providerChain[$index + 1]['provider'] ?? null,
                    'next_model' => $providerChain[$index + 1]['model'] ?? null,
                    'reason' => $exception->rawProviderMessage() ?? $exception->getMessage(),
                ]);
            } catch (AiProviderException $exception) {
                $lastException = $exception;

                if (! $this->canRetryWithAlternativeProvider($providerChain, $index, $exception->errorCode())) {
                    throw $exception;
                }

                Log::info('Retrying AI health check with fallback provider.', [
                    'failed_provider' => $candidate['provider'],
                    'failed_model' => $candidate['model'],
                    'next_provider' => $providerChain[$index + 1]['provider'] ?? null,
                    'next_model' => $providerChain[$index + 1]['model'] ?? null,
                    'reason' => $exception->rawProviderMessage() ?? $exception->getMessage(),
                    'error_code' => $exception->errorCode(),
                ]);
            }
        }

        throw $lastException ?? new RuntimeException('Tidak ada provider AI yang tersedia untuk health check.');
    }

    /**
     * @return array{
     *     provider: string,
     *     model: string,
     *     markdown_content: string,
     *     finish_reason: string|null,
     *     raw_response: array<string, mixed>
     * }
     */
    public function generateMarkdown(string $prompt, array $options = []): array
    {
        $runtimeConfig = $this->resolveRuntimeAiConfig();
        $providerChain = $this->buildProviderChain($runtimeConfig, $options);
        $lastException = null;

        foreach ($providerChain as $index => $candidate) {
            try {
                return match ($candidate['provider']) {
                    'gemini' => $this->generateGeminiMarkdown(
                        $prompt,
                        $candidate['provider'],
                        $candidate['base_url'],
                        $candidate['model'],
                        $candidate['fallback_models'],
                        $candidate['api_key'],
                        $candidate['timeout'],
                        $candidate['max_tokens'],
                        $candidate['thinking_budget']
                    ),
                    'mock' => $this->generateMockMarkdown($prompt),
                    default => $this->generateOpenAiCompatibleMarkdown(
                        $prompt,
                        $candidate['provider'],
                        $candidate['base_url'],
                        $candidate['model'],
                        $candidate['api_key'],
                        $candidate['timeout'],
                        $candidate['max_tokens']
                    ),
                };
            } catch (TokenLimitExceededException $exception) {
                $lastException = $exception;

                if (! isset($providerChain[$index + 1])) {
                    throw $exception;
                }

                Log::info('Retrying AI generate request with fallback provider after limit reached.', [
                    'failed_provider' => $candidate['provider'],
                    'failed_model' => $candidate['model'],
                    'next_provider' => $providerChain[$index + 1]['provider'] ?? null,
                    'next_model' => $providerChain[$index + 1]['model'] ?? null,
                    'reason' => $exception->rawProviderMessage() ?? $exception->getMessage(),
                ]);
            } catch (AiProviderException $exception) {
                $lastException = $exception;

                if (! $this->canRetryWithAlternativeProvider($providerChain, $index, $exception->errorCode())) {
                    throw $exception;
                }

                Log::info('Retrying AI generate request with fallback provider.', [
                    'failed_provider' => $candidate['provider'],
                    'failed_model' => $candidate['model'],
                    'next_provider' => $providerChain[$index + 1]['provider'] ?? null,
                    'next_model' => $providerChain[$index + 1]['model'] ?? null,
                    'reason' => $exception->rawProviderMessage() ?? $exception->getMessage(),
                    'error_code' => $exception->errorCode(),
                ]);
            }
        }

        throw $lastException ?? new RuntimeException('Tidak ada provider AI yang tersedia saat ini.');
    }

    /**
     * @return array{
     *     provider: string,
     *     model: string,
     *     markdown_content: string,
     *     finish_reason: string|null,
     *     raw_response: array<string, mixed>
     * }
     */
    private function generateGeminiMarkdown(
        string $prompt,
        string $provider,
        string $baseUrl,
        string $model,
        array $fallbackModels,
        string $apiKey,
        int $timeout,
        int $maxTokens,
        int $thinkingBudget
    ): array {
        ['primary' => $primaryTimeout, 'fallback' => $fallbackTimeout] = $this->resolveGeminiTimeoutBudget(
            $timeout,
            $fallbackModels !== []
        );

        $modelChain = array_values(array_unique(array_filter([
            $model,
            ...$fallbackModels,
        ], static fn (?string $value): bool => is_string($value) && trim($value) !== '')));

        $lastException = null;

        foreach ($modelChain as $index => $candidateModel) {
            $requestTimeout = $index === 0 ? $primaryTimeout : $fallbackTimeout;

            try {
                return $this->requestGeminiMarkdown(
                    $prompt,
                    $provider,
                    $baseUrl,
                    $candidateModel,
                    $apiKey,
                    $requestTimeout,
                    $maxTokens,
                    $thinkingBudget
                );
            } catch (AiProviderException $exception) {
                $lastException = $exception;

                if (! $this->shouldRetryWithAlternativeModel(
                    $modelChain,
                    $index,
                    $exception->errorCode(),
                    $exception->rawProviderMessage() ?? $exception->getMessage()
                )) {
                    throw $exception;
                }

                Log::info('Retrying Gemini request with fallback model.', [
                    'provider' => $provider,
                    'failed_model' => $candidateModel,
                    'next_model' => $modelChain[$index + 1] ?? null,
                    'reason' => $exception->rawProviderMessage() ?? $exception->getMessage(),
                ]);
            }
        }

        throw $lastException ?? new RuntimeException('Tidak ada model Gemini yang bisa digunakan saat ini.');
    }

    /**
     * @return array{
     *     provider: string,
     *     model: string,
     *     markdown_content: string,
     *     finish_reason: string|null,
     *     raw_response: array<string, mixed>
     * }
     */
    private function requestGeminiMarkdown(
        string $prompt,
        string $provider,
        string $baseUrl,
        string $model,
        string $apiKey,
        int $timeout,
        int $maxTokens,
        int $thinkingBudget
    ): array {
        if ($baseUrl === '' || $model === '' || $apiKey === '') {
            throw new AiProviderException(
                errorCode: 'AI_KEY_INVALID',
                message: 'Konfigurasi provider AI belum lengkap.',
                status: 422,
                userMessage: 'Konfigurasi Google AI Studio belum lengkap. Periksa provider, model, dan API key di backend.',
            );
        }

        $endpoint = rtrim($baseUrl, '/')."/models/{$model}:generateContent";
        $systemPrompt = 'You are VibePlan AI. Return only clean Markdown with no code fences around the entire response unless the content itself needs fenced code blocks.';

        $payload = [
            'contents' => [
                [
                    'role' => 'user',
                    'parts' => [
                        [
                            'text' => $systemPrompt."\n\nUser request:\n".$prompt,
                        ],
                    ],
                ],
            ],
            'generationConfig' => [
                'temperature' => 0.7,
                'maxOutputTokens' => $maxTokens,
            ],
        ];

        if (str_contains(strtolower($model), '2.5')) {
            $payload['generationConfig']['thinkingConfig'] = [
                'thinkingBudget' => max(0, $thinkingBudget),
            ];
        }

        $requestStartedAt = microtime(true);
        $requestContext = [
            'provider' => $provider,
            'model' => $model,
            'endpoint' => $endpoint,
            'max_tokens' => $maxTokens,
        ];
        $this->logRequestStarted($requestContext);

        try {
            $response = Http::withHeaders([
                'Content-Type' => 'application/json',
                'Accept' => 'application/json',
                'x-goog-api-key' => $apiKey,
            ])
                ->connectTimeout(min($timeout, 30))
                ->timeout($timeout)
                ->post($endpoint, $payload)
                ->throw();
        } catch (ConnectionException $exception) {
            $this->logRequestFailed($requestContext, $requestStartedAt, $exception->getMessage());

            throw new AiProviderException(
                errorCode: 'AI_PROVIDER_UNREACHABLE',
                message: $this->isTimeoutMessage($exception->getMessage())
                    ? 'Provider AI terlalu lama merespons. Coba Mode Ringkas atau model lebih ringan.'
                    : 'Provider AI sedang tidak bisa dijangkau.',
                status: $this->isTimeoutMessage($exception->getMessage()) ? 504 : 503,
                rawProviderMessage: $exception->getMessage(),
                userMessage: $this->isTimeoutMessage($exception->getMessage())
                    ? 'Google AI Studio terlalu lama merespons. Coba Mode Ringkas atau aktifkan fallback provider.'
                    : 'Google AI Studio sedang tidak bisa dijangkau. Periksa koneksi backend atau gunakan fallback provider.',
            );
        } catch (RequestException $exception) {
            $this->throwGeminiRequestException($exception, $requestContext, $requestStartedAt);
        }

        $responsePayload = $response->json();
        $parts = data_get($responsePayload, 'candidates.0.content.parts', []);
        $content = '';

        if (is_array($parts)) {
            foreach ($parts as $part) {
                $text = data_get($part, 'text');

                if (is_string($text)) {
                    $content .= $text;
                }
            }
        }

        $content = trim($content);
        $finishReason = data_get($responsePayload, 'candidates.0.finishReason');

        if ($content === '') {
            throw new RuntimeException('Gemini provider returned an empty response.');
        }

        $this->logRequestCompleted($requestContext, $requestStartedAt, [
            'finish_reason' => is_string($finishReason) ? $finishReason : null,
            'usage' => data_get($responsePayload, 'usageMetadata'),
        ]);

        return [
            'provider' => $provider,
            'model' => $model,
            'markdown_content' => $content,
            'finish_reason' => is_string($finishReason) ? $finishReason : null,
            'raw_response' => is_array($responsePayload) ? $responsePayload : [],
        ];
    }

    /**
     * @return array{
     *     provider: string,
     *     model: string,
     *     markdown_content: string,
     *     finish_reason: string|null,
     *     raw_response: array<string, mixed>
     * }
     */
    private function generateOpenAiCompatibleMarkdown(
        string $prompt,
        string $provider,
        string $baseUrl,
        string $model,
        string $apiKey,
        int $timeout,
        int $maxTokens
    ): array {
        if ($baseUrl === '' || $model === '' || $apiKey === '') {
            throw new AiProviderException(
                errorCode: 'AI_KEY_INVALID',
                message: 'Konfigurasi provider AI belum lengkap.',
                status: 422,
                userMessage: 'Konfigurasi provider AI belum lengkap. Periksa provider, model, dan API key pada backend.',
            );
        }

        $endpoint = $this->buildChatCompletionsUrl($baseUrl);
        $headers = array_filter([
            'Authorization' => 'Bearer '.$apiKey,
            'Content-Type' => 'application/json',
            'Accept' => 'application/json',
            'HTTP-Referer' => config('services.ai.http_referer'),
            'X-Title' => config('services.ai.app_name'),
        ], static fn ($value) => $value !== null && $value !== '');

        $requestStartedAt = microtime(true);
        $requestContext = [
            'provider' => $provider,
            'model' => $model,
            'endpoint' => $endpoint,
            'max_tokens' => $maxTokens,
        ];
        $this->logRequestStarted($requestContext);

        try {
            $response = Http::withHeaders($headers)
                ->connectTimeout(min($timeout, 30))
                ->timeout($timeout)
                ->post($endpoint, [
                    'model' => $model,
                    'messages' => [
                        [
                            'role' => 'system',
                            'content' => 'You are VibePlan AI. Return only clean Markdown with no code fences around the entire response unless the content itself needs fenced code blocks.',
                        ],
                        [
                            'role' => 'user',
                            'content' => $prompt,
                        ],
                    ],
                    'temperature' => 0.7,
                    'max_tokens' => $maxTokens,
                    'max_completion_tokens' => $maxTokens,
                ])
                ->throw();
        } catch (ConnectionException $exception) {
            $this->logRequestFailed($requestContext, $requestStartedAt, $exception->getMessage());

            throw new AiProviderException(
                errorCode: 'AI_PROVIDER_UNREACHABLE',
                message: $this->isTimeoutMessage($exception->getMessage())
                    ? 'Provider AI terlalu lama merespons. Coba Mode Ringkas atau model lebih ringan.'
                    : 'Provider AI sedang tidak bisa dijangkau.',
                status: $this->isTimeoutMessage($exception->getMessage()) ? 504 : 503,
                rawProviderMessage: $exception->getMessage(),
                userMessage: $this->isTimeoutMessage($exception->getMessage())
                    ? 'Provider AI terlalu lama merespons. Coba lagi, gunakan Mode Ringkas, atau andalkan fallback provider.'
                    : 'Provider AI sedang tidak bisa dijangkau. Periksa koneksi backend atau aktifkan fallback provider.',
            );
        } catch (RequestException $exception) {
            $this->throwOpenAiCompatibleRequestException($exception, $requestContext, $requestStartedAt, $provider);
        }

        $responsePayload = $response->json();
        $content = trim((string) data_get($responsePayload, 'choices.0.message.content', ''));
        $finishReason = data_get($responsePayload, 'choices.0.finish_reason');

        if ($content === '') {
            throw new RuntimeException('AI provider returned an empty response.');
        }

        $this->logRequestCompleted($requestContext, $requestStartedAt, [
            'finish_reason' => is_string($finishReason) ? $finishReason : null,
            'usage' => data_get($responsePayload, 'usage'),
        ]);

        return [
            'provider' => $provider,
            'model' => $model,
            'markdown_content' => $content,
            'finish_reason' => is_string($finishReason) ? $finishReason : null,
            'raw_response' => is_array($responsePayload) ? $responsePayload : [],
        ];
    }

    /**
     * @return array{
     *     provider: string,
     *     model: string,
     *     markdown_content: string,
     *     finish_reason: string|null,
     *     raw_response: array<string, mixed>
     * }
     */
    private function generateMockMarkdown(string $prompt): array
    {
        $documentType = $this->detectDocumentTypeFromPrompt($prompt);
        $projectName = $this->extractProjectNameFromPrompt($prompt);

        $markdown = match ($documentType) {
            'next-step' => <<<MD
# Next Step Planner - {$projectName}

> Mode demo aktif. Provider AI utama sedang tidak tersedia sehingga VibePlan AI membuat roadmap sederhana untuk development lokal.

## 1. Setup Proyek
- Siapkan repository, environment, dan struktur folder inti.
- Pastikan backend, frontend, dan database dapat dijalankan lokal.

## 2. Fitur Inti
- Implementasikan alur utama pengguna lebih dahulu.
- Buat validasi dasar, penyimpanan data, dan endpoint utama.

## 3. Verifikasi
- Jalankan lint, build, dan pengujian minimal.
- Catat kendala yang masih perlu penyesuaian saat provider AI kembali normal.
MD,
            'coding-prompt' => <<<MD
# Coding Prompt - {$projectName}

Mode demo aktif karena provider AI utama sedang tidak tersedia.

## Prompt Utama
Periksa struktur project {$projectName}, identifikasi file inti yang perlu diubah, lalu implementasikan fitur utama secara bertahap. Jangan mengubah auth, admin, dan halaman yang tidak terkait. Setelah perubahan, jalankan lint, build, dan testing yang relevan.
MD,
            default => <<<MD
# PRD - {$projectName}

> Mode demo aktif. Provider AI utama sedang tidak tersedia sehingga sistem membuat PRD sederhana agar flow development lokal tetap berjalan.

## 1. Executive Summary
{$projectName} adalah produk digital yang membutuhkan dokumentasi awal agar tim dapat mulai membangun MVP tanpa menunggu provider AI utama pulih.

## 2. Problem Statement
Pengguna membutuhkan output PRD cepat saat layanan AI utama sedang down, namun proses analisis produk tetap harus berjalan.

## 3. Target Users
- User akhir produk
- Admin atau operator sistem
- Tim developer internal

## 4. Core Features
- Alur utama produk
- Penyimpanan data utama
- Dashboard atau halaman kerja inti

## 5. Development Notes
- Ini adalah fallback mock untuk development lokal.
- Generate ulang saat provider AI pulih untuk mendapatkan PRD lengkap.
MD,
        };

        return [
            'provider' => 'mock',
            'model' => 'demo-prd-generator',
            'markdown_content' => trim($markdown),
            'finish_reason' => 'mock_fallback',
            'raw_response' => [
                'mock' => true,
                'document_type' => $documentType,
            ],
        ];
    }

    private function throwGeminiRequestException(RequestException $exception, array $requestContext, float $requestStartedAt): never
    {
        $errorBody = $exception->response?->json();
        $message = data_get($errorBody, 'error.message')
            ?? data_get($errorBody, 'message')
            ?? $exception->response?->body()
            ?? 'Gemini provider request failed.';
        $status = (int) ($exception->response?->status() ?? 500);

        $this->logRequestFailed($requestContext, $requestStartedAt, $message, $status, $errorBody);

        if ($status === 429 || $this->isProviderLimitError($message) || $this->isProviderRequestTooLargeError($message)) {
            throw new TokenLimitExceededException(
                rawProviderMessage: $message,
            );
        }

        if ($this->isInputTooLargeError($message)) {
            throw new AiProviderException(
                errorCode: 'INPUT_TOO_LARGE',
                message: 'File PRD terlalu panjang untuk diproses dalam mode normal.',
                status: 422,
                rawProviderMessage: $message,
                userMessage: 'Input terlalu besar untuk diproses provider AI saat ini. Gunakan Mode Ringkas atau ringkas isi PRD.',
            );
        }

        if ($status === 401) {
            throw new AiProviderException(
                errorCode: 'AI_KEY_INVALID',
                message: 'API key salah, kosong, atau tidak terbaca oleh provider AI.',
                status: 401,
                rawProviderMessage: $message,
                userMessage: 'API key Google AI Studio salah atau kosong. Periksa `.env` backend dan konfigurasi admin AI settings.',
            );
        }

        if ($status === 403 && $this->isModelAccessDeniedError($message)) {
            throw new AiProviderException(
                errorCode: 'AI_ACCESS_DENIED',
                message: 'Akses ke model AI ditolak.',
                status: 403,
                rawProviderMessage: $message,
                userMessage: 'Model AI tidak bisa diakses oleh project Google AI Studio ini. Ganti model atau provider fallback.',
            );
        }

        if ($status === 403) {
            throw new AiProviderException(
                errorCode: 'AI_ACCESS_DENIED',
                message: 'Akses ke provider AI ditolak.',
                status: 403,
                rawProviderMessage: $message,
                userMessage: 'Akses ke Google AI Studio ditolak. Periksa izin key, project, atau billing provider.',
            );
        }

        if ($status === 404 || $this->isModelMissingError($message)) {
            throw new AiProviderException(
                errorCode: 'MODEL_NOT_FOUND',
                message: 'Model AI tidak ditemukan atau tidak tersedia untuk provider ini.',
                status: 404,
                rawProviderMessage: $message,
                userMessage: 'Model AI tidak ditemukan atau tidak tersedia. Periksa `AI_MODEL` dan fallback model yang aktif.',
            );
        }

        throw new AiProviderException(
            errorCode: 'AI_PROVIDER_UNREACHABLE',
            message: $this->isTimeoutStatus($status) || $this->isTimeoutMessage($message)
                ? 'Provider AI terlalu lama merespons. Coba Mode Ringkas atau model lebih ringan.'
                : ($this->isTemporaryUnavailableMessage($message)
                    ? 'Model AI sedang sibuk karena traffic tinggi. Silakan coba lagi sebentar lagi.'
                    : 'Provider AI sedang tidak bisa dijangkau.'),
            status: $this->isTimeoutStatus($status) ? 504 : 503,
            rawProviderMessage: $message,
            userMessage: $this->isTimeoutStatus($status) || $this->isTimeoutMessage($message)
                ? 'Google AI Studio terlalu lama merespons. Coba lagi, gunakan Mode Ringkas, atau andalkan fallback provider.'
                : ($this->isTemporaryUnavailableMessage($message)
                    ? 'Model AI sedang sibuk karena traffic tinggi. Coba model fallback lain atau ulangi beberapa saat lagi.'
                    : 'Google AI Studio sedang tidak bisa dijangkau.'),
        );
    }

    private function throwOpenAiCompatibleRequestException(
        RequestException $exception,
        array $requestContext,
        float $requestStartedAt,
        string $provider
    ): never {
        $errorBody = $exception->response?->json();
        $message = data_get($errorBody, 'error.message')
            ?? data_get($errorBody, 'message')
            ?? $exception->response?->body()
            ?? 'AI provider request failed.';
        $status = (int) ($exception->response?->status() ?? 500);

        $this->logRequestFailed($requestContext, $requestStartedAt, $message, $status, $errorBody);

        if ($status === 429 || $this->isProviderLimitError($message) || $this->isProviderRequestTooLargeError($message)) {
            throw new TokenLimitExceededException(
                rawProviderMessage: $message,
            );
        }

        if ($this->isInputTooLargeError($message)) {
            throw new AiProviderException(
                errorCode: 'INPUT_TOO_LARGE',
                message: 'File PRD terlalu panjang untuk diproses dalam mode normal.',
                status: 422,
                rawProviderMessage: $message,
                userMessage: 'Input terlalu besar untuk diproses provider AI saat ini. Gunakan Mode Ringkas atau ringkas isi PRD.',
            );
        }

        if ($status === 401) {
            throw new AiProviderException(
                errorCode: 'AI_KEY_INVALID',
                message: 'API key salah, kosong, atau tidak terbaca oleh provider AI.',
                status: 401,
                rawProviderMessage: $message,
                userMessage: "API key provider {$provider} salah atau kosong. Periksa `.env` backend dan AI settings.",
            );
        }

        if ($status === 403) {
            throw new AiProviderException(
                errorCode: 'AI_ACCESS_DENIED',
                message: 'Akses ke provider AI ditolak.',
                status: 403,
                rawProviderMessage: $message,
                userMessage: "Akses ke provider {$provider} ditolak. API key mungkin valid tetapi belum punya izin model atau project dibatasi.",
            );
        }

        if ($status === 404 || $this->isModelMissingError($message)) {
            throw new AiProviderException(
                errorCode: 'MODEL_NOT_FOUND',
                message: 'Model AI tidak ditemukan atau tidak tersedia untuk provider ini.',
                status: 404,
                rawProviderMessage: $message,
                userMessage: "Model AI untuk provider {$provider} tidak ditemukan. Periksa `AI_MODEL` atau model default provider fallback.",
            );
        }

        throw new AiProviderException(
            errorCode: $this->isTimeoutStatus($status) || $this->isTimeoutMessage($message)
                ? 'AI_PROVIDER_UNREACHABLE'
                : 'AI_PROVIDER_UNREACHABLE',
            message: $this->isTimeoutStatus($status) || $this->isTimeoutMessage($message)
                ? 'Provider AI terlalu lama merespons. Coba Mode Ringkas atau model lebih ringan.'
                : ($this->isTemporaryUnavailableMessage($message)
                    ? 'Model AI sedang sibuk karena traffic tinggi. Silakan coba lagi sebentar lagi.'
                    : 'Provider AI sedang tidak bisa dijangkau.'),
            status: $this->isTimeoutStatus($status) ? 504 : 503,
            rawProviderMessage: $message,
            userMessage: $this->isTimeoutStatus($status) || $this->isTimeoutMessage($message)
                ? "Provider {$provider} terlalu lama merespons. Coba lagi, gunakan Mode Ringkas, atau aktifkan fallback provider."
                : ($this->isTemporaryUnavailableMessage($message)
                    ? "Provider {$provider} sedang sibuk atau high demand. Coba model fallback lain atau ulangi beberapa saat lagi."
                    : "Provider {$provider} sedang tidak bisa dijangkau."),
        );
    }

    private function isProviderLimitError(string $message): bool
    {
        $normalized = strtolower($message);

        foreach ([
            'rate_limit',
            'rate limit',
            'rate limit exceeded',
            'requests per minute',
            'rpm',
            'tokens per minute',
            'tpm',
            'quota',
            'resource exhausted',
            'too many requests',
            'exceeded your current quota',
        ] as $keyword) {
            if (str_contains($normalized, $keyword)) {
                return true;
            }
        }

        return false;
    }

    private function isInputTooLargeError(string $message): bool
    {
        $normalized = strtolower($message);

        foreach ([
            'reduce your message size',
            'maximum context',
            'too many tokens',
            'limit 6000',
        ] as $keyword) {
            if (str_contains($normalized, $keyword)) {
                return true;
            }
        }

        return false;
    }

    private function isProviderRequestTooLargeError(string $message): bool
    {
        $normalized = strtolower($message);

        foreach ([
            'request too large',
            'payload too large',
        ] as $keyword) {
            if (str_contains($normalized, $keyword)) {
                return true;
            }
        }

        return false;
    }

    /**
     * @param  array{provider: string, model: string, endpoint: string, max_tokens: int}  $context
     */
    private function logRequestStarted(array $context): void
    {
        Log::info('AI generate request started.', $context);
    }

    /**
     * @param  array{provider: string, model: string, endpoint: string, max_tokens: int}  $context
     * @param  array<string, mixed>  $meta
     */
    private function logRequestCompleted(array $context, float $startedAt, array $meta = []): void
    {
        Log::info('AI generate request completed.', [
            ...$context,
            'duration_ms' => $this->durationMs($startedAt),
            ...$meta,
        ]);
    }

    /**
     * @param  array{provider: string, model: string, endpoint: string, max_tokens: int}  $context
     * @param  array<string, mixed>|null  $response
     */
    private function logRequestFailed(
        array $context,
        float $startedAt,
        string $message,
        ?int $status = null,
        ?array $response = null,
    ): void {
        Log::warning('AI generate request failed.', [
            ...$context,
            'duration_ms' => $this->durationMs($startedAt),
            'status' => $status,
            'message' => $message,
            'response' => $response,
        ]);
    }

    private function durationMs(float $startedAt): int
    {
        return (int) round((microtime(true) - $startedAt) * 1000);
    }

    private function isTimeoutMessage(string $message): bool
    {
        $normalized = strtolower($message);

        foreach ([
            'timed out',
            'timeout',
            'operation timed out',
            'curl error 28',
            'deadline exceeded',
        ] as $keyword) {
            if (str_contains($normalized, $keyword)) {
                return true;
            }
        }

        return false;
    }

    private function isTimeoutStatus(int $status): bool
    {
        return in_array($status, [408, 504], true);
    }

    private function shouldRetryWithAlternativeModel(
        array $modelChain,
        int $currentIndex,
        string $errorCode,
        ?string $rawMessage = null,
    ): bool {
        if (! isset($modelChain[$currentIndex + 1])) {
            return false;
        }

        if (! in_array($errorCode, ['AI_PROVIDER_UNREACHABLE', 'AI_ACCESS_DENIED', 'MODEL_NOT_FOUND'], true)) {
            return false;
        }

        $message = (string) $rawMessage;

        return $this->isTimeoutMessage($message)
            || $this->isTemporaryUnavailableMessage($message)
            || $this->isModelMissingError($message)
            || $this->isModelAccessDeniedError($message);
    }

    private function canRetryWithAlternativeProvider(array $providerChain, int $currentIndex, string $errorCode): bool
    {
        if (! isset($providerChain[$currentIndex + 1])) {
            return false;
        }

        return $errorCode !== 'INPUT_TOO_LARGE';
    }

    /**
     * @return array{
     *   provider: string,
     *   base_url: string,
     *   model: string,
     *   fallback_models: array<int, string>,
     *   fallback_providers: array<int, string>,
     *   api_key: string,
     *   timeout: int,
     *   thinking_budget: int,
     *   max_tokens: int,
     *   enable_mock_fallback: bool
     * }
     */
    private function resolveRuntimeAiConfig(): array
    {
        $provider = (string) config('services.ai.provider');
        $baseUrl = (string) config('services.ai.base_url');
        $model = (string) config('services.ai.model');
        $fallbackModels = config('services.ai.fallback_models', []);
        $fallbackModel = trim((string) config('services.ai.fallback_model', ''));
        $fallbackProviders = config('services.ai.fallback_providers', []);
        $fallbackProvider = trim((string) config('services.ai.fallback_provider', ''));
        $timeout = (int) config('services.ai.timeout', 300);
        $thinkingBudget = (int) config('services.ai.thinking_budget', 0);
        $maxTokens = (int) config('services.ai.max_tokens', 1600);
        $enableMockFallback = (bool) config('services.ai.enable_mock_fallback', false);

        $settings = AiSetting::query()->orderByDesc('updated_at')->first();

        if ($settings) {
            $provider = (string) ($settings->provider ?: $provider);
            $baseUrl = (string) ($settings->base_url ?: $baseUrl);
            $model = (string) ($settings->model ?: $model);

            if (is_array($settings->fallback_models) && $settings->fallback_models !== []) {
                $fallbackModels = $settings->fallback_models;
            }
        }

        if (! is_array($fallbackModels)) {
            $fallbackModels = [];
        }

        $fallbackModels = array_values(array_unique(array_filter(array_map(
            static fn ($item): string => trim((string) $item),
            [...$fallbackModels, $fallbackModel]
        ), static fn (string $item) => $item !== '' && $item !== $model)));

        if (! is_array($fallbackProviders)) {
            $fallbackProviders = [];
        }

        $resolvedProvider = strtolower(trim($provider));
        $fallbackProviders = array_values(array_unique(array_filter(array_map(
            static fn ($item): string => strtolower(trim((string) $item)),
            [...$fallbackProviders, $fallbackProvider]
        ), static fn (string $item) => $item !== '' && $item !== $resolvedProvider)));

        $providerConfig = $this->resolveProviderConfig($resolvedProvider);

        return [
            'provider' => $resolvedProvider,
            'base_url' => trim($baseUrl !== '' ? $baseUrl : $providerConfig['base_url']),
            'model' => trim($model !== '' ? $model : $providerConfig['model']),
            'fallback_models' => $fallbackModels,
            'fallback_providers' => $fallbackProviders,
            'api_key' => trim((string) ($providerConfig['api_key'] ?: config('services.ai.api_key'))),
            'timeout' => $timeout,
            'thinking_budget' => $thinkingBudget,
            'max_tokens' => $maxTokens,
            'enable_mock_fallback' => $enableMockFallback,
        ];
    }

    /**
     * @param  array{
     *   provider: string,
     *   base_url: string,
     *   model: string,
     *   fallback_models: array<int, string>,
     *   fallback_providers: array<int, string>,
     *   api_key: string,
     *   timeout: int,
     *   thinking_budget: int,
     *   max_tokens: int,
     *   enable_mock_fallback: bool
     * }  $runtimeConfig
     * @param  array<string, mixed>  $options
     * @return array<int, array{
     *   provider: string,
     *   base_url: string,
     *   model: string,
     *   fallback_models: array<int, string>,
     *   api_key: string,
     *   timeout: int,
     *   thinking_budget: int,
     *   max_tokens: int
     * }>
     */
    private function buildProviderChain(array $runtimeConfig, array $options = []): array
    {
        $primaryProvider = strtolower(trim((string) ($options['provider'] ?? $runtimeConfig['provider'])));
        $fallbackProviders = $options['fallback_providers'] ?? $runtimeConfig['fallback_providers'];
        $skipMock = (bool) ($options['skip_mock'] ?? false);

        if (! is_array($fallbackProviders)) {
            $fallbackProviders = [];
        }

        $providerOrder = array_values(array_unique(array_filter([
            $primaryProvider,
            ...array_map(static fn ($item): string => strtolower(trim((string) $item)), $fallbackProviders),
            (! $skipMock && ((bool) ($options['enable_mock_fallback'] ?? $runtimeConfig['enable_mock_fallback']))) ? 'mock' : null,
        ], static fn ($provider): bool => is_string($provider) && trim($provider) !== '')));

        $chain = [];

        foreach ($providerOrder as $index => $provider) {
            if ($provider === 'mock') {
                $chain[] = [
                    'provider' => 'mock',
                    'base_url' => '',
                    'model' => 'demo-prd-generator',
                    'fallback_models' => [],
                    'api_key' => '',
                    'timeout' => (int) ($options['timeout'] ?? $runtimeConfig['timeout']),
                    'thinking_budget' => 0,
                    'max_tokens' => (int) ($options['max_tokens'] ?? $runtimeConfig['max_tokens']),
                ];
                continue;
            }

            $providerConfig = $this->resolveProviderConfig($provider);

            $chain[] = [
                'provider' => $provider,
                'base_url' => trim((string) ($index === 0
                    ? ($options['base_url'] ?? ($runtimeConfig['base_url'] ?: $providerConfig['base_url']))
                    : $providerConfig['base_url'])),
                'model' => trim((string) ($index === 0
                    ? ($options['model'] ?? ($runtimeConfig['model'] ?: $providerConfig['model']))
                    : $providerConfig['model'])),
                'fallback_models' => $provider === 'gemini'
                    ? array_values(array_unique(array_filter(array_map(
                        static fn ($item): string => trim((string) $item),
                        $index === 0 ? ($options['fallback_models'] ?? $runtimeConfig['fallback_models']) : []
                    ), static fn (string $item) => $item !== '')))
                    : [],
                'api_key' => trim((string) ($index === 0
                    ? ($options['api_key'] ?? ($runtimeConfig['api_key'] ?: $providerConfig['api_key']))
                    : $providerConfig['api_key'])),
                'timeout' => (int) ($options['timeout'] ?? $runtimeConfig['timeout']),
                'thinking_budget' => (int) ($options['thinking_budget'] ?? $runtimeConfig['thinking_budget']),
                'max_tokens' => (int) ($options['max_tokens'] ?? $runtimeConfig['max_tokens']),
            ];
        }

        return $chain;
    }

    /**
     * @return array{base_url: string, model: string, api_key: string}
     */
    private function resolveProviderConfig(string $provider): array
    {
        $providers = (array) config('services.ai.providers', []);
        $config = (array) ($providers[$provider] ?? []);

        return [
            'base_url' => trim((string) ($config['base_url'] ?? '')),
            'model' => trim((string) ($config['model'] ?? '')),
            'api_key' => trim((string) ($config['api_key'] ?? '')),
        ];
    }

    /**
     * @param  array{
     *   provider: string,
     *   base_url: string,
     *   model: string,
     *   fallback_models: array<int, string>,
     *   api_key: string,
     *   timeout: int,
     *   thinking_budget: int,
     *   max_tokens: int
     * }  $candidate
     */
    private function probeProviderHealth(array $candidate): void
    {
        $healthPrompt = 'Reply with exactly: OK';

        if ($candidate['provider'] === 'gemini') {
            $this->requestGeminiMarkdown(
                $healthPrompt,
                $candidate['provider'],
                $candidate['base_url'],
                $candidate['model'],
                $candidate['api_key'],
                min(30, $candidate['timeout']),
                min(24, $candidate['max_tokens']),
                0
            );

            return;
        }

        $this->generateOpenAiCompatibleMarkdown(
            $healthPrompt,
            $candidate['provider'],
            $candidate['base_url'],
            $candidate['model'],
            $candidate['api_key'],
            min(30, $candidate['timeout']),
            min(24, $candidate['max_tokens'])
        );
    }

    /**
     * @return array{primary: int, fallback: int}
     */
    private function resolveGeminiTimeoutBudget(int $timeout, bool $hasFallback): array
    {
        if (! $hasFallback) {
            $effectiveTimeout = min(max(60, $timeout), 120);

            return [
                'primary' => $effectiveTimeout,
                'fallback' => $effectiveTimeout,
            ];
        }

        $primaryTimeout = min(max(60, (int) floor($timeout * 0.65)), 75);
        $fallbackTimeout = min(max(30, $timeout - $primaryTimeout), 45);

        return [
            'primary' => $primaryTimeout,
            'fallback' => $fallbackTimeout,
        ];
    }

    private function isTemporaryUnavailableMessage(string $message): bool
    {
        $normalized = strtolower($message);

        foreach ([
            'high demand',
            'temporarily unavailable',
            'currently unavailable',
            'service unavailable',
            'status":"unavailable"',
            'model is overloaded',
            'try again later',
        ] as $keyword) {
            if (str_contains($normalized, $keyword)) {
                return true;
            }
        }

        return false;
    }

    private function buildChatCompletionsUrl(string $baseUrl): string
    {
        $normalizedBaseUrl = rtrim($baseUrl, '/');

        if (str_ends_with($normalizedBaseUrl, '/chat/completions')) {
            return $normalizedBaseUrl;
        }

        return $normalizedBaseUrl.'/chat/completions';
    }

    private function isModelMissingError(string $message): bool
    {
        $normalized = strtolower($message);

        foreach ([
            'model_not_found',
            'model not found',
            'unknown model',
            'does not exist',
        ] as $keyword) {
            if (str_contains($normalized, $keyword)) {
                return true;
            }
        }

        return false;
    }

    private function isModelAccessDeniedError(string $message): bool
    {
        $normalized = strtolower($message);

        foreach ([
            'not allowed',
            'not permitted',
            'does not have access',
            'permission',
            'not enabled',
            'unauthorized for model',
        ] as $keyword) {
            if (str_contains($normalized, $keyword) && str_contains($normalized, 'model')) {
                return true;
            }
        }

        return false;
    }

    private function detectDocumentTypeFromPrompt(string $prompt): string
    {
        $normalized = strtolower($prompt);

        if (str_contains($normalized, 'coding prompt')) {
            return 'coding-prompt';
        }

        if (str_contains($normalized, 'next step') || str_contains($normalized, 'roadmap')) {
            return 'next-step';
        }

        return 'prd';
    }

    private function extractProjectNameFromPrompt(string $prompt): string
    {
        if (preg_match('/Project Name:\s*(.+)$/mi', $prompt, $matches) === 1) {
            return trim($matches[1]);
        }

        if (preg_match('/#\s*PRD\s*-\s*(.+)$/mi', $prompt, $matches) === 1) {
            return trim($matches[1]);
        }

        return 'Demo Project';
    }
}
