<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\AiProviderException;
use App\Exceptions\TokenLimitExceededException;
use App\Http\Controllers\Controller;
use App\Models\AiGeneration;
use App\Models\Project;
use App\Services\AiService;
use App\Services\MarkdownService;
use App\Services\PromptService;
use App\Services\UploadedPrdPreparationService;
use App\Services\UserActivityLogger;
use App\Support\DatabaseErrorResponder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use RuntimeException;
use Throwable;

class GenerateController extends Controller
{
    private const PROJECT_IDEA_MAX_LENGTH = 15000;

    public function __construct(
        private readonly AiService $aiService,
        private readonly PromptService $promptService,
        private readonly MarkdownService $markdownService,
        private readonly UploadedPrdPreparationService $uploadedPrdPreparationService,
        private readonly UserActivityLogger $activityLogger,
    ) {
    }

    public function generatePrd(Request $request): JsonResponse
    {
        return $this->generate($request, 'prd');
    }

    public function generateNextStep(Request $request): JsonResponse
    {
        return $this->generate($request, 'next-step');
    }

    public function generateCodingPrompt(Request $request): JsonResponse
    {
        return $this->generate($request, 'coding-prompt');
    }

    private function generate(Request $request, string $generationType): JsonResponse
    {
        if (! extension_loaded('mongodb')) {
            return DatabaseErrorResponder::extensionMissing('generation endpoints');
        }

        $this->extendExecutionWindow();
        $requestStartedAt = microtime(true);
        $this->logGenerateRequestReceived($request, $generationType);

        $this->normalizeWorkflowInputs($request, $generationType);
        $validated = $request->validate($this->rulesFor($generationType));

        try {
            $authenticatedUser = $request->user();
            $retryUsed = false;

            if (! $authenticatedUser) {
                return response()->json([
                    'success' => false,
                    'error_code' => 'AUTH_REQUIRED',
                    'message' => 'Silakan login terlebih dahulu untuk menggunakan fitur generate AI.',
                ], 401);
            }

            if ((int) $authenticatedUser->token_balance <= 0) {
                return response()->json([
                    'success' => false,
                    'error_code' => 'TOKEN_EMPTY',
                    'message' => 'Token VibePlan AI kamu habis.',
                    'user_message' => 'Silakan ajukan reset token ke admin atau tunggu token kamu ditambahkan kembali.',
                    'actions' => ['request_token_reset'],
                ], 402);
            }

            [$project, $context] = $this->resolveGenerationContext($generationType, $validated);
            $prompt = $this->promptService->build(
                $generationType,
                $project,
                $this->shouldUseCompactMode($generationType, $validated),
                $context,
            );
            $maxTokens = $this->resolveMaxTokens($generationType, $validated);
            $aiResult = $this->aiService->generateMarkdown($prompt, [
                'max_tokens' => $maxTokens,
            ]);

            if ($this->shouldContinueGeneration($generationType, $validated, $context, $aiResult)) {
                $continuedResult = $this->continueTruncatedGeneration(
                    $generationType,
                    $project,
                    $context,
                    $validated,
                    $aiResult,
                    $maxTokens,
                );

                if ($continuedResult !== null) {
                    $aiResult = $continuedResult;
                    $retryUsed = true;
                } elseif ($this->shouldRetryPrdNormalForm($generationType, $validated)) {
                    $retryContext = [...$context, 'concise_retry' => true];
                    $retryPrompt = $this->promptService->build(
                        $generationType,
                        $project,
                        false,
                        $retryContext,
                    );
                    $retryResult = $this->aiService->generateMarkdown(
                        $retryPrompt,
                        $this->continuationAiOptions($generationType, $maxTokens)
                    );

                    if (! $this->shouldContinueGeneration($generationType, $validated, $retryContext, $retryResult)) {
                        $aiResult = $retryResult;
                        $prompt = $retryPrompt;
                        $context = $retryContext;
                        $retryUsed = true;
                    } else {
                        return $this->truncatedResponse(
                            $generationType,
                            $maxTokens,
                            $retryResult,
                            true,
                            $this->shouldUseCompactMode($generationType, $validated),
                        );
                    }
                } elseif ($this->shouldRetryNextStepNormalMode($generationType, $validated)) {
                    $retryContext = [...$context, 'normal_mode_retry' => true];
                    $retryPrompt = $this->promptService->build(
                        $generationType,
                        $project,
                        false,
                        $retryContext,
                    );
                    $retryResult = $this->aiService->generateMarkdown(
                        $retryPrompt,
                        $this->continuationAiOptions($generationType, $maxTokens)
                    );

                    if (! $this->shouldContinueGeneration($generationType, $validated, $retryContext, $retryResult)) {
                        $aiResult = $retryResult;
                        $prompt = $retryPrompt;
                        $context = $retryContext;
                        $retryUsed = true;
                    } else {
                        return $this->truncatedResponse(
                            $generationType,
                            $maxTokens,
                            $retryResult,
                            true,
                            false,
                        );
                    }
                } elseif ($this->shouldRetryCodingPromptNormalMode($generationType, $validated)) {
                    $retryContext = [...$context, 'normal_mode_retry' => true];
                    $retryPrompt = $this->promptService->build(
                        $generationType,
                        $project,
                        false,
                        $retryContext,
                    );
                    $retryResult = $this->aiService->generateMarkdown(
                        $retryPrompt,
                        $this->continuationAiOptions($generationType, $maxTokens)
                    );

                    if (! $this->shouldContinueGeneration($generationType, $validated, $retryContext, $retryResult)) {
                        $aiResult = $retryResult;
                        $prompt = $retryPrompt;
                        $context = $retryContext;
                        $retryUsed = true;
                    } else {
                        return $this->truncatedResponse(
                            $generationType,
                            $maxTokens,
                            $retryResult,
                            true,
                            false,
                        );
                    }
                } else {
                    return $this->truncatedResponse(
                        $generationType,
                        $maxTokens,
                        $aiResult,
                        false,
                        $this->shouldUseCompactMode($generationType, $validated),
                    );
                }
            }

            $markdown = $this->markdownService->normalize($aiResult['markdown_content']);

            if ($markdown === '') {
                throw new RuntimeException('Generated markdown content is empty.');
            }

            $titleSource = trim((string) ($context['title_source'] ?? ''));

            if ($titleSource === '') {
                $titleSource = (string) $project->project_name;
            }

            $generation = AiGeneration::query()->create([
                'project_id' => (string) $project->getKey(),
                'user_id' => (string) $authenticatedUser->getKey(),
                'generation_type' => $generationType,
                'title' => $this->markdownService->titleFor($generationType, $titleSource),
                'markdown_content' => $markdown,
                'json_content' => [
                    'project_name' => (string) ($project->project_name ?? ''),
                    'generation_mode' => (string) ($validated['generation_mode'] ?? 'normal'),
                    'coding_workflow' => $context['coding_workflow'] ?? null,
                    'selected_agent_label' => $context['coding_workflow_label'] ?? null,
                    'max_tokens_used' => $maxTokens,
                    'retry_used' => $retryUsed,
                    'finish_reason' => $aiResult['finish_reason'] ?? null,
                    'source_generation_id' => $context['source_generation_id'] ?? null,
                    'prd_source_mode' => $context['prd_source_mode'] ?? null,
                    'uploaded_prd_filename' => $context['uploaded_prd_filename'] ?? null,
                    'prompt_source_mode' => $context['prompt_source_mode'] ?? null,
                    'uploaded_next_step_filename' => $context['uploaded_next_step_filename'] ?? null,
                    'next_step_was_trimmed' => $context['next_step_was_trimmed'] ?? null,
                    'original_next_step_length' => $context['original_next_step_length'] ?? null,
                    'trimmed_next_step_length' => $context['trimmed_next_step_length'] ?? null,
                    'agent_mode' => $context['agent_mode'] ?? null,
                    'selected_agent' => $context['selected_agent'] ?? null,
                    'prd_was_trimmed' => $context['prd_was_trimmed'] ?? null,
                    'original_prd_length' => $context['original_prd_length'] ?? null,
                    'trimmed_prd_length' => $context['trimmed_prd_length'] ?? null,
                    'prompt' => $prompt,
                    'input_snapshot' => $project->only([
                        'project_name',
                        'project_idea',
                        'target_user',
                        'main_problem',
                        'app_type',
                        'tech_stack',
                        'skill_level',
                        'initial_prd',
                    ]),
                    'response_meta' => [
                        'id' => data_get($aiResult['raw_response'], 'id'),
                        'usage' => data_get($aiResult['raw_response'], 'usage'),
                        'finish_reason' => data_get($aiResult['raw_response'], 'choices.0.finish_reason'),
                    ],
                ],
                'ai_provider' => $aiResult['provider'],
                'ai_model' => $aiResult['model'],
            ]);

            $authenticatedUser->token_balance = max(0, (int) $authenticatedUser->token_balance - 1);
            $authenticatedUser->save();

            $this->activityLogger->log(
                $request,
                match ($generationType) {
                    'prd' => 'generate_prd',
                    'next-step' => 'generate_next_step',
                    'coding-prompt' => 'generate_coding_prompt',
                    default => 'generate_ai_content',
                },
                'User membuat hasil generate AI baru.',
                [
                    'generation_id' => (string) $generation->getKey(),
                    'generation_type' => $generationType,
                    'project_id' => (string) $project->getKey(),
                    'token_balance_after' => (int) $authenticatedUser->token_balance,
                ],
                $authenticatedUser,
                $authenticatedUser,
            );

            return response()->json([
                'success' => true,
                'message' => $generationType === 'coding-prompt'
                    ? 'Coding prompts generated successfully'
                    : 'Generation created successfully.',
                'data' => [
                    'id' => (string) $generation->getKey(),
                    '_id' => (string) $generation->getKey(),
                    'generation_type' => $generation->generation_type,
                    'title' => $generation->title,
                    'markdown_content' => $generation->markdown_content,
                    'project' => $project,
                    'generation' => $generation,
                ],
            ], 201);
        } catch (TokenLimitExceededException $exception) {
            $this->logGenerateRequestFailed($requestStartedAt, $generationType, $exception);
            report($exception);

            return response()->json([
                'success' => false,
                'error_code' => 'PROVIDER_LIMIT',
                'message' => 'Kuota AI sedang terbatas.',
                'user_message' => 'Sistem sedang terkena batas kuota provider. Silakan coba Mode Ringkas, coba lagi nanti, atau hubungi admin.',
                'actions' => ['compact_mode', 'request_admin_help'],
            ], 429);
        } catch (AiProviderException $exception) {
            $this->logGenerateRequestFailed($requestStartedAt, $generationType, $exception);
            report($exception);

            if ($exception->errorCode() === 'INPUT_TOO_LARGE') {
                return response()->json([
                    'success' => false,
                    'error_code' => 'INPUT_TOO_LARGE',
                    'message' => 'File PRD terlalu panjang untuk diproses dalam mode normal.',
                    'user_message' => 'Gunakan Mode Ringkas atau upload PRD yang lebih pendek agar hasil dapat dibuat dengan stabil.',
                    'actions' => ['compact_mode', 'reduce_input'],
                ], 422);
            }

            return response()->json([
                'success' => false,
                'error_code' => $exception->errorCode(),
                'message' => $exception->getMessage(),
                'user_message' => $exception->userMessage() ?? $exception->getMessage(),
                'details' => config('app.debug')
                    ? ($exception->rawProviderMessage() ?? $exception->getMessage())
                    : null,
            ], $exception->status());
        } catch (RuntimeException $exception) {
            $this->logGenerateRequestFailed($requestStartedAt, $generationType, $exception);
            return DatabaseErrorResponder::isMongoConnectivityError($exception)
                ? DatabaseErrorResponder::mongoUnavailable($exception)
                : response()->json([
                    'success' => false,
                    'message' => $exception->getMessage(),
                    'details' => config('app.debug')
                        ? ['file' => $exception->getFile(), 'line' => $exception->getLine()]
                        : null,
                ], 500);
        } catch (Throwable $exception) {
            $this->logGenerateRequestFailed($requestStartedAt, $generationType, $exception);
            report($exception);

            return DatabaseErrorResponder::isMongoConnectivityError($exception)
                ? DatabaseErrorResponder::mongoUnavailable(
                    $exception,
                    'Database sedang tidak dapat diakses. Periksa konfigurasi MongoDB Atlas atau coba lagi nanti.'
                )
                : response()->json([
                    'success' => false,
                    'message' => 'Failed to generate content. Check MongoDB and AI service configuration, then try again.',
                    'details' => config('app.debug')
                        ? ['file' => $exception->getFile(), 'line' => $exception->getLine()]
                        : null,
                ], 500);
        }
    }

