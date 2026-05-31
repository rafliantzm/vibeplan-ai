<?php

namespace App\Services;

use App\Models\Project;
use InvalidArgumentException;

class PromptService
{
    public function build(string $generationType, Project $project, bool $compact = false, array $context = []): string
    {
        return match ($generationType) {
            'prd' => $this->buildPrdPrompt($project, $compact, $context),
            'next-step' => $this->buildNextStepPrompt($project, $context, $compact),
            'coding-prompt' => $this->buildCodingPrompt($project, $context, $compact),
            default => throw new InvalidArgumentException("Unsupported generation type [{$generationType}]."),
        };
    }

    private function buildPrdPrompt(Project $project, bool $compact = false, array $context = []): string
    {
        $conciseRetry = (bool) ($context['concise_retry'] ?? false);
        $architecture = $this->resolveArchitectureContext((string) ($project->tech_stack ?? ''));
        $projectName = $this->formatPromptValue($project->project_name);
        $projectIdea = $this->formatPromptValue($project->project_idea);
        $targetUser = $this->formatPromptValue($project->target_user);
        $mainProblem = $this->formatPromptValue($project->main_problem);
        $appType = $this->formatPromptValue($project->app_type);
        $techStack = $this->formatPromptValue($project->tech_stack);
        $skillLevel = $this->formatPromptValue($project->skill_level);
        $initialNotes = $this->formatPromptValue($project->initial_prd);
        $frontendStack = $architecture['frontend'];
        $backendStack = $architecture['backend'];
        $databaseStack = $architecture['database'];
        $techStackNotes = $architecture['notes'];
        $storageStructure = $this->resolveStorageStructureTerm($databaseStack);
        $storedDataDescription = $this->resolveStoredDataDescription($databaseStack, $storageStructure);

        if ($compact) {
            return <<<PROMPT
You are a senior product manager and software architect.
Return Markdown only.
Write a compact MVP PRD in Indonesian.
Keep every section short, practical, and implementation-ready.

Use exactly these 8 top-level sections in this order:
- Overview
- Requirements
- Core Features
- User Flow
- Architecture
- Design & Technical Constraints
- Entity Relationship Diagram (ERD)
- Development Phases

Project context:
- Project Name: {$projectName}
- Project Idea: {$projectIdea}
- Target User: {$targetUser}
- Main Problem: {$mainProblem}
- App Type: {$appType}
- Tech Stack (raw): {$techStack}
- Frontend Stack: {$frontendStack}
- Backend Stack: {$backendStack}
- Database Stack: {$databaseStack}
- Tech Stack Notes: {$techStackNotes}
- Skill Level: {$skillLevel}
- Initial Notes: {$initialNotes}

Rules:
- MVP-first, concise, no long theory.
- Architecture wajib mengikuti input Tech Stack dari user.
- Jangan menggunakan stack internal aplikasi generator.
- Jangan menulis Next.js, Laravel, MongoDB, Groq, OpenRouter, atau AI_GENERATIONS kecuali memang disebutkan oleh user.
- Jangan mengganti React.js menjadi Next.js, Node.js menjadi Laravel, atau Supabase PostgreSQL menjadi MongoDB.
- Jika salah satu stack kosong, tulis "Belum ditentukan" dan jangan mengarang framework baru.
- Architecture section must explicitly list:
  - Frontend: {$frontendStack}
  - Backend: {$backendStack}
  - Database: {$databaseStack}
  - Stored Data: {$storedDataDescription}
- Stored Data must use "{$storageStructure}" terminology that matches the selected database.
- Core Features must be derived from project idea, user problem, app type, and initial notes. Do not reuse VibePlan AI features.
- User Flow must describe the user's product flow, not the generator application's flow.
- ERD must be one Mermaid `erDiagram` adapted to the user's project domain, not VibePlan AI collections.
- Development phases must follow the selected stack and MVP scope of the user's project.
PROMPT;
        }

        $retryRule = $conciseRetry
            ? 'Generate a concise MVP PRD. Keep every section short. Do not exceed the output limit.'
            : 'Keep each section concise, practical, and MVP-first. Prefer short bullets over long explanations.';

        return <<<PROMPT
You are a senior product manager and software architect.
Return Markdown only.
Write in Indonesian for developers and coding agents.
{$retryRule}

Use exactly these 8 top-level sections in this order:
1. Overview
2. Requirements
3. Core Features
4. User Flow
5. Architecture
6. Design & Technical Constraints
7. Entity Relationship Diagram (ERD)
8. Development Phases

Project context:
- Project Name: {$projectName}
- Project Idea: {$projectIdea}
- Target User: {$targetUser}
- Main Problem: {$mainProblem}
- App Type: {$appType}
- Tech Stack (raw): {$techStack}
- Frontend Stack: {$frontendStack}
- Backend Stack: {$backendStack}
- Database Stack: {$databaseStack}
- Tech Stack Notes: {$techStackNotes}
- Skill Level: {$skillLevel}
- Initial Notes: {$initialNotes}

Requirements:
- Scope must stay MVP-first and practical.
- Architecture wajib mengikuti input Tech Stack dari user. Jangan menggunakan stack internal aplikasi generator.
- Jangan menulis Next.js, Laravel, MongoDB, Groq, OpenRouter, atau AI_GENERATIONS kecuali memang disebutkan oleh user.
- Jangan mengganti React.js menjadi Next.js, Node.js menjadi Laravel, atau Supabase PostgreSQL menjadi MongoDB.
- Jika Frontend Stack, Backend Stack, atau Database Stack kosong, tulis "Belum ditentukan".
- Gunakan stack berikut secara eksplisit di section Architecture:
  - Frontend: {$frontendStack}
  - Backend: {$backendStack}
  - Database: {$databaseStack}
  - Stored Data: {$storedDataDescription}
- Core Features, Requirements, User Flow, ERD, dan Development Phases harus menggambarkan produk milik user, bukan aplikasi VibePlan AI.
- Hindari menyisipkan endpoint, fitur history, markdown download, AI provider, atau arsitektur internal generator jika tidak diminta user.

Section guidance:
- Overview: purpose, target users, main problem, MVP goal, and a short future direction for the user's product.
- Requirements: functional requirements, non-functional requirements, MVP scope, and future improvements based on the project idea.
- Core Features: derive 4 to 8 MVP features from the user's product idea. For each feature, include a short summary and 3 to 4 concrete acceptance criteria.
- User Flow: ordered flow of how the target user will use the product from entry point to main outcome.
- Architecture: explain the system architecture using the exact selected stack above. If backend is Node.js, describe it as Node.js REST API or Express.js API when framework is not specified. If database is Supabase PostgreSQL, describe storage using tables. Never mention the generator application's stack.
- Design & Technical Constraints: mention realistic engineering constraints, security, deployment assumptions, and integration boundaries based on the user's stack and skill level.
- ERD: include one Mermaid `erDiagram` only, adapted to the user's project domain. Use entity names and relationships that match the product idea.
- Development Phases: at least 5 compact phases aligned to the chosen stack, from setup to deployment/testing.
PROMPT;
    }

