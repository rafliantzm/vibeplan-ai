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
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;
use Throwable;

class GenerateController extends Controller
{
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
            return response()->json([
                'message' => 'MongoDB PHP extension is not installed. Install ext-mongodb before using the generation endpoints.',
            ], 500);
        }

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

            if ($this->isTruncatedResponse($aiResult)) {
                if ($this->shouldRetryPrdNormalForm($generationType, $validated)) {
                    $retryContext = [...$context, 'concise_retry' => true];
                    $retryPrompt = $this->promptService->build(
                        $generationType,
                        $project,
                        false,
                        $retryContext,
                    );
                    $retryResult = $this->aiService->generateMarkdown($retryPrompt, [
                        'max_tokens' => $maxTokens,
                    ]);

                    if (! $this->isTruncatedResponse($retryResult)) {
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
                } elseif ($this->shouldRetryCodingPromptNormalMode($generationType, $validated)) {
                    $retryContext = [...$context, 'normal_mode_retry' => true];
                    $retryPrompt = $this->promptService->build(
                        $generationType,
                        $project,
                        false,
                        $retryContext,
                    );
                    $retryResult = $this->aiService->generateMarkdown($retryPrompt, [
                        'max_tokens' => $maxTokens,
                    ]);

                    if (! $this->isTruncatedResponse($retryResult)) {
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
            report($exception);

            return response()->json([
                'success' => false,
                'error_code' => 'PROVIDER_LIMIT',
                'message' => 'Kuota AI sedang terbatas.',
                'user_message' => 'Sistem sedang terkena batas kuota provider. Silakan coba Mode Ringkas, coba lagi nanti, atau hubungi admin.',
                'actions' => ['compact_mode', 'request_admin_help'],
            ], 429);
        } catch (AiProviderException $exception) {
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
            ], $exception->status());
        } catch (RuntimeException $exception) {
            return response()->json([
                'message' => $exception->getMessage(),
                'file' => $exception->getFile(),
                'line' => $exception->getLine(),
            ], 500);
        } catch (Throwable $exception) {
            report($exception);

            return response()->json([
                'message' => 'Failed to generate content. Check MongoDB and AI service configuration, then try again.',
                'file' => $exception->getFile(),
                'line' => $exception->getLine(),
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
            ? ['nullable', 'string', 'max:5000']
            : ($generationType === 'next-step'
                ? ['required_without_all:project_id,source_generation_id,prd_markdown', 'string', 'max:5000']
                : ['required_without:project_id', 'string', 'max:5000']);

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
        if ($this->shouldUseCompactMode($generationType, $validated)) {
            return (int) config('services.ai.compact_max_tokens', 1200);
        }

        return match ($generationType) {
            'prd' => (int) config('services.ai.prd_max_tokens', 2500),
            'next-step' => (int) config('services.ai.next_step_max_tokens', 2200),
            'coding-prompt' => (int) config('services.ai.coding_prompt_max_tokens', 3500),
            default => (int) config('services.ai.max_tokens', 1800),
        };
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
     * @param  array<string, mixed>  $aiResult
     */
    private function isTruncatedResponse(array $aiResult): bool
    {
        if (($aiResult['finish_reason'] ?? null) !== 'length') {
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
     * @param  array<string, mixed>  $validated
     */
    private function createProjectFromUploadedPrd(array $validated, string $uploadedPrdFilename, string $uploadedPrdMarkdown): Project
    {
        $derivedProjectName = $this->resolveUploadedProjectName(
            $uploadedPrdFilename,
            $uploadedPrdMarkdown,
            'Uploaded PRD'
        );

        return Project::query()->create([
            'project_name' => $derivedProjectName,
            'project_idea' => 'Next Step Planner generated from uploaded PRD markdown.',
            'target_user' => null,
            'main_problem' => null,
            'app_type' => 'Web Application',
            'tech_stack' => 'Next.js, Laravel, MongoDB',
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

        return Project::query()->create([
            'project_name' => $derivedProjectName,
            'project_idea' => 'Coding Prompt Generator generated from uploaded Next Step Planner markdown.',
            'target_user' => null,
            'main_problem' => null,
            'app_type' => 'Web Application',
            'tech_stack' => 'Next.js, Laravel, MongoDB',
            'skill_level' => 'Beginner',
            'initial_prd' => null,
        ]);
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