    /**
     * @param  array<string, mixed>  $validated
     */
    private function rulesFor(string $generationType): array
    {
        $projectNameRule = $generationType === 'coding-prompt'
            ? ['nullable', 'string', 'max:150']
            : ($generationType === 'next-step'
                ? ['required_without_all:project_id,source_generation_id,prd_markdown', 'string', 'max:150']
                : ['required_without:project_id', 'string', 'max:150']);
        $projectIdeaRule = $generationType === 'coding-prompt'
            ? ['nullable', 'string', 'max:'.self::PROJECT_IDEA_MAX_LENGTH]
            : ($generationType === 'next-step'
                ? ['required_without_all:project_id,source_generation_id,prd_markdown', 'string', 'max:'.self::PROJECT_IDEA_MAX_LENGTH]
                : ['required_without:project_id', 'string', 'max:'.self::PROJECT_IDEA_MAX_LENGTH]);

        $rules = [
            'project_id' => ['nullable', 'string'],
            'generation_mode' => ['nullable', 'in:normal,compact'],
            'project_name' => $projectNameRule,
            'project_idea' => $projectIdeaRule,
            'target_user' => ['nullable', 'string', 'max:500'],
            'main_problem' => ['nullable', 'string', 'max:1000'],
            'app_type' => ['nullable', 'string', 'max:100'],
            'tech_stack' => ['nullable', 'string', 'max:500'],
            'skill_level' => ['nullable', 'string', 'max:100'],
            'initial_prd' => ['nullable', 'string', 'max:15000'],
        ];

        if ($generationType === 'next-step') {
            $rules['source_generation_id'] = ['nullable', 'string'];
            $rules['prd_source_mode'] = ['nullable', 'in:form,upload'];
            $rules['prd_markdown'] = ['nullable', 'required_if:prd_source_mode,upload', 'string', 'max:1000000'];
            $rules['uploaded_prd_filename'] = ['nullable', 'string', 'max:255'];
            $rules['coding_workflow'] = ['nullable', 'in:auto,codex,claude_code,github_copilot,antigravity,manual_beginner'];
            $rules['agent_mode'] = ['nullable', 'in:auto,manual'];
            $rules['selected_agent'] = [
                'nullable',
                'required_if:agent_mode,manual',
                'in:codex,claude_code,github_copilot,antigravity,manual_beginner',
            ];
        }

        if ($generationType === 'coding-prompt') {
            $rules['prompt_source_mode'] = ['required', 'in:next-step-upload'];
            $rules['next_step_markdown'] = ['required', 'string', 'max:1000000'];
            $rules['uploaded_next_step_filename'] = ['nullable', 'string', 'max:255'];
            $rules['coding_workflow'] = [
                'nullable',
                'in:auto,codex,claude_code,github_copilot,antigravity,manual_beginner',
            ];
            $rules['selected_agent'] = [
                'nullable',
                'in:codex,claude_code,github_copilot,antigravity,manual_beginner',
            ];
        }

        return $rules;
    }