    /**
     * @return array{frontend: string, backend: string, database: string, notes: string}
     */
    private function resolveArchitectureContext(string $techStack): array
    {
        $frontend = 'Belum ditentukan';
        $backend = 'Belum ditentukan';
        $database = 'Belum ditentukan';
        $notes = [];
        $segments = preg_split('/[\n;,]+/', $techStack) ?: [];

        foreach ($segments as $segment) {
            $trimmed = trim($segment);

            if ($trimmed === '') {
                continue;
            }

            if (preg_match('/^frontend\s*[:=-]?\s*(.+)$/i', $trimmed, $matches) === 1) {
                $frontend = $this->normalizeFrontendStack($matches[1]);
                continue;
            }

            if (preg_match('/^backend\s*[:=-]?\s*(.+)$/i', $trimmed, $matches) === 1) {
                $backend = $this->normalizeBackendStack($matches[1]);
                continue;
            }

            if (preg_match('/^(database|db)\s*[:=-]?\s*(.+)$/i', $trimmed, $matches) === 1) {
                $database = $this->normalizeDatabaseStack($matches[2]);
                continue;
            }

            if ($frontend === 'Belum ditentukan' && $this->looksLikeFrontendStack($trimmed)) {
                $frontend = $this->normalizeFrontendStack($trimmed);
                continue;
            }

            if ($backend === 'Belum ditentukan' && $this->looksLikeBackendStack($trimmed)) {
                $backend = $this->normalizeBackendStack($trimmed);
                continue;
            }

            if ($database === 'Belum ditentukan' && $this->looksLikeDatabaseStack($trimmed)) {
                $database = $this->normalizeDatabaseStack($trimmed);
                continue;
            }

            $notes[] = $trimmed;
        }

        return [
            'frontend' => $frontend,
            'backend' => $backend,
            'database' => $database,
            'notes' => $notes !== [] ? implode(', ', $notes) : 'Tidak ada catatan tambahan',
        ];
    }

