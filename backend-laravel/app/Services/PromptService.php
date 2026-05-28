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
- Project Name: {$project->project_name}
- Project Idea: {$project->project_idea}
- Target User: {$project->target_user}
- Main Problem: {$project->main_problem}
- App Type: {$project->app_type}
- Tech Stack: {$project->tech_stack}
- Skill Level: {$project->skill_level}
- Initial Notes: {$project->initial_prd}

Rules:
- MVP-first, concise, no long theory.
- Stack: Next.js frontend, Laravel REST API backend, MongoDB, mongodb/laravel-mongodb, Groq/OpenRouter.
- Mention history and Markdown `.md` download.
- Frontend calls Laravel API only.
- AI API keys stay in backend `.env`.
- Do not mention Mongoose.
- Do not require Redux for MVP.
- ERD must be one Mermaid `erDiagram`.
- Relationship must be exactly: PROJECTS ||--o{ AI_GENERATIONS : has
- TEAM_MEMBERS must stay standalone.
- Development phases must include:
  - Project setup
  - Laravel backend API
  - MongoDB integration
  - AI integration
  - Next.js frontend integration
  - Testing, polish, and demo preparation
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
- Project Name: {$project->project_name}
- Project Idea: {$project->project_idea}
- Target User: {$project->target_user}
- Main Problem: {$project->main_problem}
- App Type: {$project->app_type}
- Tech Stack: {$project->tech_stack}
- Skill Level: {$project->skill_level}
- Initial Notes: {$project->initial_prd}

Requirements:
- Scope must stay MVP-first and practical.
- Mention the actual stack:
  - Next.js frontend
  - Laravel REST API backend
  - MongoDB database
  - mongodb/laravel-mongodb package
  - Groq/OpenRouter AI API
- Mention saved history and downloadable `.md` results.
- Do not mention Mongoose.
- Do not require Redux for MVP; local state or Context API is enough.

Section guidance:
- Overview: purpose, target users, main problem, MVP goal, short future direction.
- Requirements: functional requirements, non-functional requirements, MVP scope, future improvements, and this exact API endpoint list:
  - POST /api/generate/prd
  - POST /api/generate/next-step
  - POST /api/generate/coding-prompt
  - GET /api/history
  - GET /api/history/{id}
  - GET /api/download/{id}
  - DELETE /api/history/{id}
- Core Features: include exactly these features:
  - PRD Generator
  - Next Step Planner
  - Coding Prompt Generator
  - History Page
  - Detail Result Page
  - Download Markdown
  - About Team Page
- For each core feature, include:
  - short summary
  - stored data reference if relevant
  - 3 to 4 concrete acceptance criteria
- User Flow: ordered flow from input to generation, save, history, detail, download, about team.
- Architecture: explain Next.js -> Laravel API -> AI provider -> MongoDB -> history -> markdown download. State that frontend calls Laravel only, Laravel validates input, builds prompt, calls AI, saves `markdown_content`, and serves downloads.
- Design & Technical Constraints: no API keys in frontend, all AI results stored in MongoDB, every result has `markdown_content`, frontend and backend stay separated, download format is `.md`.
- ERD: include one Mermaid `erDiagram` only with:
  - PROJECTS ||--o{ AI_GENERATIONS : has
  - TEAM_MEMBERS standalone
  - typed fields for PROJECTS, AI_GENERATIONS, TEAM_MEMBERS
- Development Phases: at least 6 compact phases including:
  - Project setup
  - Laravel backend API
  - MongoDB integration
  - AI integration
  - Next.js frontend integration
  - Testing, polish, and demo preparation

ERD field pattern:
- PROJECTS: string _id, string project_name, string project_idea, string target_user, string main_problem, string app_type, string tech_stack, string skill_level, string initial_prd, datetime created_at, datetime updated_at
- AI_GENERATIONS: string _id, string project_id, string generation_type, string title, string markdown_content, object json_content, string ai_provider, string ai_model, datetime created_at, datetime updated_at
- TEAM_MEMBERS: string _id, string name, string nim, string role, string contribution, datetime created_at, datetime updated_at
PROMPT;
    }

    private function buildNextStepPrompt(Project $project, array $context = [], bool $compact = false): string
    {
        $agentMode = $context['agent_mode'] ?? 'auto';
        $selectedAgent = $context['selected_agent'] ?? 'auto';
        $prdSourceMode = $context['prd_source_mode'] ?? 'form';
        $uploadedPrdFilename = $context['uploaded_prd_filename'] ?? '-';
        $sourceGenerationId = $context['source_generation_id'] ?? '-';
        $sourceGenerationType = $context['source_generation_type'] ?? '-';
        $sourceMarkdown = trim((string) ($context['source_generation_markdown'] ?? ''));
        $sourceMarkdownBlock = $sourceMarkdown !== ''
            ? $sourceMarkdown
            : 'Tidak ada source_generation_id. Gunakan konteks project input sebagai sumber utama.';
        $isUploadedPrdMode = $prdSourceMode === 'upload';
        $agentDisplayName = match ($selectedAgent) {
            'codex' => 'Codex',
            'claude-code' => 'Claude Code',
            'github-copilot' => 'GitHub Copilot',
            'antigravity' => 'Antigravity',
            'manual-beginner' => 'Manual Beginner Guide',
            default => 'Auto Recommend Agent',
        };

        if ($compact) {
            return <<<PROMPT
You are a senior technical project planner and beginner-friendly coding mentor.
Return Markdown only.
Write in Indonesian.
Keep the output concise, direct, and practical.

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
- Agent Mode: {$agentMode}
- Selected Agent Display Name: {$agentDisplayName}

Requirements:
- Return Markdown only.
- Focus on practical next actions after the PRD is ready.
- Avoid long theory.
- Keep the selected coding agent context.
- Mention that prompts can be refined again through VibePlan AI if needed.
- Use the PRD source below as the primary basis when available.
- The output must contain exactly these headings in this order:
  - # Next Step Planner - Guided Vibe Coding Roadmap
  - ## 1. Taruh PRD di Folder Project
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
- Every numbered section must use this exact compact structure:
  - Tujuan langkah:
  - Apa yang dilakukan user:
  - Prompt siap pakai untuk coding agent:
  - Hasil yang harus terlihat:
- Every prompt siap pakai must:
  - be inside a fenced code block with language `text`
  - be a natural-language instruction, not short notes
  - mention project context
  - explain what the coding agent should do
  - explain what the coding agent must not do
  - explain what result/output the coding agent must return
  - never be only shell commands or file names

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
- Agent Mode: {$agentMode}
- Selected Agent: {$selectedAgent}
- Selected Agent Display Name: {$agentDisplayName}

Requirements:
- Return Markdown only.
- Use the PRD source below as the main basis.
- The output must contain exactly these headings in this order:
  - # Next Step Planner - Guided Vibe Coding Roadmap
  - ## 1. Taruh PRD di Folder Project
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
- Every numbered section must use this exact compact format:
  - Tujuan langkah:
  - Apa yang dilakukan user:
  - Prompt siap pakai untuk coding agent:
  - Hasil yang harus terlihat:
- For every prompt siap pakai:
  - write it inside a fenced code block with language `text`
  - make it a real instruction, not short notes
  - include project context
  - explain what the coding agent should do
  - explain what the coding agent must not do
  - explain what result/output the coding agent must return
  - never output only shell commands, file names, or TODO fragments
- Bad examples that must never appear:
  - "baca prd"
  - "mengerti konteks projek"
  - "buat folder frontend dan backend"
  - "konfigurasi database dan backend"
- Good prompt style example:
```text
Baca file docs/PRD.md dan pahami kebutuhan project. Jangan menulis kode dulu. Buat ringkasan singkat berisi tujuan aplikasi, fitur utama, kebutuhan backend, kebutuhan frontend, database, endpoint API, risiko implementasi, dan urutan kerja yang disarankan untuk pemula.
```
- Keep prompts beginner-friendly and concise.
- Mention that prompts can be refined again through VibePlan AI when useful.
- Use accurate stack assumptions:
  - Next.js frontend
  - Laravel REST API backend
  - MongoDB with mongodb/laravel-mongodb
  - markdown `.md` download
  - generation ID for result and download
  - AI API keys stay in backend `.env`
- Backend should be recommended first before frontend.
- Frontend must call Laravel API only.

Agent adaptation rules:
- Codex: optimize for structured repository work, incremental edits, verification, and implementation order.
- Claude Code: optimize for codebase analysis, debugging, refactor planning, and terminal workflow.
- GitHub Copilot: optimize for VS Code workflow, smaller iterative tasks, and practical implementation assistance.
- Antigravity: optimize for task decomposition, orchestration, and agentic workflow.
- Manual Beginner Guide: optimize for simpler manual steps and tool-neutral wording.

Section-specific guidance:
- Section 1 must place the PRD at `project-root/docs/PRD.md`.
- Section 2 must create `AGENTS.md` from the PRD.
- Section 3 must ask the coding agent to read the PRD before coding.
- Section 4 must inspect or propose the folder structure first.
- Section 5 must create or verify `frontend-next/`, `backend-laravel/`, `docs/`, `README.md`, and `.gitignore`.
- Section 6 must focus on Laravel backend MVP first, including endpoints, validation, services, MongoDB models, and `.env` safety.
- Section 7 must configure MongoDB and verify `/api/history`.
- Section 8 must implement frontend pages against the existing Laravel API.
- Section 9 must integrate frontend and backend using generation ID, not project ID, for result/download.
- Section 10 must test generate PRD, generate next step, generate coding prompt, history, detail, download, delete, MongoDB persistence, and API key safety.
- Section 11 must prepare GitHub, README, `.env.example`, deployment notes, and production checklist.

PRD source markdown:
{$sourceMarkdownBlock}
PROMPT;
    }

    private function buildCodingPrompt(Project $project, array $context = [], bool $compact = false): string
    {
        $selectedAgent = $context['selected_agent'] ?? 'codex';
        $uploadedNextStepFilename = $context['uploaded_next_step_filename'] ?? '-';
        $nextStepMarkdown = trim((string) ($context['source_generation_markdown'] ?? ''));
        $normalModeRetry = (bool) ($context['normal_mode_retry'] ?? false);
        $agentDisplayName = match ($selectedAgent) {
            'codex' => 'Codex',
            'claude-code' => 'Claude Code',
            'github-copilot' => 'GitHub Copilot',
            'antigravity' => 'Antigravity',
            'manual-beginner' => 'Manual Beginner Guide',
            default => 'Codex',
        };

        if ($compact) {
            return <<<PROMPT
You are a senior software engineer and coding workflow guide.
Return Markdown only.
Write in Indonesian.
Create a concise, copy-paste-ready coding prompt document.
Do not write theory, long explanations, repeated sections, or a full PRD summary.
Use only the uploaded Next Step Planner as the main source.
Generate only practical prompts for the selected coding agent.

- Project Name: {$project->project_name}
- Uploaded Next Step Filename: {$uploadedNextStepFilename}
- Selected Agent: {$selectedAgent}
- Selected Agent Display Name: {$agentDisplayName}

Output rules:
- Start with this exact title: # Coding Prompt Generator - Mode Ringkas
- Use exactly these sections in this order:
  - ## 1. Ringkasan Konteks
  - ## 2. Analisis PRD / Roadmap
  - ## 3. Setup Struktur Project
  - ## 4. Implementasi Backend
  - ## 5. Konfigurasi Database dan API
  - ## 6. Implementasi Frontend
  - ## 7. Integrasi Frontend dan Backend
  - ## 8. Testing, GitHub, dan Deployment
- Section 1 must contain only 3 bullet points in this exact label format:
  - Project:
  - Agent:
  - Tujuan:
- Sections 2 to 8 must use exactly this structure:
  - ### Tujuan
  - ### Prompt siap pakai
  - ### Hasil yang diharapkan
- For every "### Tujuan", write exactly 1 short sentence.
- For every "### Prompt siap pakai", write exactly 1 prompt inside a fenced code block with language `text`.
- For every "### Hasil yang diharapkan", write only 2 short bullet points.
- Every prompt must be maximum 8 lines.
- Every prompt must be natural language instructions, not only bash commands.
- Every prompt must mention the project context from the uploaded roadmap.
- Every prompt must tell the coding agent what to do, what not to do, and what result to return.
- Do not output large code blocks.
- Do not add checklist, conclusion, or extra sections.
- Do not repeat the full roadmap or full PRD.
- Focus only on the most actionable implementation steps from the uploaded roadmap.
- If selected_agent is "codex", optimize prompts for structured repository work and verification.
- If selected_agent is "claude-code", optimize prompts for repo understanding, debugging, and implementation planning.
- If selected_agent is "github-copilot", optimize prompts for practical VS Code workflow and smaller steps.
- If selected_agent is "antigravity", optimize prompts for task breakdown and agentic workflow.
- If selected_agent is "manual-beginner", write simple and beginner-friendly tool-neutral prompts.

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
- Selected Agent: {$selectedAgent}
- Selected Agent Display Name: {$agentDisplayName}

Requirements:
- Return Markdown only.
- The uploaded Next Step Planner is the only main source.
- Do not use the normal project form as the source.
- Do not expose AI API keys.
- The output must contain exactly these sections in this order:
  - # Coding Prompt Generator - Normal Mode
  - ## 1. Analisis PRD / Roadmap
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
- Every prompt must be a natural language instruction to the selected coding agent, not only bash commands.
- Do not add extra sections, checklist, or long introduction.
- Do not rewrite the full PRD or full roadmap.
- Avoid duplicate prompts or repeated explanations.
- Focus on implementation workflow from analysis to deployment.
- Mention project context, what the coding agent should do, what must not be changed, and what output/result should be returned.
- For backend, frontend, integration, testing, GitHub, and deployment sections, require the coding agent to inspect the current repository first before editing files.
- For implementation sections, require the coding agent to preserve existing structure and avoid unrelated rewrites.
- Agent adaptation rules:
  - If selected_agent is "codex", optimize prompts for structured repository work, minimal unrelated edits, verification, and step-by-step implementation.
  - If selected_agent is "claude-code", optimize prompts for codebase understanding, debugging, terminal workflow, and implementation planning.
  - If selected_agent is "github-copilot", optimize prompts for VS Code workflow, smaller iterative tasks, and practical implementation assistance.
  - If selected_agent is "antigravity", optimize prompts for task decomposition, explicit orchestration, and agentic workflow.
  - If selected_agent is "manual-beginner", write simple, tool-neutral, beginner-friendly instructions.
- Section-specific guidance:
  - "Analisis PRD / Roadmap" must focus on understanding scope, stack, roadmap steps, dependencies, and risks before coding.
  - "Buat AGENTS.md" must create guidance from the roadmap and return the rules summary.
  - "Cek Struktur Folder" must inspect the repo and verify the working structure before implementation.
  - "Setup Folder Frontend dan Backend" must create or verify `frontend-next/`, `backend-laravel/`, `docs/`, `README.md`, and `.gitignore`.
  - "Implementasi Backend" must focus on API, service layer, validation, and MongoDB before frontend changes.
  - "Konfigurasi Database dan API" must verify MongoDB connection, endpoint behavior, and safe `.env` usage.
  - "Implementasi Frontend" must build UI against the existing Laravel API without exposing API keys.
  - "Integrasi Frontend dan Backend" must use generation ID for result and download flow.
  - "Testing dan Bug Fixing" must ask the agent to verify behavior, list bugs, and fix them one by one.
  - "GitHub" must prepare clean commit flow, README updates, and repository hygiene.
  - "Deployment" must prepare deployment notes, `.env.example`, and production validation without exposing secrets.

Uploaded Next Step Planner markdown:
{$nextStepMarkdown}
PROMPT;
    }
}