    /**
     * @param  array<string, mixed>  $validated
     * @return array{0: Project, 1: array<string, mixed>}
     */
    private function resolveGenerationContext(string $generationType, array $validated): array
    {
        $context = [];

        if ($generationType === 'coding-prompt') {
            return $this->resolveCodingPromptContext($validated);
        }

        if ($generationType !== 'next-step') {
            return [$this->resolveProject($validated), $context];
        }

        $workflow = (string) ($validated['coding_workflow'] ?? 'auto');
        $context['coding_workflow'] = $workflow;
        $context['coding_workflow_label'] = $this->resolveWorkflowLabel($workflow);
        $context['agent_mode'] = $workflow === 'auto' ? 'auto' : 'manual';
        $context['selected_agent'] = $workflow === 'auto' ? null : $workflow;

        if (! empty($validated['source_generation_id'])) {
            $sourceGeneration = AiGeneration::query()->find($validated['source_generation_id']);

            if (! $sourceGeneration) {
                throw new RuntimeException('Source generation not found.');
            }

            $project = Project::query()->find($sourceGeneration->project_id);

            if (! $project) {
                throw new RuntimeException('Project not found for the selected source generation.');
            }

            $context['source_generation_id'] = (string) ($sourceGeneration->id ?? $sourceGeneration->getKey());
            $context['prd_source_mode'] = 'saved-generation';
            $context['source_generation_markdown'] = (string) $sourceGeneration->markdown_content;
            $context['source_generation_type'] = (string) $sourceGeneration->generation_type;
            $context['title_source'] = (string) $project->project_name;

            return [$project, $context];
        }

        if (($validated['prd_source_mode'] ?? 'form') === 'upload') {
            $uploadedPrdFilename = trim((string) ($validated['uploaded_prd_filename'] ?? ''));
            $project = $this->createProjectFromUploadedPrd(
                $validated,
                $uploadedPrdFilename,
                (string) ($validated['prd_markdown'] ?? '')
            );
            $preparedPrd = $this->uploadedPrdPreparationService->prepareForAi(
                (string) ($validated['prd_markdown'] ?? ''),
                (string) ($validated['generation_mode'] ?? 'normal'),
            );

            $context['prd_source_mode'] = 'upload';
            $context['uploaded_prd_filename'] = $uploadedPrdFilename !== '' ? $uploadedPrdFilename : null;
            $context['source_generation_markdown'] = $preparedPrd['markdown'];
            $context['source_generation_type'] = 'uploaded-prd';
            $context['title_source'] = (string) $project->project_name;
            $context['prd_was_trimmed'] = $preparedPrd['was_trimmed'];
            $context['original_prd_length'] = $preparedPrd['original_length'];
            $context['trimmed_prd_length'] = $preparedPrd['trimmed_length'];

            return [$project, $context];
        }

        $context['prd_source_mode'] = 'form';
        $context['title_source'] = (string) ($validated['project_name'] ?? '');

        return [$this->resolveProject($validated), $context];
    }

    /**
     * @param  array<string, mixed>  $validated
     */
    private function resolveProject(array $validated): Project
    {
        $projectAttributes = $this->normalizeProjectAttributes(collect($validated)
            ->only([
                'project_name',
                'project_idea',
                'target_user',
                'main_problem',
                'app_type',
                'tech_stack',
                'skill_level',
                'initial_prd',
            ])
            ->filter(static fn ($value) => $value !== null)
            ->all());

        if (! empty($validated['project_id'])) {
            $project = Project::query()->find($validated['project_id']);

            if (! $project) {
                throw new RuntimeException('Project not found.');
            }

            if ($projectAttributes !== []) {
                $project->fill($projectAttributes);
                $project->save();
            }

            return $project;
        }

        return Project::query()->create($projectAttributes);
    }

    /**
     * @param  array<string, mixed>  $projectAttributes
     * @return array<string, mixed>
     */
    private function normalizeProjectAttributes(array $projectAttributes): array
    {
        if (array_key_exists('tech_stack', $projectAttributes)) {
            $projectAttributes['tech_stack'] = $this->normalizeTechStackField(
                (string) $projectAttributes['tech_stack']
            );
        }

        return $projectAttributes;
    }

    private function normalizeTechStackField(string $techStack): string
    {
        $normalized = trim($techStack);

        if ($normalized === '') {
            return '';
        }

        $patterns = [
            '/\bReact(?:\.js|js)?\b/i' => 'React.js',
            '/\bNode(?:\.js|js)?\b/i' => 'Node.js',
            '/\bSupabase(?:\s+PostgreSQL)?\b/i' => 'Supabase PostgreSQL',
            '/\bMongo(?:DB)?\b/i' => 'MongoDB',
            '/\bPostgre(?:SQL)?\b/i' => 'PostgreSQL',
        ];

        foreach ($patterns as $pattern => $replacement) {
            $normalized = preg_replace($pattern, $replacement, $normalized) ?? $normalized;
        }

        $normalized = preg_replace('/\s*,\s*/', ', ', $normalized) ?? $normalized;
        $normalized = preg_replace('/\s{2,}/', ' ', $normalized) ?? $normalized;

        return trim($normalized);
    }

    private function normalizeWorkflowInputs(Request $request, string $generationType): void
    {
        if (! in_array($generationType, ['next-step', 'coding-prompt'], true)) {
            return;
        }

        $workflow = $request->input('coding_workflow');

        if (! is_string($workflow) || trim($workflow) === '') {
            $legacyAgent = $request->input('selected_agent');
            $legacyMode = $request->input('agent_mode');

            if (is_string($legacyAgent) && trim($legacyAgent) !== '') {
                $workflow = $legacyAgent;
            } elseif ($legacyMode === 'auto') {
                $workflow = 'auto';
            } else {
                $workflow = $generationType === 'coding-prompt' ? 'auto' : 'auto';
            }
        }

        $workflow = strtolower(trim((string) $workflow));
        $workflow = str_replace('-', '_', $workflow);

        $request->merge([
            'coding_workflow' => $workflow,
            'selected_agent' => $request->filled('selected_agent') ? $workflow : $request->input('selected_agent'),
        ]);
    }

    private function resolveWorkflowLabel(string $workflow): string
    {
        return match ($workflow) {
            'auto' => 'Auto Recommend Agent',
            'codex' => 'Codex',
            'claude_code' => 'Claude Code',
            'github_copilot' => 'GitHub Copilot',
            'antigravity' => 'Antigravity',
            'manual_beginner' => 'Manual Beginner Guide',
            default => 'Auto Recommend Agent',
        };
    }

    /**
     * @param  array<string, mixed>  $validated
     */
    private function shouldUseCompactMode(string $generationType, array $validated): bool
    {
        return ($validated['generation_mode'] ?? null) === 'compact';
    }

    /**
     * @param  array<string, mixed>  $validated
     */
    private function resolveMaxTokens(string $generationType, array $validated): int
    {
        $compactMode = $this->shouldUseCompactMode($generationType, $validated);
        $configuredTokens = $compactMode
            ? (int) config('services.ai.compact_max_tokens', 600)
            : match ($generationType) {
            'prd' => (int) config('services.ai.prd_max_tokens', 2800),
            'next-step' => (int) config('services.ai.next_step_max_tokens', 1800),
            'coding-prompt' => (int) config('services.ai.coding_prompt_max_tokens', 1400),
            default => (int) config('services.ai.max_tokens', 1200),
        };

        return $this->capTokensForProvider($generationType, $configuredTokens, $compactMode);
    }

    private function capTokensForProvider(string $generationType, int $configuredTokens, bool $compactMode): int
    {
        $provider = strtolower((string) config('services.ai.provider', ''));
        $model = strtolower((string) config('services.ai.model', ''));

        if ($provider !== 'gemini' || ! str_contains($model, 'gemma')) {
            return $configuredTokens;
        }

        $cap = $compactMode
            ? 600
            : match ($generationType) {
                'prd' => 1800,
                'next-step' => 1800,
                'coding-prompt' => 1600,
                default => 1200,
            };

        return min($configuredTokens, $cap);
    }

    private function logGenerateRequestReceived(Request $request, string $generationType): void
    {
        Log::info('Generate request received.', [
            'generation_type' => $generationType,
            'generation_mode' => (string) $request->input('generation_mode', 'normal'),
            'coding_workflow' => $request->input('coding_workflow'),
            'user_id' => (string) ($request->user()?->getKey() ?? ''),
            'project_name' => mb_substr((string) $request->input('project_name', ''), 0, 120),
            'source_generation_id' => $request->input('source_generation_id'),
            'prd_source_mode' => $request->input('prd_source_mode'),
            'prompt_source_mode' => $request->input('prompt_source_mode'),
            'content_lengths' => [
                'project_idea' => mb_strlen((string) $request->input('project_idea', '')),
                'initial_prd' => mb_strlen((string) $request->input('initial_prd', '')),
                'prd_markdown' => mb_strlen((string) $request->input('prd_markdown', '')),
                'next_step_markdown' => mb_strlen((string) $request->input('next_step_markdown', '')),
            ],
        ]);
    }