    private function normalizeFrontendStack(?string $value): string
    {
        return match ($this->normalizeToken($value)) {
            '', 'belumditentukan' => 'Belum ditentukan',
            'react', 'reactjs' => 'React.js',
            'next', 'nextjs' => 'Next.js',
            'vue', 'vuejs' => 'Vue.js',
            'nuxt', 'nuxtjs' => 'Nuxt.js',
            'angular' => 'Angular',
            'flutter' => 'Flutter',
            'svelte', 'sveltekit' => 'SvelteKit',
            default => $this->preserveStackLabel($value),
        };
    }

    private function normalizeBackendStack(?string $value): string
    {
        return match ($this->normalizeToken($value)) {
            '', 'belumditentukan' => 'Belum ditentukan',
            'node', 'nodejs' => 'Node.js',
            'express', 'expressjs' => 'Express.js',
            'nestjs', 'nest' => 'NestJS',
            'laravel' => 'Laravel',
            'php' => 'PHP',
            'django' => 'Django',
            'flask' => 'Flask',
            'springboot' => 'Spring Boot',
            default => $this->preserveStackLabel($value),
        };
    }

    private function normalizeDatabaseStack(?string $value): string
    {
        return match ($this->normalizeToken($value)) {
            '', 'belumditentukan' => 'Belum ditentukan',
            'supabase', 'supabasepostgresql' => 'Supabase PostgreSQL',
            'postgres', 'postgresql' => 'PostgreSQL',
            'mysql' => 'MySQL',
            'mariadb' => 'MariaDB',
            'mongodb', 'mongo' => 'MongoDB',
            'firebase', 'firestore' => 'Firebase Firestore',
            'sqlite' => 'SQLite',
            default => $this->preserveStackLabel($value),
        };
    }

    private function looksLikeFrontendStack(string $value): bool
    {
        return preg_match('/\b(react|next|vue|nuxt|angular|flutter|svelte)\b/i', $value) === 1;
    }

    private function looksLikeBackendStack(string $value): bool
    {
        return preg_match('/\b(node|express|nest|laravel|django|flask|spring|php)\b/i', $value) === 1;
    }

    private function looksLikeDatabaseStack(string $value): bool
    {
        return preg_match('/\b(supabase|postgres|mysql|mariadb|mongodb|mongo|firebase|firestore|sqlite)\b/i', $value) === 1;
    }

    private function normalizeToken(?string $value): string
    {
        $normalized = strtolower(trim((string) $value));
        $normalized = preg_replace('/[^a-z0-9]+/', '', $normalized) ?? $normalized;

        return $normalized;
    }

    private function preserveStackLabel(?string $value): string
    {
        $trimmed = trim((string) $value);

        return $trimmed !== '' ? $trimmed : 'Belum ditentukan';
    }

    private function resolveStorageStructureTerm(string $databaseStack): string
    {
        $normalized = strtolower($databaseStack);

        return match (true) {
            str_contains($normalized, 'mongodb') => 'collection',
            str_contains($normalized, 'supabase'),
            str_contains($normalized, 'postgres'),
            str_contains($normalized, 'mysql'),
            str_contains($normalized, 'mariadb'),
            str_contains($normalized, 'sqlite') => 'table',
            str_contains($normalized, 'firebase'),
            str_contains($normalized, 'firestore') => 'collection/document',
            default => 'data storage structure',
        };
    }

    private function resolveStoredDataDescription(string $databaseStack, string $storageStructure): string
    {
        if ($databaseStack === 'Belum ditentukan') {
            return 'gunakan data storage structure yang relevan setelah database dipilih secara final.';
        }

        return match ($storageStructure) {
            'collection' => "disimpan dalam collection {$databaseStack} seperti users, projects, tasks, dan generated_documents sesuai kebutuhan aplikasi.",
            'table' => "disimpan dalam tabel {$databaseStack} seperti users, projects, tasks, dan generated_documents sesuai kebutuhan aplikasi.",
            'collection/document' => "disimpan dalam struktur collection/document {$databaseStack} seperti users, projects, tasks, dan generated_documents sesuai kebutuhan aplikasi.",
            default => 'disimpan dalam struktur data yang menyesuaikan database dan domain aplikasi.',
        };
    }

