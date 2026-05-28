<?php

namespace App\Services;

use App\Exceptions\AiProviderException;
use App\Exceptions\TokenLimitExceededException;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class AiService
{
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
        $provider = (string) config('services.ai.provider');
        $baseUrl = rtrim((string) config('services.ai.base_url'), '/');
        $endpoint = $this->buildChatCompletionsUrl($baseUrl);
        $model = (string) config('services.ai.model');
        $apiKey = (string) config('services.ai.api_key');
        $timeout = (int) config('services.ai.timeout', 120);
        $maxTokens = (int) ($options['max_tokens'] ?? config('services.ai.max_tokens', 1800));

        if ($baseUrl === '' || $model === '' || $apiKey === '') {
            throw new RuntimeException('AI service is not configured. Set AI_PROVIDER, AI_BASE_URL, AI_MODEL, and AI_API_KEY in backend-laravel/.env.');
        }

        $headers = array_filter([
            'Authorization' => 'Bearer '.$apiKey,
            'Content-Type' => 'application/json',
            'Accept' => 'application/json',
            'HTTP-Referer' => config('services.ai.http_referer'),
            'X-Title' => config('services.ai.app_name'),
        ], static fn ($value) => $value !== null && $value !== '');

        try {
            $response = Http::withHeaders($headers)
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
            Log::warning('AI provider connection failed.', [
                'provider' => $provider,
                'model' => $model,
                'base_url' => $baseUrl,
                'endpoint' => $endpoint,
                'message' => $exception->getMessage(),
            ]);

            throw new AiProviderException(
                errorCode: 'AI_PROVIDER_UNREACHABLE',
                message: 'Provider AI sedang tidak bisa dijangkau.',
                status: 503,
                rawProviderMessage: $exception->getMessage(),
            );
        } catch (RequestException $exception) {
            $errorBody = $exception->response?->json();
            $message = data_get($errorBody, 'error.message')
                ?? data_get($errorBody, 'message')
                ?? 'AI provider request failed.';
            $status = (int) ($exception->response?->status() ?? 500);

            Log::warning('AI provider request failed.', [
                'provider' => $provider,
                'model' => $model,
                'base_url' => $baseUrl,
                'endpoint' => $endpoint,
                'message' => $message,
                'status' => $status,
                'response' => $errorBody,
            ]);

            if ($this->isProviderLimitError($message) || $this->isProviderRequestTooLargeError($message)) {
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
                );
            }

            if ($this->isModelNotAllowedError($message)) {
                throw new AiProviderException(
                    errorCode: 'MODEL_NOT_ALLOWED',
                    message: 'API key valid, tetapi model tidak diizinkan pada project Groq ini.',
                    status: 403,
                    rawProviderMessage: $message,
                );
            }

            if (in_array($status, [401, 403], true)) {
                throw new AiProviderException(
                    errorCode: 'AI_KEY_INVALID',
                    message: 'API key tidak valid atau tidak memiliki akses model.',
                    status: $status,
                    rawProviderMessage: $message,
                );
            }

            throw new AiProviderException(
                errorCode: 'AI_PROVIDER_UNREACHABLE',
                message: 'Provider AI sedang tidak bisa dijangkau.',
                status: 503,
                rawProviderMessage: $message,
            );
        }

        $payload = $response->json();
        $content = trim((string) data_get($payload, 'choices.0.message.content', ''));
        $finishReason = data_get($payload, 'choices.0.finish_reason');

        if ($content === '') {
            throw new RuntimeException('AI provider returned an empty response.');
        }

        return [
            'provider' => $provider,
            'model' => $model,
            'markdown_content' => $content,
            'finish_reason' => is_string($finishReason) ? $finishReason : null,
            'raw_response' => is_array($payload) ? $payload : [],
        ];
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

    private function buildChatCompletionsUrl(string $baseUrl): string
    {
        $normalizedBaseUrl = rtrim($baseUrl, '/');

        if (str_ends_with($normalizedBaseUrl, '/chat/completions')) {
            return $normalizedBaseUrl;
        }

        return $normalizedBaseUrl.'/chat/completions';
    }

    private function isModelNotAllowedError(string $message): bool
    {
        $normalized = strtolower($message);

        foreach ([
            'model_not_found',
            'model not found',
            'not allowed',
            'not permitted',
            'does not have access',
            'permission',
            'not enabled',
            'unauthorized for model',
        ] as $keyword) {
            if (str_contains($normalized, $keyword)) {
                return str_contains($normalized, 'model')
                    || in_array($keyword, ['model_not_found', 'model not found'], true);
            }
        }

        return false;
    }
}