    private function logGenerateRequestFailed(float $startedAt, string $generationType, Throwable $exception): void
    {
        Log::warning('Generate request failed.', [
            'generation_type' => $generationType,
            'duration_ms' => (int) round((microtime(true) - $startedAt) * 1000),
            'exception' => $exception::class,
            'message' => $exception->getMessage(),
        ]);
    }

    private function extendExecutionWindow(): void
    {
        $runtimeConfig = $this->aiService->runtimeConfig();
        $provider = strtolower((string) ($runtimeConfig['provider'] ?? ''));
        $model = strtolower((string) ($runtimeConfig['model'] ?? ''));
        $baseTimeout = (int) ($runtimeConfig['timeout'] ?? config('services.ai.timeout', 120));
        $timeout = max(180, $baseTimeout + 30);

        if ($provider === 'gemini' && str_contains($model, 'gemma')) {
            $timeout = max(300, $baseTimeout + 180);
        }

        if (function_exists('set_time_limit')) {
            @set_time_limit($timeout);
        }

        @ini_set('max_execution_time', (string) $timeout);
    }

    /**
     * @param  array<string, mixed>  $validated
     */
    private function shouldRetryPrdNormalForm(string $generationType, array $validated): bool
    {
        return $generationType === 'prd'
            && ! $this->shouldUseCompactMode($generationType, $validated);
    }

    /**
     * @param  array<string, mixed>  $validated
     */
    private function shouldRetryCodingPromptNormalMode(string $generationType, array $validated): bool
    {
        return $generationType === 'coding-prompt'
            && ! $this->shouldUseCompactMode($generationType, $validated);
    }

    /**
     * @param  array<string, mixed>  $validated
     */
    private function shouldRetryNextStepNormalMode(string $generationType, array $validated): bool
    {
        return $generationType === 'next-step'
            && ! $this->shouldUseCompactMode($generationType, $validated);
    }

    /**
     * @param  array<string, mixed>  $aiResult
     */
    private function isTruncatedResponse(array $aiResult): bool
    {
        $finishReason = strtolower((string) ($aiResult['finish_reason'] ?? ''));

        if (! in_array($finishReason, ['length', 'max_tokens'], true)) {
            return false;
        }

        $markdown = trim((string) ($aiResult['markdown_content'] ?? ''));

        if ($markdown === '') {
            return true;
        }

        if (substr_count($markdown, '```') % 2 !== 0) {
            return true;
        }

        $lastCharacter = mb_substr($markdown, -1);

        return ! in_array($lastCharacter, ['.', '!', '?', '`', '|', ')', ']', '*'], true);
    }

    /**
     * @param  array<string, mixed>  $validated
     * @param  array<string, mixed>  $context
     * @param  array<string, mixed>  $aiResult
     */
    private function shouldContinueGeneration(
        string $generationType,
        array $validated,
        array $context,
        array $aiResult,
    ): bool {
        if ($this->isTruncatedResponse($aiResult)) {
            return true;
        }

        if ($this->isMissingExpectedHeadings(
            $generationType,
            $this->shouldUseCompactMode($generationType, $validated),
            $context,
            (string) ($aiResult['markdown_content'] ?? '')
        )) {
            return true;
        }

        if ($generationType === 'prd') {
            return $this->isPrdContentTooThin(
                $this->shouldUseCompactMode($generationType, $validated),
                (string) ($aiResult['markdown_content'] ?? '')
            );
        }

        return false;
    }

    /**
     * @param  array<string, mixed>  $context
     */
    private function isMissingExpectedHeadings(
        string $generationType,
        bool $compactMode,
        array $context,
        string $markdown,
    ): bool {
        $content = trim($markdown);

        if ($content === '') {
            return true;
        }

        $expectedHeadings = $this->promptService->expectedHeadings($generationType, $compactMode, $context);

        foreach ($expectedHeadings as $heading) {
            if (! $this->markdownContainsHeading($content, $heading)) {
                return true;
            }
        }

        return false;
    }

    private function markdownContainsHeading(string $markdown, string $heading): bool
    {
        $normalizedHeading = trim($heading);

        if ($normalizedHeading === '# PRD') {
            return preg_match('/^#\s+PRD\b/im', $markdown) === 1;
        }

        if ($normalizedHeading === '# Next Step Planner') {
            return preg_match('/^#\s+Next Step Planner\b/im', $markdown) === 1;
        }

        if ($normalizedHeading === '# Coding Prompt Generator - Mode Ringkas') {
            return preg_match('/^#\s+Coding Prompt Generator\s*-\s*Mode Ringkas\b/im', $markdown) === 1;
        }

        if ($normalizedHeading === '# Coding Prompt Generator - Normal Mode') {
            return preg_match('/^#\s+Coding Prompt Generator\s*-\s*Normal Mode\b/im', $markdown) === 1;
        }

        return preg_match('/^'.preg_quote($normalizedHeading, '/').'\s*$/im', $markdown) === 1;
    }

    /**
     * @param  array<string, mixed>  $aiResult
     */
    private function truncatedResponse(
        string $generationType,
        int $maxTokens,
        array $aiResult,
        bool $retried,
        bool $compactMode,
    ): JsonResponse
    {
        $isCompactCodingPrompt = $generationType === 'coding-prompt' && $compactMode;

        return response()->json([
            'success' => false,
            'error_code' => 'OUTPUT_TRUNCATED',
            'message' => 'Output AI terlalu panjang dan terpotong.',
            'user_message' => $isCompactCodingPrompt
                ? 'Output masih terlalu panjang meskipun Mode Ringkas aktif. Kurangi isi file input atau pilih langkah roadmap yang lebih spesifik.'
                : 'Gunakan Mode Ringkas atau kurangi detail input agar hasil lebih stabil.',
            'actions' => ['compact_mode', 'reduce_input'],
            'meta' => [
                'generation_type' => $generationType,
                'generation_mode' => $compactMode ? 'compact' : 'normal',
                'max_tokens_used' => $maxTokens,
                'finish_reason' => $aiResult['finish_reason'] ?? null,
                'prompt_tokens' => data_get($aiResult['raw_response'] ?? [], 'usage.prompt_tokens'),
                'completion_tokens' => data_get($aiResult['raw_response'] ?? [], 'usage.completion_tokens'),
                'retry_attempted' => $retried,
            ],
        ], 422);
    }

    /**
     * @param  array<string, mixed>  $context
     * @param  array<string, mixed>  $validated
     * @param  array<string, mixed>  $aiResult
     * @return array<string, mixed>|null
     */
    private function continueTruncatedGeneration(
        string $generationType,
        Project $project,
        array $context,
        array $validated,
        array $aiResult,
        int $maxTokens,
    ): ?array {
        $partialMarkdown = trim((string) ($aiResult['markdown_content'] ?? ''));

        if ($partialMarkdown === '') {
            return null;
        }

        $compactMode = $this->shouldUseCompactMode($generationType, $validated);
        $maxAttempts = $generationType === 'prd' ? 2 : 2;
        $combinedMarkdown = $partialMarkdown;
        $latestResult = $aiResult;

        for ($attempt = 0; $attempt < $maxAttempts; $attempt++) {
            if (
                $generationType === 'prd' &&
                ! $this->isTruncatedResponse($latestResult) &&
                ! $this->isMissingExpectedHeadings($generationType, $compactMode, $context, $combinedMarkdown) &&
                $this->isPrdContentTooThin($compactMode, $combinedMarkdown)
            ) {
                $enrichedMarkdown = $this->enrichThinPrdSections(
                    $project,
                    $context,
                    $compactMode,
                    $combinedMarkdown,
                    $maxTokens,
                );

                if ($enrichedMarkdown === null) {
                    return null;
                }

                $latestResult['markdown_content'] = $enrichedMarkdown;
                return $latestResult;
            }

            $attemptContext = $context;
            $continuationSourceMarkdown = $combinedMarkdown;

            if ($generationType === 'prd') {
                $focus = $this->buildPrdContinuationFocus($compactMode, $combinedMarkdown);

                if ($focus !== '') {
                    $attemptContext['continuation_focus'] = $focus;
                }

                $attemptContext['partial_context_mode'] = 'condensed_snapshot';
                $continuationSourceMarkdown = $this->buildPrdContinuationSnapshot($combinedMarkdown);
            }

            $continuationPrompt = $this->promptService->buildContinuationPrompt(
                $generationType,
                $project,
                $continuationSourceMarkdown,
                $compactMode,
                $attemptContext,
            );

            $continuationResult = $this->aiService->generateMarkdown(
                $continuationPrompt,
                $this->continuationAiOptions($generationType, $maxTokens)
            );

            $mergedMarkdown = $this->mergeMarkdownSegments(
                $combinedMarkdown,
                (string) ($continuationResult['markdown_content'] ?? '')
            );

            if ($mergedMarkdown === '') {
                return null;
            }

            $combinedMarkdown = $mergedMarkdown;
            $latestResult = $continuationResult;
            $latestResult['markdown_content'] = $combinedMarkdown;

            if (! $this->shouldContinueGeneration($generationType, $validated, $context, $latestResult)) {
                return $latestResult;
            }
        }

        return null;
    }