    private function formatPromptValue(?string $value): string
    {
        $trimmed = trim((string) $value);

        return $trimmed !== '' ? $trimmed : 'Belum ditentukan';
    }

    private function buildNextStepPrompt(Project $project, array $context = [], bool $compact = false): string
    {
        $requestedWorkflow = (string) ($context['coding_workflow'] ?? $context['selected_agent'] ?? 'auto');
        $prdSourceMode = $context['prd_source_mode'] ?? 'form';
        $uploadedPrdFilename = $context['uploaded_prd_filename'] ?? '-';
        $sourceGenerationId = $context['source_generation_id'] ?? '-';
        $sourceGenerationType = $context['source_generation_type'] ?? '-';
        $sourceMarkdown = trim((string) ($context['source_generation_markdown'] ?? ''));
        $sourceMarkdownBlock = $sourceMarkdown !== ''
            ? $sourceMarkdown
            : 'Tidak ada source_generation_id. Gunakan konteks project input sebagai sumber utama.';
        $workflowContext = $this->resolveCodingWorkflowContext($requestedWorkflow, $project, $sourceMarkdownBlock);
        $workflowHeading = $workflowContext['requested'] === 'auto'
            ? "- Coding Workflow Request: Auto Recommend Agent\n- Workflow yang dipakai untuk output: {$workflowContext['effective_label']}\n- Alasan rekomendasi: {$workflowContext['recommendation_reason']}"
            : "- Coding Workflow Request: {$workflowContext['requested_label']}\n- Workflow yang dipakai untuk output: {$workflowContext['effective_label']}";
        $workflowIntroSection = $workflowContext['requested'] === 'auto'
            ? "  - ## Rekomendasi Workflow\n"
            : '';
        $sectionStructure = $workflowContext['effective'] === 'manual_beginner'
            ? "- Every numbered section must use this exact format:\n  - Tujuan langkah:\n  - Yang dilakukan user:\n  - File/folder yang diperiksa atau diedit:\n  - Cara verifikasi:"
            : "- Every numbered section must use this exact format:\n  - Tujuan langkah:\n  - Deliverable utama:\n  - Prompt siap pakai:\n  - File target / area kerja:\n  - Acceptance test:";
        $workflowRules = $this->nextStepWorkflowRules($workflowContext['effective']);

        if ($compact) {
            return <<<PROMPT
You are a senior technical project planner and beginner-friendly coding mentor.
Return Markdown only.
Write in Indonesian.
Keep the output concise, direct, and practical.
Output wajib mengikuti coding_workflow yang dipilih user. Jangan membuat roadmap generik. Jangan mengganti workflow user dengan workflow lain kecuali coding_workflow = auto.

Create a compact Next Step Planner based on this project context:

- Project Name: {$project->project_name}
- Project Idea: {$project->project_idea}
- App Type: {$project->app_type}
- Tech Stack: {$project->tech_stack}
- Skill Level: {$project->skill_level}
- PRD Source Mode: {$prdSourceMode}
- Uploaded PRD Filename: {$uploadedPrdFilename}
- Source Generation ID: {$sourceGenerationId}
- Source Generation Type: {$sourceGenerationType}
{$workflowHeading}

Requirements:
- Return Markdown only.
- Focus on practical next actions after the PRD is ready.
- Avoid long theory.
- Keep the selected coding workflow context and make the roadmap style match it.
- Mention that prompts or langkah bisa disempurnakan lagi melalui VibePlan AI jika dibutuhkan.
- Use the PRD source below as the primary basis when available.
- The output must contain exactly these headings in this order:
  - # Next Step Planner - Guided Vibe Coding Roadmap
{$workflowIntroSection}  - ## 1. Taruh PRD di Folder Project
  - ## 2. Buat AGENTS.md
  - ## 3. Prompt Pertama: Baca PRD
  - ## 4. Prompt Kedua: Cek Struktur Folder
  - ## 5. Buat Folder Frontend dan Backend
  - ## 6. Implementasi Backend Terlebih Dahulu
  - ## 7. Konfigurasi Database dan Backend
  - ## 8. Implementasi Frontend
  - ## 9. Integrasi Frontend dan Backend
  - ## 10. Testing Aplikasi
  - ## 11. GitHub dan Deployment
{$sectionStructure}
{$workflowRules}

PRD source markdown:
{$sourceMarkdownBlock}
PROMPT;
        }

        return <<<PROMPT
You are a senior technical project planner, beginner-friendly coding mentor, and AI coding workflow advisor.
Return Markdown only.
Write in Indonesian.
Keep the output concise, practical, and sequential.
Do not write broad theory.

Create a Guided Vibe Coding Roadmap based on the project and PRD context below.

- Project Name: {$project->project_name}
- Project Idea: {$project->project_idea}
- Target User: {$project->target_user}
- Main Problem: {$project->main_problem}
- App Type: {$project->app_type}
- Tech Stack: {$project->tech_stack}
- Skill Level: {$project->skill_level}
- Initial Notes: {$project->initial_prd}
- PRD Source Mode: {$prdSourceMode}
- Uploaded PRD Filename: {$uploadedPrdFilename}
- Source Generation ID: {$sourceGenerationId}
- Source Generation Type: {$sourceGenerationType}
{$workflowHeading}

Requirements:
- Return Markdown only.
- Use the PRD source below as the main basis.
- Output wajib mengikuti coding_workflow yang dipilih user. Jangan membuat roadmap generik. Jangan mengganti workflow user dengan workflow lain kecuali coding_workflow = auto.
- The output must contain exactly these headings in this order:
  - # Next Step Planner - Guided Vibe Coding Roadmap
{$workflowIntroSection}  - ## 1. Taruh PRD di Folder Project
  - ## 2. Buat AGENTS.md
  - ## 3. Prompt Pertama: Baca PRD
  - ## 4. Prompt Kedua: Cek Struktur Folder
  - ## 5. Buat Folder Frontend dan Backend
  - ## 6. Implementasi Backend Terlebih Dahulu
  - ## 7. Konfigurasi Database dan Backend
  - ## 8. Implementasi Frontend
  - ## 9. Integrasi Frontend dan Backend
  - ## 10. Testing Aplikasi
  - ## 11. GitHub dan Deployment
{$sectionStructure}
{$workflowRules}
- Mention that the roadmap can be refined again through VibePlan AI when useful.
- Keep the output practical, structured, and aligned with the selected workflow.
- Backend should still be planned before frontend unless the uploaded PRD explicitly requires another order.

Section-specific guidance:
- Section 1 must place the PRD at `project-root/docs/PRD.md`.
- Section 2 must create `AGENTS.md` from the PRD.
- Section 3 must understand the PRD first before implementation.
- Section 4 must inspect or propose the folder structure first.
- Section 5 must create or verify the main frontend/backend/docs structure based on the selected workflow.
- Section 6 must focus on backend implementation priorities first.
- Section 7 must configure database and API contracts based on the selected project stack.
- Section 8 must implement frontend tasks against the agreed backend contract.
- Section 9 must integrate frontend and backend using clear verification checkpoints.
- Section 10 must test key flows, list bugs, and verify fixes.
- Section 11 must prepare GitHub hygiene, deployment notes, and production checklist.

PRD source markdown:
{$sourceMarkdownBlock}
PROMPT;
    }

    private function buildCodingPrompt(Project $project, array $context = [], bool $compact = false): string
    {
        $requestedWorkflow = (string) ($context['coding_workflow'] ?? $context['selected_agent'] ?? 'auto');
        $uploadedNextStepFilename = $context['uploaded_next_step_filename'] ?? '-';
        $nextStepMarkdown = trim((string) ($context['source_generation_markdown'] ?? ''));
        $normalModeRetry = (bool) ($context['normal_mode_retry'] ?? false);
        $workflowContext = $this->resolveCodingWorkflowContext($requestedWorkflow, $project, $nextStepMarkdown);
        $workflowHeading = $workflowContext['requested'] === 'auto'
            ? "- Coding Workflow Request: Auto Recommend Agent\n- Workflow yang dipakai untuk output: {$workflowContext['effective_label']}\n- Alasan rekomendasi: {$workflowContext['recommendation_reason']}"
            : "- Coding Workflow Request: {$workflowContext['requested_label']}\n- Workflow yang dipakai untuk output: {$workflowContext['effective_label']}";
        $workflowIntroSection = $workflowContext['requested'] === 'auto'
            ? "  - ## Rekomendasi Workflow\n"
            : '';
        $codingPromptRules = $this->codingPromptWorkflowRules($workflowContext['effective']);

        if ($compact) {
            return <<<PROMPT
You are a senior software engineer and coding workflow guide.
Return Markdown only.
Write in Indonesian.
Create a concise, copy-paste-ready coding prompt document.
Do not write theory, long explanations, repeated sections, or a full PRD summary.
Use only the uploaded Next Step Planner as the main source.
Output wajib mengikuti coding_workflow yang dipilih user. Jangan membuat prompt generik. Jangan mengganti workflow user dengan workflow lain kecuali coding_workflow = auto.

- Project Name: {$project->project_name}
- Uploaded Next Step Filename: {$uploadedNextStepFilename}
{$workflowHeading}

Output rules:
- Start with this exact title: # Coding Prompt Generator - Mode Ringkas
- Use exactly these sections in this order:
{$workflowIntroSection}  - ## 1. Ringkasan Konteks
  - ## 2. Analisis PRD / Roadmap
  - ## 3. Setup Struktur Project
  - ## 4. Implementasi Backend
  - ## 5. Konfigurasi Database dan API
  - ## 6. Implementasi Frontend
  - ## 7. Integrasi Frontend dan Backend
  - ## 8. Testing, GitHub, dan Deployment
- Section 1 must contain only 3 bullet points in this exact label format:
  - Project:
  - Workflow:
  - Tujuan:
- Sections 2 to 8 must use exactly this structure:
  - ### Tujuan
  - ### Prompt siap pakai
  - ### Hasil yang diharapkan
- For every "### Tujuan", write exactly 1 short sentence.
- For every "### Prompt siap pakai", write exactly 1 prompt inside a fenced code block with language `text`.
- For every "### Hasil yang diharapkan", write only 2 short bullet points.
- Every prompt must be maximum 8 lines.
- Every prompt must mention the project context from the uploaded roadmap.
- Every prompt must tell what to do, what not to do, and what result to return.
- Do not add checklist, conclusion, or extra sections.
- Do not repeat the full roadmap or full PRD.
- Focus only on the most actionable implementation steps from the uploaded roadmap.
{$codingPromptRules}

Uploaded Next Step Planner markdown:
{$nextStepMarkdown}
PROMPT;
        }

        $retryInstruction = $normalModeRetry
            ? 'Generate the same Normal Mode output, but reduce each section. Keep maximum 11 sections. Each prompt maximum 8 lines. Do not include long explanations.'
            : 'Keep the output detailed but controlled. Each prompt maximum 12 lines.';

        return <<<PROMPT
You are a senior software engineer and beginner-friendly coding workflow guide.
Return Markdown only.
Write in Indonesian.
Make every prompt copy-paste ready.
Keep the output practical, structured, and aligned to the uploaded Next Step Planner.
Avoid theory, repeated explanations, long introductions, and full PRD rewrites.
{$retryInstruction}

Create an AI Coding Prompt Generator document based only on the uploaded Next Step Planner below.

- Project Name: {$project->project_name}
- Uploaded Next Step Filename: {$uploadedNextStepFilename}
{$workflowHeading}

Requirements:
- Return Markdown only.
- The uploaded Next Step Planner is the only main source.
- Do not use the normal project form as the source.
- Do not expose AI API keys.
- Output wajib mengikuti coding_workflow yang dipilih user. Jangan membuat prompt generik. Jangan mengganti workflow user dengan workflow lain kecuali coding_workflow = auto.
- The output must contain exactly these sections in this order:
  - # Coding Prompt Generator - Normal Mode
{$workflowIntroSection}  - ## 1. Analisis PRD / Roadmap
  - ## 2. Buat AGENTS.md
  - ## 3. Cek Struktur Folder
  - ## 4. Setup Folder Frontend dan Backend
  - ## 5. Implementasi Backend
  - ## 6. Konfigurasi Database dan API
  - ## 7. Implementasi Frontend
  - ## 8. Integrasi Frontend dan Backend
  - ## 9. Testing dan Bug Fixing
  - ## 10. GitHub
  - ## 11. Deployment
- Every section from 1 to 11 must use exactly this structure:
  - ### Tujuan
  - ### Prompt siap pakai
  - ### Hasil yang diharapkan
- For "### Tujuan", write exactly 1 short sentence.
- For "### Prompt siap pakai", write exactly 1 copy-paste-ready prompt inside a fenced code block with language `text`.
- For "### Hasil yang diharapkan", write only 2 short bullet points.
- Every prompt must be maximum 12 lines, or maximum 8 lines when the retry instruction above is active.
- Every prompt must mention project context, what should be changed, what must not be changed, and what output/result should be returned.
- Do not add extra sections, checklist, or long introduction.
- Do not rewrite the full PRD or full roadmap.
- Avoid duplicate prompts or repeated explanations.
- Focus on implementation workflow from analysis to deployment.
{$codingPromptRules}
- Section-specific guidance:
  - "Analisis PRD / Roadmap" must focus on understanding scope, stack, roadmap steps, dependencies, and risks before coding.
  - "Buat AGENTS.md" must create guidance from the roadmap and return the rules summary.
  - "Cek Struktur Folder" must inspect the repo and verify the working structure before implementation.
  - "Setup Folder Frontend dan Backend" must create or verify the main worktree structure before implementation.
  - "Implementasi Backend" must focus on API, service layer, validation, and persistence layer before frontend changes when relevant.
  - "Konfigurasi Database dan API" must verify database connection, endpoint behavior, and safe `.env` usage.
  - "Implementasi Frontend" must build UI against the agreed backend contract without exposing API keys.
  - "Integrasi Frontend dan Backend" must verify data flow and acceptance criteria.
  - "Testing dan Bug Fixing" must verify behavior, list bugs, and fix them one by one.
  - "GitHub" must prepare clean commit flow, README updates, and repository hygiene.
  - "Deployment" must prepare deployment notes, `.env.example`, and production validation without exposing secrets.

Uploaded Next Step Planner markdown:
{$nextStepMarkdown}
PROMPT;
    }