    private function enrichThinPrdSections(
        Project $project,
        array $context,
        bool $compactMode,
        string $markdown,
        int $maxTokens,
    ): ?string {
        $coverage = $this->detectPrdCoverageGaps($compactMode, $markdown);
        $updatedMarkdown = $markdown;

        if ($coverage['data_model']) {
            $replacement = $this->generatePrdSectionReplacement(
                $project,
                'Data Model & ERD',
                $compactMode,
                $updatedMarkdown,
                $maxTokens
            );

            if ($replacement === null) {
                return null;
            }

            $updatedMarkdown = $this->replacePrdSectionByTitle(
                $updatedMarkdown,
                'Data Model & ERD',
                'API Design',
                $replacement
            );
        }

        if ($coverage['api_design']) {
            $replacement = $this->generatePrdSectionReplacement(
                $project,
                'API Design',
                $compactMode,
                $updatedMarkdown,
                $maxTokens
            );

            if ($replacement === null) {
                return null;
            }

            $updatedMarkdown = $this->replacePrdSectionByTitle(
                $updatedMarkdown,
                'API Design',
                'UI Pages / Screens',
                $replacement
            );
        }

        return trim($updatedMarkdown) !== '' ? $updatedMarkdown : null;
    }

    /**
     * @return array<string, mixed>
     */
    private function continuationAiOptions(string $generationType, int $maxTokens): array
    {
        $options = [
            'max_tokens' => $maxTokens,
        ];

        $runtimeConfig = $this->aiService->runtimeConfig();
        $provider = strtolower((string) ($runtimeConfig['provider'] ?? ''));
        $model = strtolower((string) ($runtimeConfig['model'] ?? ''));
        $fallbackModels = $runtimeConfig['fallback_models'] ?? [];

        if (! is_array($fallbackModels)) {
            $fallbackModels = [];
        }

        if ($provider !== 'gemini' || ! str_contains($model, 'gemma') || ! isset($fallbackModels[0])) {
            return $options;
        }

        $options['model'] = (string) $fallbackModels[0];
        $options['fallback_models'] = array_values(array_slice($fallbackModels, 1));
        $options['thinking_budget'] = 0;
        $options['max_tokens'] = $this->resolveFallbackContinuationMaxTokens($generationType, $maxTokens);

        return $options;
    }

    private function resolveFallbackContinuationMaxTokens(string $generationType, int $maxTokens): int
    {
        $configuredTokens = match ($generationType) {
            'prd' => (int) config('services.ai.prd_max_tokens', 2800),
            'next-step' => (int) config('services.ai.next_step_max_tokens', 1800),
            'coding-prompt' => (int) config('services.ai.coding_prompt_max_tokens', 1400),
            default => (int) config('services.ai.max_tokens', 1600),
        };

        return max($maxTokens, $configuredTokens);
    }

    private function isPrdContentTooThin(bool $compactMode, string $markdown): bool
    {
        $issues = $this->detectPrdCoverageIssues($compactMode, $markdown);

        return $issues !== [];
    }

    private function buildPrdContinuationFocus(bool $compactMode, string $markdown): string
    {
        $issues = $this->detectPrdCoverageIssues($compactMode, $markdown);

        if ($issues === []) {
            return '';
        }

        return implode("\n- ", $issues);
    }

    /**
     * @return array{data_model: bool, api_design: bool}
     */
    private function detectPrdCoverageGaps(bool $compactMode, string $markdown): array
    {
        $dataModelHeading = $compactMode ? '## 8. Data Model & ERD' : '## 20. Data Model & ERD';
        $apiHeading = $compactMode ? '## 9. API Design' : '## 21. API Design';
        $nextHeading = $compactMode ? '## 10. UI Pages / Screens' : '## 22. UI Pages / Screens';

        $dataModelSection = $this->extractSectionMarkdown($markdown, $dataModelHeading, $apiHeading);
        $apiSection = $this->extractSectionMarkdown($markdown, $apiHeading, $nextHeading);

        $entityCount = preg_match_all('/^#{3,4}\s+[A-Z][A-Z0-9_ -]{2,}\s*$/m', $dataModelSection);
        $entityTypeCount = preg_match_all('/^\*\*Entity Type:\*\*\s*.+$/mi', $dataModelSection);
        $fieldTableCount = preg_match_all('/^\|\s*Field\s*\|\s*Type\s*\|\s*Required\s*\|\s*Nullable\s*\|\s*Default\s*\|\s*Unique\s*\|\s*Indexed\s*\|\s*Example\s*\|\s*Validation\s*\|\s*Description\s*\|/mi', $dataModelSection);
        $relatedApiCount = preg_match_all('/^\*\*Related APIs:\*\*\s*$/mi', $dataModelSection);
        $indexesCount = preg_match_all('/^\*\*Indexes:\*\*\s*$/mi', $dataModelSection);

        $endpointHeadingCount = preg_match_all('/^####\s+(GET|POST|PUT|PATCH|DELETE)\s+\/api\/v\d+\/.+$/mi', $apiSection);
        $endpointBulletCount = preg_match_all('/^\s*[-*]\s+(GET|POST|PUT|PATCH|DELETE)\s+`?\/api\/v\d+\/.+$/mi', $apiSection);
        $apiModuleCount = preg_match_all('/^###\s+.+API\s*$/mi', $apiSection);
        $purposeCount = preg_match_all('/^\*\*Purpose:\*\*\s*.+$/mi', $apiSection);
        $requestBodyCount = preg_match_all('/^\*\*Request Body:\*\*\s*$/mi', $apiSection);
        $successResponseCount = preg_match_all('/^\*\*Success Response:\*\*\s*$/mi', $apiSection);
        $errorResponsesCount = preg_match_all('/^\*\*Error Responses:\*\*\s*$/mi', $apiSection);
        $businessRulesCount = preg_match_all('/^\*\*Business Rules:\*\*\s*$/mi', $apiSection);
        $relatedDataModelCount = preg_match_all('/^\*\*Related Data Model:\*\*\s*$/mi', $apiSection);
        $jsonResponseBlockCount = preg_match_all('/```json[\s\S]*?```/mi', $apiSection);
        $totalEndpointCount = $endpointHeadingCount + $endpointBulletCount;

        $minimumEntities = $compactMode ? 4 : 6;
        $minimumEndpoints = $compactMode ? 8 : 12;
        $minimumModules = $compactMode ? 3 : 5;
        $minimumDetailedEndpoints = $compactMode ? 4 : 7;

        $dataModelThin =
            $entityCount < $minimumEntities ||
            $entityTypeCount < $minimumEntities ||
            $fieldTableCount < $minimumEntities ||
            $relatedApiCount < $minimumEntities ||
            $indexesCount < $minimumEntities;

        $apiDesignThin =
            $totalEndpointCount < $minimumEndpoints ||
            $apiModuleCount < $minimumModules ||
            $purposeCount < $minimumDetailedEndpoints ||
            $requestBodyCount < $minimumDetailedEndpoints ||
            $successResponseCount < $minimumDetailedEndpoints ||
            $errorResponsesCount < $minimumDetailedEndpoints ||
            $businessRulesCount < $minimumDetailedEndpoints ||
            $relatedDataModelCount < $minimumDetailedEndpoints ||
            $jsonResponseBlockCount < ($compactMode ? 3 : 5) ||
            (
                $apiSection !== '' &&
                preg_match('/^###\s+API Overview\s*$/mi', $apiSection) === 1 &&
                $totalEndpointCount <= 2
            );

        return [
            'data_model' => $dataModelThin,
            'api_design' => $apiDesignThin,
        ];
    }

    private function buildPrdContinuationSnapshot(string $markdown): string
    {
        $headingMatches = [];
        preg_match_all('/^#{1,4}\s+.+$/m', $markdown, $headingMatches);
        $headingList = array_slice($headingMatches[0] ?? [], 0, 60);

        $dataModelSection = $this->extractPrdSectionByTitle($markdown, 'Data Model & ERD', 'API Design');
        $apiSection = $this->extractPrdSectionByTitle($markdown, 'API Design', 'UI Pages / Screens');
        $tailExcerpt = $this->truncatePromptExcerpt($markdown, 3500, false);

        return trim(implode("\n\n", array_filter([
            $headingList !== [] ? "Existing heading map:\n".implode("\n", $headingList) : null,
            $dataModelSection !== '' ? "Current Data Model & ERD snapshot:\n".$this->truncatePromptExcerpt($dataModelSection, 7000) : null,
            $apiSection !== '' ? "Current API Design snapshot:\n".$this->truncatePromptExcerpt($apiSection, 9000) : null,
            $tailExcerpt !== '' ? "Latest document tail:\n".$tailExcerpt : null,
        ])));
    }

    private function generatePrdSectionReplacement(
        Project $project,
        string $sectionTitle,
        bool $compactMode,
        string $markdown,
        int $maxTokens,
    ): ?string {
        $snapshot = $this->buildPrdSectionRevisionSnapshot($markdown, $sectionTitle, $compactMode);
        $prompt = $this->promptService->buildPrdSectionCompletionPrompt(
            $project,
            $sectionTitle,
            $snapshot,
            $compactMode
        );
        $result = $this->aiService->generateMarkdown(
            $prompt,
            $this->targetedPrdSectionAiOptions($sectionTitle, $maxTokens)
        );

        $replacement = trim((string) ($result['markdown_content'] ?? ''));

        return $replacement !== '' ? $replacement : null;
    }

    private function buildPrdSectionRevisionSnapshot(string $markdown, string $sectionTitle, bool $compactMode): string
    {
        $headingMatches = [];
        preg_match_all('/^#{1,4}\s+.+$/m', $markdown, $headingMatches);
        $headingList = array_slice($headingMatches[0] ?? [], 0, 80);
        $sectionSnapshot = $sectionTitle === 'Data Model & ERD'
            ? $this->extractPrdSectionByTitle($markdown, 'Data Model & ERD', 'API Design')
            : $this->extractPrdSectionByTitle($markdown, 'API Design', 'UI Pages / Screens');
        $dataModelSection = $sectionTitle === 'API Design'
            ? $this->extractPrdSectionByTitle($markdown, 'Data Model & ERD', 'API Design')
            : '';

        return trim(implode("\n\n", array_filter([
            $headingList !== [] ? "Existing heading map:\n".implode("\n", $headingList) : null,
            $sectionSnapshot !== '' ? "Current {$sectionTitle} snapshot:\n".$this->truncatePromptExcerpt($sectionSnapshot, 12000) : null,
            $dataModelSection !== '' ? "Current Data Model & ERD reference:\n".$this->truncatePromptExcerpt($dataModelSection, 8000) : null,
            "Mode: ".($compactMode ? 'compact' : 'normal'),
        ])));
    }

    /**
     * @return array<string, mixed>
     */
    private function targetedPrdSectionAiOptions(string $sectionTitle, int $maxTokens): array
    {
        $sectionMaxTokens = $sectionTitle === 'API Design'
            ? min(max($maxTokens, 2200), 3200)
            : min(max($maxTokens, 2000), 2800);

        $options = [
            'max_tokens' => $sectionMaxTokens,
        ];

        $runtimeConfig = $this->aiService->runtimeConfig();
        $provider = strtolower((string) ($runtimeConfig['provider'] ?? ''));
        $model = strtolower((string) ($runtimeConfig['model'] ?? ''));
        $fallbackModels = $runtimeConfig['fallback_models'] ?? [];

        if (! is_array($fallbackModels)) {
            $fallbackModels = [];
        }

        if ($provider === 'gemini' && str_contains($model, 'gemma') && isset($fallbackModels[0])) {
            $options['model'] = (string) $fallbackModels[0];
            $options['fallback_models'] = array_values(array_slice($fallbackModels, 1));
            $options['thinking_budget'] = 0;
        }

        return $options;
    }

    /**
     * @return array<int, string>
     */
    private function detectPrdCoverageIssues(bool $compactMode, string $markdown): array
    {
        $issues = [];
        $dataModelHeading = $compactMode ? '## 8. Data Model & ERD' : '## 20. Data Model & ERD';
        $apiHeading = $compactMode ? '## 9. API Design' : '## 21. API Design';
        $nextHeading = $compactMode ? '## 10. UI Pages / Screens' : '## 22. UI Pages / Screens';

        $dataModelSection = $this->extractSectionMarkdown($markdown, $dataModelHeading, $apiHeading);
        $apiSection = $this->extractSectionMarkdown($markdown, $apiHeading, $nextHeading);

        $entityCount = preg_match_all('/^#{3,4}\s+[A-Z][A-Z0-9_ -]{2,}\s*$/m', $dataModelSection);
        $entityTypeCount = preg_match_all('/^\*\*Entity Type:\*\*\s*.+$/mi', $dataModelSection);
        $fieldTableCount = preg_match_all('/^\|\s*Field\s*\|\s*Type\s*\|\s*Required\s*\|\s*Nullable\s*\|\s*Default\s*\|\s*Unique\s*\|\s*Indexed\s*\|\s*Example\s*\|\s*Validation\s*\|\s*Description\s*\|/mi', $dataModelSection);
        $relatedApiCount = preg_match_all('/^\*\*Related APIs:\*\*\s*$/mi', $dataModelSection);
        $indexesCount = preg_match_all('/^\*\*Indexes:\*\*\s*$/mi', $dataModelSection);
        $endpointHeadingCount = preg_match_all('/^####\s+(GET|POST|PUT|PATCH|DELETE)\s+\/api\/v\d+\/.+$/mi', $apiSection);
        $endpointBulletCount = preg_match_all('/^\s*[-*]\s+(GET|POST|PUT|PATCH|DELETE)\s+`?\/api\/v\d+\/.+$/mi', $apiSection);
        $apiModuleCount = preg_match_all('/^###\s+.+API\s*$/mi', $apiSection);
        $purposeCount = preg_match_all('/^\*\*Purpose:\*\*\s*.+$/mi', $apiSection);
        $requestBodyCount = preg_match_all('/^\*\*Request Body:\*\*\s*$/mi', $apiSection);
        $successResponseCount = preg_match_all('/^\*\*Success Response:\*\*\s*$/mi', $apiSection);
        $errorResponsesCount = preg_match_all('/^\*\*Error Responses:\*\*\s*$/mi', $apiSection);
        $businessRulesCount = preg_match_all('/^\*\*Business Rules:\*\*\s*$/mi', $apiSection);
        $relatedDataModelCount = preg_match_all('/^\*\*Related Data Model:\*\*\s*$/mi', $apiSection);
        $jsonResponseBlockCount = preg_match_all('/```json[\s\S]*?```/mi', $apiSection);

        $minimumEntities = $compactMode ? 4 : 6;
        $minimumEndpoints = $compactMode ? 8 : 12;
        $minimumModules = $compactMode ? 3 : 5;
        $totalEndpointCount = $endpointHeadingCount + $endpointBulletCount;

        if ($entityCount < $minimumEntities) {
            $issues[] = "Section Data Dictionary masih terlalu tipis. Tambahkan minimal {$minimumEntities} entity inti yang benar-benar dibutuhkan sistem dan jabarkan masing-masing dengan lengkap.";
        }

        if ($entityTypeCount < $minimumEntities) {
            $issues[] = 'Setiap entity di Data Dictionary wajib menjelaskan jenis entity seperti Master, Transaction, Event Log, Configuration, Reference, Join, Analytics, atau System.';
        }

        if ($fieldTableCount < $minimumEntities) {
            $issues[] = 'Setiap entity di Data Dictionary harus punya field specification table lengkap, bukan hanya ringkasan field singkat.';
        }

        if ($relatedApiCount < $minimumEntities || $indexesCount < $minimumEntities) {
            $issues[] = 'Setiap entity di Data Dictionary harus menjelaskan Indexes, Related APIs, dan relasi penting agar kebutuhan backend serta database benar-benar ter-cover.';
        }

        if ($totalEndpointCount < $minimumEndpoints) {
            $issues[] = "Section API Design masih terlalu sedikit. Tambahkan minimal {$minimumEndpoints} endpoint realistis yang menutup semua proses sistem backend.";
        }

        if ($apiModuleCount < $minimumModules) {
            $issues[] = "API Design harus dibagi ke lebih banyak modul bisnis. Tambahkan minimal {$minimumModules} modul API yang sesuai kebutuhan sistem.";
        }

        if ($totalEndpointCount > 0) {
            $minimumDetailedEndpoints = $compactMode ? 4 : 7;

            if (
                $purposeCount < $minimumDetailedEndpoints ||
                $requestBodyCount < $minimumDetailedEndpoints ||
                $successResponseCount < $minimumDetailedEndpoints ||
                $errorResponsesCount < $minimumDetailedEndpoints ||
                $businessRulesCount < $minimumDetailedEndpoints ||
                $relatedDataModelCount < $minimumDetailedEndpoints
            ) {
                $issues[] = 'Endpoint API masih terlalu ringkas. Dokumentasikan lebih banyak endpoint dengan Purpose, Request Body, Success Response, Error Responses, Business Rules, dan Related Data Model.';
            }
        }

        if ($jsonResponseBlockCount < ($compactMode ? 3 : 5)) {
            $issues[] = 'API Design harus menampilkan lebih banyak contoh kontrak response JSON yang realistis, bukan hanya overview atau satu dua response singkat.';
        }

        if ($apiSection !== '' && preg_match('/^###\s+API Overview\s*$/mi', $apiSection) === 1 && $totalEndpointCount <= 2) {
            $issues[] = 'API Design tidak boleh berhenti di API Overview. Lanjutkan seluruh proses API per modul sampai lengkap untuk kebutuhan backend dan database.';
        }

        return $issues;
    }