    /**
     * @return array{requested: string, requested_label: string, effective: string, effective_label: string, recommendation_reason: string}
     */
    private function resolveCodingWorkflowContext(string $workflow, Project $project, string $sourceMarkdown = ''): array
    {
        $requested = $this->normalizeWorkflowValue($workflow);
        $effective = $requested === 'auto'
            ? $this->recommendCodingWorkflow($project, $sourceMarkdown)
            : $requested;

        return [
            'requested' => $requested,
            'requested_label' => $this->workflowLabel($requested),
            'effective' => $effective,
            'effective_label' => $this->workflowLabel($effective),
            'recommendation_reason' => $this->workflowRecommendationReason($effective, $project, $sourceMarkdown),
        ];
    }

    private function normalizeWorkflowValue(string $workflow): string
    {
        $normalized = str_replace('-', '_', strtolower(trim($workflow)));

        return match ($normalized) {
            'codex', 'claude_code', 'github_copilot', 'antigravity', 'manual_beginner' => $normalized,
            default => 'auto',
        };
    }

    private function workflowLabel(string $workflow): string
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

    private function recommendCodingWorkflow(Project $project, string $sourceMarkdown = ''): string
    {
        $combined = strtolower(trim(
            implode(' ', [
                (string) $project->skill_level,
                (string) $project->tech_stack,
                (string) $project->project_idea,
                (string) $project->initial_prd,
                $sourceMarkdown,
            ])
        ));

        if (str_contains($combined, 'beginner') || str_contains($combined, 'pemula')) {
            return 'manual_beginner';
        }

        if (
            str_contains($combined, 'debug')
            || str_contains($combined, 'refactor')
            || str_contains($combined, 'existing codebase')
            || str_contains($combined, 'legacy')
        ) {
            return 'claude_code';
        }

        if (
            str_contains($combined, 'agentic')
            || str_contains($combined, 'orchestr')
            || str_contains($combined, 'decomposition')
            || str_contains($combined, 'multi-step')
        ) {
            return 'antigravity';
        }

        if (
            str_contains($combined, 'copilot')
            || str_contains($combined, 'vs code')
            || str_contains($combined, 'github issue')
        ) {
            return 'github_copilot';
        }

        return 'codex';
    }

    private function workflowRecommendationReason(string $workflow, Project $project, string $sourceMarkdown = ''): string
    {
        return match ($workflow) {
            'manual_beginner' => 'Skill level atau konteks project menunjukkan kebutuhan langkah manual yang lebih mudah diikuti.',
            'claude_code' => 'Konteks project mengarah ke kebutuhan analisis codebase, debugging, atau refactor bertahap.',
            'github_copilot' => 'Konteks project cocok untuk workflow kecil bertahap ala VS Code dan issue-based implementation.',
            'antigravity' => 'Konteks project cocok untuk task decomposition dan workflow agentic multi-tahap.',
            default => 'Konteks project paling cocok untuk workflow implementasi terstruktur multi-file dengan batasan dan acceptance test yang jelas.',
        };
    }

    private function nextStepWorkflowRules(string $workflow): string
    {
        return match ($workflow) {
            'codex' => <<<'RULES'
- Workflow style must follow Codex.
- Setiap section harus menghasilkan tugas implementasi yang cocok untuk agent multi-file.
- Untuk setiap section, sertakan file target atau area kerja yang spesifik.
- Setiap prompt harus memuat batasan "do not modify" yang jelas untuk mencegah perubahan area yang tidak relevan.
- Setiap section harus punya acceptance test yang bisa diverifikasi setelah task selesai.
RULES,
            'claude_code' => <<<'RULES'
- Workflow style must follow Claude Code.
- Mulai setiap prompt dengan instruksi untuk membaca file relevan terlebih dahulu sebelum mengedit.
- Fokus pada analisis codebase, debugging, refactor aman, dan implementasi file-by-file.
- Setiap section harus menyebut file atau folder yang perlu diinspeksi sebelum perubahan dilakukan.
- Setiap acceptance test harus menekankan verifikasi incremental setelah perubahan kecil.
RULES,
            'github_copilot' => <<<'RULES'
- Workflow style must follow GitHub Copilot.
- Setiap section harus berupa task kecil issue-style yang fokus pada satu komponen atau satu fitur dalam satu waktu.
- Prompt harus singkat, praktis, dan cocok untuk workflow VS Code atau GitHub issue-to-PR.
- Hindari task multi-file yang terlalu besar dalam satu section.
- Acceptance test harus ringkas dan langsung dapat dijalankan setelah task selesai.
RULES,
            'antigravity' => <<<'RULES'
- Workflow style must follow Antigravity.
- Setiap section harus menekankan task decomposition, phase, checkpoint validasi, dan orkestrasi kerja agentic.
- Prompt harus memecah implementasi ke subtask yang runtut sebelum eksekusi.
- Cantumkan checkpoint verifikasi pada tiap section sebelum lanjut ke langkah berikutnya.
RULES,
            'manual_beginner' => <<<'RULES'
- Workflow style must follow Manual Beginner Guide.
- Jangan menulis prompt untuk coding agent.
- Tulis langkah manual yang mudah diikuti manusia, termasuk file atau folder yang dibuka, bagian yang diedit, command yang dijalankan, dan cara verifikasi hasil.
- Gunakan bahasa yang sederhana, tidak teknis berlebihan, dan cocok untuk pemula.
RULES,
            default => <<<'RULES'
- Workflow style must follow the recommended workflow above and must not be generic.
RULES,
        };
    }