    private function extractPrdSectionByTitle(string $markdown, string $startTitle, string $nextTitle): string
    {
        $content = trim($markdown);

        if ($content === '') {
            return '';
        }

        $pattern = '/^##\s*(?:\d+\.\s*)?'.preg_quote($startTitle, '/').'\s*$([\s\S]*?)(?=^##\s*(?:\d+\.\s*)?'.preg_quote($nextTitle, '/').'\s*$|\z)/mi';

        if (preg_match($pattern, $content, $matches) !== 1) {
            return '';
        }

        return trim($matches[1] ?? '');
    }

    private function extractSectionMarkdown(string $markdown, string $startHeading, string $nextHeading): string
    {
        $content = trim($markdown);

        if ($content === '' || ! $this->markdownContainsHeading($content, $startHeading)) {
            return '';
        }

        $pattern = '/^'.preg_quote($startHeading, '/').'\s*$([\s\S]*?)(?=^'.preg_quote($nextHeading, '/').'\s*$|\z)/mi';

        if (preg_match($pattern, $content, $matches) !== 1) {
            $startTitle = $this->headingTitle($startHeading);
            $nextTitle = $this->headingTitle($nextHeading);
            $fallbackPattern = '/^##\s*(?:\d+\.\s*)?'.preg_quote($startTitle, '/').'\s*$([\s\S]*?)(?=^##\s*(?:\d+\.\s*)?'.preg_quote($nextTitle, '/').'\s*$|\z)/mi';

            if (preg_match($fallbackPattern, $content, $matches) !== 1) {
                return '';
            }
        }

        return trim($matches[1] ?? '');
    }

    private function headingTitle(string $heading): string
    {
        $title = preg_replace('/^#+\s*/', '', trim($heading)) ?? trim($heading);
        $title = preg_replace('/^\d+\.\s*/', '', $title) ?? $title;

        return trim($title);
    }

    private function truncatePromptExcerpt(string $value, int $maxChars, bool $fromStart = true): string
    {
        $content = trim($value);

        if ($content === '') {
            return '';
        }

        $length = function_exists('mb_strlen') ? mb_strlen($content) : strlen($content);

        if ($length <= $maxChars) {
            return $content;
        }

        if ($fromStart) {
            $slice = function_exists('mb_substr') ? mb_substr($content, 0, $maxChars) : substr($content, 0, $maxChars);

            return rtrim($slice)."\n...[excerpt truncated]...";
        }

        $offset = max(0, $length - $maxChars);
        $slice = function_exists('mb_substr') ? mb_substr($content, $offset) : substr($content, $offset);

        return "...[excerpt truncated]...\n".ltrim($slice);
    }

    private function mergeMarkdownSegments(string $partialMarkdown, string $continuationMarkdown): string
    {
        $partial = trim($partialMarkdown);
        $continuation = trim($continuationMarkdown);

        if ($partial === '') {
            return $continuation;
        }

        if ($continuation === '') {
            return $partial;
        }

        $continuation = preg_replace('/^# .+\n+/u', '', $continuation, 1) ?? $continuation;

        return trim($partial."\n\n".$continuation);
    }

    private function replacePrdSectionByTitle(
        string $markdown,
        string $startTitle,
        string $nextTitle,
        string $replacementMarkdown,
    ): string {
        $content = trim($markdown);
        $replacement = trim($replacementMarkdown);

        if ($content === '' || $replacement === '') {
            return $content;
        }

        $pattern = '/^##\s*(?:\d+\.\s*)?'.preg_quote($startTitle, '/').'\s*$[\s\S]*?(?=^##\s*(?:\d+\.\s*)?'.preg_quote($nextTitle, '/').'\s*$|\z)/mi';
        $updated = preg_replace($pattern, $replacement."\n\n", $content, 1);

        if (is_string($updated) && $updated !== '') {
            return trim($updated);
        }

        return trim($content."\n\n".$replacement);
    }

    /**
     * @param  array<string, mixed>  $validated
     */
    private function createProjectFromUploadedPrd(array $validated, string $uploadedPrdFilename, string $uploadedPrdMarkdown): Project
    {
        $derivedProjectName = $this->resolveUploadedProjectName(
            $uploadedPrdFilename,
            $uploadedPrdMarkdown,
            'Uploaded PRD'
        );
        $derivedTechStack = $this->extractTechStackFromMarkdown($uploadedPrdMarkdown);

        return Project::query()->create([
            'project_name' => $derivedProjectName,
            'project_idea' => 'Next Step Planner generated from uploaded PRD markdown.',
            'target_user' => null,
            'main_problem' => null,
            'app_type' => null,
            'tech_stack' => $derivedTechStack,
            'skill_level' => 'Beginner',
            'initial_prd' => null,
        ]);
    }