    private function codingPromptWorkflowRules(string $workflow): string
    {
        return match ($workflow) {
            'codex' => <<<'RULES'
- Workflow style must follow Codex.
- Generate prompt copy-paste-ready untuk agent multi-file yang bisa bekerja secara terstruktur.
- Setiap prompt harus menyebut target files atau folder yang relevan.
- Setiap prompt harus menyebut batasan "do not modify" dan acceptance test singkat.
- Jangan menghasilkan prompt dangkal yang hanya berisi command terminal.
RULES,
            'claude_code' => <<<'RULES'
- Workflow style must follow Claude Code.
- Setiap prompt harus meminta Claude Code menginspeksi file relevan terlebih dahulu sebelum mengedit.
- Fokus pada reasoning, codebase reading, debugging, refactor aman, dan perubahan incremental.
- Minta output berupa ringkasan analisis, daftar file yang akan diubah, implementasi, lalu verifikasi.
RULES,
            'github_copilot' => <<<'RULES'
- Workflow style must follow GitHub Copilot.
- Setiap prompt harus pendek, issue-style, dan fokus pada satu komponen atau satu feature slice.
- Cocokkan wording dengan workflow VS Code atau GitHub Copilot agent mode.
- Hindari prompt panjang multi-file yang terlalu luas.
RULES,
            'antigravity' => <<<'RULES'
- Workflow style must follow Antigravity.
- Setiap prompt harus menekankan task decomposition, implementation phases, checkpoint validasi, dan agentic workflow.
- Pecah task besar menjadi subtask yang bisa dijalankan berurutan.
RULES,
            'manual_beginner' => <<<'RULES'
- Workflow style must follow Manual Beginner Guide.
- Setiap prompt harus berupa instruksi implementasi yang ramah untuk manusia, bukan agent-only wording.
- Jelaskan file yang dibuka, bagian yang diedit, command yang dijalankan, dan cara memverifikasi hasil.
- Gunakan bahasa sederhana dan terarah untuk pemula.
RULES,
            default => <<<'RULES'
- Workflow style must follow the recommended workflow above and must not be generic.
RULES,
        };
    }
}