    /**
     * @param  array<string, mixed>  $validated
     * @return array{0: Project, 1: array<string, mixed>}
     */
    private function resolveCodingPromptContext(array $validated): array
    {
        $uploadedNextStepFilename = trim((string) ($validated['uploaded_next_step_filename'] ?? ''));
        $project = $this->createProjectFromUploadedNextStep(
            $uploadedNextStepFilename,
            (string) ($validated['next_step_markdown'] ?? '')
        );
        $preparedNextStep = $this->prepareNextStepMarkdownForAi(
            (string) ($validated['next_step_markdown'] ?? ''),
            (string) ($validated['generation_mode'] ?? 'normal'),
        );

        return [$project, [
            'prompt_source_mode' => 'next-step-upload',
            'uploaded_next_step_filename' => $uploadedNextStepFilename !== '' ? $uploadedNextStepFilename : null,
            'source_generation_markdown' => $preparedNextStep['markdown'],
            'source_generation_type' => 'uploaded-next-step',
            'coding_workflow' => (string) ($validated['coding_workflow'] ?? 'auto'),
            'coding_workflow_label' => $this->resolveWorkflowLabel((string) ($validated['coding_workflow'] ?? 'auto')),
            'selected_agent' => (string) ($validated['coding_workflow'] ?? 'auto'),
            'next_step_was_trimmed' => $preparedNextStep['was_trimmed'],
            'original_next_step_length' => $preparedNextStep['original_length'],
            'trimmed_next_step_length' => $preparedNextStep['trimmed_length'],
            'title_source' => (string) $project->project_name,
        ]];
    }

    /**
     * @return array{markdown: string, was_trimmed: bool, original_length: int, trimmed_length: int}
     */
    private function prepareNextStepMarkdownForAi(string $markdown, string $generationMode = 'normal'): array
    {
        $originalLength = strlen($markdown);
        $limit = $generationMode === 'compact' ? 9000 : 16000;
        $normalized = str_replace(["\r\n", "\r"], "\n", $markdown);
        $normalized = preg_replace('/[ \t]+/', ' ', $normalized) ?? $normalized;
        $normalized = preg_replace("/\n{3,}/", "\n\n", $normalized) ?? $normalized;
        $normalized = preg_replace('/^\s*([-=_*])\1{2,}\s*$/m', '---', $normalized) ?? $normalized;
        $normalized = trim($normalized);

        $prepared = $this->extractPriorityNextStepSections($normalized);

        if ($prepared === '') {
            $prepared = $normalized;
        }

        if (strlen($prepared) > $limit) {
            $snippet = substr($prepared, 0, $limit);
            $lastBreak = strrpos($snippet, "\n\n");

            if ($lastBreak !== false && $lastBreak > (int) ($limit * 0.6)) {
                $snippet = substr($snippet, 0, $lastBreak);
            }

            $prepared = trim($snippet);
        }

        return [
            'markdown' => $prepared,
            'was_trimmed' => $prepared !== $markdown,
            'original_length' => $originalLength,
            'trimmed_length' => strlen($prepared),
        ];
    }

    private function extractPriorityNextStepSections(string $markdown): string
    {
        $lines = preg_split("/\n/", $markdown) ?: [];
        $keep = [];
        $keywords = [
            'project',
            'target user',
            'tech stack',
            'agent',
            'roadmap',
            'backend',
            'frontend',
            'database',
            'api',
            'testing',
            'deployment',
            'github',
            'langkah',
            'implementasi',
        ];
        $insidePrioritySection = false;

        foreach ($lines as $line) {
            $trimmed = trim($line);

            if ($trimmed === '') {
                if ($insidePrioritySection) {
                    $keep[] = '';
                }

                continue;
            }

            $normalized = strtolower($trimmed);
            $isHeading = preg_match('/^#{1,6}\s+/', $trimmed) === 1;
            $matchesKeyword = false;

            foreach ($keywords as $keyword) {
                if (str_contains($normalized, $keyword)) {
                    $matchesKeyword = true;
                    break;
                }
            }

            if ($isHeading) {
                $insidePrioritySection = $matchesKeyword;
                if ($matchesKeyword) {
                    $keep[] = $trimmed;
                }

                continue;
            }

            if ($insidePrioritySection || preg_match('/^(\d+\.|- |\* )/', $trimmed) === 1) {
                $keep[] = $trimmed;
            }
        }

        return trim(implode("\n", $keep));
    }

    private function createProjectFromUploadedNextStep(string $uploadedNextStepFilename, string $uploadedNextStepMarkdown): Project
    {
        $derivedProjectName = $this->resolveUploadedProjectName(
            $uploadedNextStepFilename,
            $uploadedNextStepMarkdown,
            'Uploaded Next Step Planner'
        );
        $derivedTechStack = $this->extractTechStackFromMarkdown($uploadedNextStepMarkdown);

        return Project::query()->create([
            'project_name' => $derivedProjectName,
            'project_idea' => 'Coding Prompt Generator generated from uploaded Next Step Planner markdown.',
            'target_user' => null,
            'main_problem' => null,
            'app_type' => null,
            'tech_stack' => $derivedTechStack,
            'skill_level' => 'Beginner',
            'initial_prd' => null,
        ]);
    }

    private function extractTechStackFromMarkdown(string $markdown): ?string
    {
        $normalized = str_replace(["\r\n", "\r"], "\n", $markdown);
        $frontend = $this->matchMarkdownField($normalized, ['frontend']);
        $backend = $this->matchMarkdownField($normalized, ['backend']);
        $database = $this->matchMarkdownField($normalized, ['database', 'db']);
        $segments = array_values(array_filter([
            $frontend !== null ? 'Frontend: '.$frontend : null,
            $backend !== null ? 'Backend: '.$backend : null,
            $database !== null ? 'Database: '.$database : null,
        ]));

        if ($segments === []) {
            return null;
        }

        return implode(', ', $segments);
    }

    /**
     * @param  array<int, string>  $labels
     */
    private function matchMarkdownField(string $markdown, array $labels): ?string
    {
        foreach ($labels as $label) {
            $pattern = '/(?:^|\n)\s*(?:[-*]\s*)?'.preg_quote($label, '/').'\s*[:=-]\s*(.+)$/im';
            if (preg_match($pattern, $markdown, $matches) === 1) {
                $value = trim((string) ($matches[1] ?? ''));
                if ($value !== '') {
                    return $value;
                }
            }
        }

        return null;
    }

    private function resolveUploadedProjectName(string $uploadedFilename, string $markdown, string $fallback): string
    {
        $markdownTitle = $this->extractTitleFromMarkdown($markdown);

        if ($markdownTitle !== '') {
            return $markdownTitle;
        }

        $filenameTitle = $uploadedFilename !== ''
            ? (pathinfo($uploadedFilename, PATHINFO_FILENAME) ?: $uploadedFilename)
            : '';

        $cleanFilenameTitle = $this->cleanProjectTitle($filenameTitle);

        if ($cleanFilenameTitle !== '') {
            return $cleanFilenameTitle;
        }

        return $fallback;
    }

    private function extractTitleFromMarkdown(string $markdown): string
    {
        $normalized = str_replace(["\r\n", "\r"], "\n", $markdown);
        $lines = preg_split("/\n/", $normalized) ?: [];

        foreach ($lines as $line) {
            $trimmed = trim($line);

            if ($trimmed === '') {
                continue;
            }

            if (preg_match('/^#\s+(.+)$/', $trimmed, $matches) === 1) {
                return $this->cleanProjectTitle((string) ($matches[1] ?? ''));
            }

            break;
        }

        return '';
    }

    private function cleanProjectTitle(string $value): string
    {
        $cleaned = preg_replace('/^#+\s*/', '', $value) ?? $value;
        $cleaned = preg_replace('/^(prd|product requirements document|next step planner|coding prompt generator|coding prompt|coding prompts|roadmap)\s*[-:|]\s*/i', '', $cleaned) ?? $cleaned;
        $cleaned = preg_replace('/\s*[-:|]\s*(prd|product requirements document|next step planner|coding prompt generator|coding prompt|coding prompts|roadmap)$/i', '', $cleaned) ?? $cleaned;
        $cleaned = preg_replace('/\bproduct requirements document\b/i', '', $cleaned) ?? $cleaned;
        $cleaned = preg_replace('/\bnext step planner\b/i', '', $cleaned) ?? $cleaned;
        $cleaned = preg_replace('/\bcoding prompt generator\b/i', '', $cleaned) ?? $cleaned;
        $cleaned = preg_replace('/\bcoding prompts?\b/i', '', $cleaned) ?? $cleaned;
        $cleaned = preg_replace('/\broadmap\b/i', '', $cleaned) ?? $cleaned;
        $cleaned = preg_replace('/\bprd\b/i', '', $cleaned) ?? $cleaned;
        $cleaned = preg_replace('/\s+/', ' ', trim($cleaned)) ?? trim($cleaned);

        return trim($cleaned);
    }
}
