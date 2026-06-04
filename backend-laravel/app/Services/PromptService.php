<?php

namespace App\Services;

use App\Models\Project;
use InvalidArgumentException;

class PromptService
{
    /**
     * @return array<int, string>
     */
    public function expectedHeadings(string $generationType, bool $compact = false, array $context = []): array
    {
        return $this->expectedHeadingsFor($generationType, $compact, $context);
    }

    public function build(string $generationType, Project $project, bool $compact = false, array $context = []): string
    {
        return match ($generationType) {
            'prd' => $this->buildPrdPrompt($project, $compact, $context),
            'next-step' => $this->buildNextStepPrompt($project, $context, $compact),
            'coding-prompt' => $this->buildCodingPrompt($project, $context, $compact),
            default => throw new InvalidArgumentException("Unsupported generation type [{$generationType}]."),
        };
    }

    public function buildContinuationPrompt(
        string $generationType,
        Project $project,
        string $partialMarkdown,
        bool $compact = false,
        array $context = []
    ): string {
        $projectName = $this->formatPromptValue($project->project_name);
        $expectedHeadings = $this->expectedHeadingsFor($generationType, $compact, $context);
        $continuationFocus = trim((string) ($context['continuation_focus'] ?? ''));
        $partialContextMode = trim((string) ($context['partial_context_mode'] ?? ''));
        $headingList = implode("\n", array_map(
            static fn (string $heading): string => "- {$heading}",
            $expectedHeadings
        ));
        $focusBlock = $continuationFocus !== ''
            ? "\nContinuation focus:\n- {$continuationFocus}\n"
            : '';
        $partialContextIntro = $partialContextMode === 'condensed_snapshot'
            ? 'Existing markdown context below is a condensed snapshot of the current document, focused on the sections that still need expansion.'
            : 'Partial markdown that already exists:';

        return <<<PROMPT
You are continuing a previously truncated VibePlan AI markdown document.
Return Markdown only.
Write in Indonesian.

Rules:
- Continue the SAME document for project "{$projectName}".
- Do not restart from the beginning.
- Do not repeat headings or paragraphs that are already complete.
- If the last visible section in the partial markdown is cut in the middle, rewrite that unfinished section completely and then continue with the remaining sections.
- Keep the exact heading structure below and complete only the missing or unfinished parts.
- Do not add any new top-level headings outside this list.
{$focusBlock}

Expected headings in order:
{$headingList}

{$partialContextIntro}
{$partialMarkdown}
PROMPT;
    }

    public function buildPrdSectionCompletionPrompt(
        Project $project,
        string $sectionTitle,
        string $documentSnapshot,
        bool $compact = false,
        array $context = []
    ): string {
        $projectName = $this->formatPromptValue($project->project_name);
        $projectIdea = $this->formatPromptValue($project->project_idea);
        $targetUser = $this->formatPromptValue($project->target_user);
        $mainProblem = $this->formatPromptValue($project->main_problem);
        $appType = $this->formatPromptValue($project->app_type);
        $techStack = $this->formatPromptValue($project->tech_stack);
        $architecture = $this->resolveArchitectureContext((string) ($project->tech_stack ?? ''));
        $sectionHeading = $compact
            ? ($sectionTitle === 'Data Model & ERD' ? '## 8. Data Model & ERD' : '## 9. API Design')
            : ($sectionTitle === 'Data Model & ERD' ? '## 20. Data Model & ERD' : '## 21. API Design');
        $sectionInstructions = $sectionTitle === 'Data Model & ERD'
            ? $this->prdDataModelSectionInstructions($compact)
            : $this->prdApiDesignSectionInstructions($compact);

        return <<<PROMPT
You are revising one section of an existing VibePlan AI PRD.
Return Markdown only.
Write in Indonesian.

Task:
- Rewrite the section "{$sectionTitle}" so it is implementation-ready, richer, and specific to the project domain.
- Return only ONE full replacement section starting with the exact heading "{$sectionHeading}".
- Do not include any other top-level PRD sections before or after it.
- Keep the content synchronized with the current project context and the existing PRD snapshot.

Project context:
- Project Name: {$projectName}
- Project Idea: {$projectIdea}
- Target User: {$targetUser}
- Main Problem: {$mainProblem}
- App Type: {$appType}
- Tech Stack (raw): {$techStack}
- Frontend Stack: {$architecture['frontend']}
- Backend Stack: {$architecture['backend']}
- Database Stack: {$architecture['database']}

Current PRD snapshot:
{$documentSnapshot}

Section rules:
{$sectionInstructions}
PROMPT;
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
        $compactHeadings = implode("\n", [
            '- # PRD - '.$projectName,
            '- ## 1. Executive Summary',
            '- ## 2. Project Overview',
            '- ## 3. Problem Statement',
            '- ## 4. Target Users & Roles',
            '- ## 5. Core Features',
            '- ## 6. User Journey',
            '- ## 7. Information Architecture',
            '- ## 8. Data Model & ERD',
            '- ## 9. API Design',
            '- ## 10. UI Pages / Screens',
            '- ## 11. Recommended Tech Stack',
            '- ## 12. Development Phases',
        ]);
        $normalHeadings = implode("\n", [
            '- # PRD - '.$projectName,
            '- ## 1. Document Control',
            '- ## 2. Executive Summary',
            '- ## 3. Background & Context',
            '- ## 4. Problem Statement',
            '- ## 5. Goals, Objectives & Success Metrics',
            '- ## 6. Scope',
            '- ## 7. Assumptions, Constraints & Dependencies',
            '- ## 8. Stakeholders & User Roles',
            '- ## 9. User Personas',
            '- ## 10. User Stories',
            '- ## 11. Functional Requirements',
            '- ## 12. Non-Functional Requirements',
            '- ## 13. System Context',
            '- ## 14. High-Level System Architecture',
            '- ## 15. Module Breakdown',
            '- ## 16. Implementation System Design',
            '- ## 17. AI/LLM Implementation Plan',
            '- ## 18. User Journey',
            '- ## 19. Information Architecture',
            '- ## 20. Data Model & ERD',
            '- ## 21. API Design',
            '- ## 22. UI Pages / Screens',
            '- ## 23. Validation & Business Rules',
            '- ## 24. Recommended Tech Stack',
            '- ## 25. Development Phases',
            '- ## 26. Final Development Notes',
        ]);
        $mermaidRules = <<<RULES
- If you include diagrams, use fenced code blocks with language `mermaid`.
- For architecture diagrams, use valid `flowchart LR` syntax.
- For user journey diagrams, use valid `sequenceDiagram` syntax.
- For ERD, use valid `erDiagram` syntax only.
- For the Data Model & ERD section, generate a compact Mermaid `erDiagram` that only contains entities and relationships.
- Do not include entity attributes or field definitions inside the Mermaid ERD.
- Put all fields, types, indexes, and descriptions in a separate Data Dictionary table below the ERD.
- Use uppercase entity names inside the Mermaid ERD.
- Keep the ERD readable in one viewport and use only the most important domain entities.
- Do not reuse generic entities such as USERS, PROJECTS, DOCUMENTS, or CHATS unless they are truly part of the product domain.
- Use simple node IDs without spaces.
- Put visible labels inside square brackets or quotes, for example `api["Backend API"]`.
- Do not output invalid Mermaid like free text directly under `graph TD` or malformed arrows.
RULES;

        if ($compact) {
            return <<<PROMPT
You are a senior product manager and software architect.
Return Markdown only.
Write a compact but professional MVP PRD in Indonesian.
Keep every section direct, practical, and implementation-ready.

Use exactly these top-level sections in this order:
{$compactHeadings}

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
- MVP-first, concise, no long theory, no filler text.
- Before writing the PRD, infer the app domain, primary actors, core entities, main workflow, external integrations, and database style from the user's request. Use that inferred domain in every section.
- Architecture wajib mengikuti input Tech Stack dari user.
- Jangan menggunakan stack internal aplikasi generator.
- Jangan menulis Next.js, Laravel, MongoDB, Groq, OpenRouter, atau AI_GENERATIONS kecuali memang disebutkan oleh user.
- Jangan mengganti React.js menjadi Next.js, Node.js menjadi Laravel, atau Supabase PostgreSQL menjadi MongoDB.
- Jika salah satu stack kosong, tulis "Belum ditentukan" dan jangan mengarang framework baru.
- System Architecture section must explicitly list:
  - Frontend: {$frontendStack}
  - Backend: {$backendStack}
  - Database: {$databaseStack}
  - Stored Data: {$storedDataDescription}
- Stored Data must use "{$storageStructure}" terminology that matches the selected database.
- Core Features must be derived from project idea, user problem, app type, and initial notes. Do not reuse VibePlan AI features.
- Target Users must mention realistic roles only when they are relevant to the product type.
- User Flow must describe the actual user journey of the user's product, not the generator application's flow.
- Data Model / Database Design must mention 8 to 12 tables or collections that truly match the user's product domain.
- API Design must include 18 to 28 endpoints that match the user's product domain and feel like a real MVP API surface.
- Avoid placeholder endpoints like `/api/summarize` or `/api/chat` unless the project is actually a summarizer or chatbot product.
- Prefer versioned REST-style paths such as `/api/v1/...` that feel production-ready.
- UI Pages / Screens must mention the main pages the user will actually need.
- Development Phases must follow the selected stack and MVP scope of the user's project.
{$mermaidRules}

Section guidance:
- Executive Summary: summarize the product, problem, target user, and product value in 1 short paragraph plus 3 bullet points.
- Project Overview: explain project purpose, scope, and main outcome.
- Problem Statement: explain the concrete problem, current workaround, and business gap.
- Target Users & Roles: list relevant roles only and explain the main responsibility of each role.
- Core Features: list 5 to 7 realistic MVP features. For each feature include deskripsi, tujuan, role pengguna, prioritas, dan 2 acceptance criteria.
- User Journey: write 1 short explanation, 1 numbered main flow, and 1 valid Mermaid `sequenceDiagram` that is domain-aware.
- Information Architecture: list main pages, navigation structure, and key screens.
- Data Model & ERD: explain the data structure briefly, include 8 to 12 core entities with relationships, add a valid Mermaid `erDiagram` with relationship-only syntax, then add a richer enterprise-grade data dictionary per entity. The data dictionary must use clean Markdown tables and should feel like professional schema documentation, not a short field list.
- API Design: generate a complete enterprise-grade API specification. Group endpoints by module, keep it domain-aware, and format it like professional API documentation instead of a short bullet dump. Do not collapse modules into one-line endpoint bullets. A strong enterprise PRD should expose most important backend processes, not only overview endpoints. After API Overview, continue until the important backend workflows are covered end-to-end.
- UI Pages / Screens: list important screens, purpose, main components, and role access.
- Recommended Tech Stack: if the user already gave a stack, respect it. If not, recommend a realistic stack and explain briefly.
- Development Phases: write 4 to 6 short phases from setup to deployment.
PROMPT;
        }

        $retryRule = $conciseRetry
            ? 'Generate the same PRD structure, but compress each section. Use short paragraphs and short bullets only. Do not exceed the output limit.'
            : 'Keep each section rich but controlled. Prefer practical bullets, short paragraphs, and product-specific details over generic theory.';

        return <<<PROMPT
You are a senior product manager and software architect.
Return Markdown only.
Write in Indonesian for developers and coding agents.
{$retryRule}

Use exactly these top-level sections in this order:
{$normalHeadings}

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
- Before writing the PRD, infer the application domain, primary actors, core entities, workflow, external integrations, and database style from the user's request. Use that inferred domain to create accurate User Journey and ERD diagrams.
- Architecture wajib mengikuti input Tech Stack dari user. Jangan menggunakan stack internal aplikasi generator.
- Jangan menulis Next.js, Laravel, MongoDB, Groq, OpenRouter, atau AI_GENERATIONS kecuali memang disebutkan oleh user.
- Jangan mengganti React.js menjadi Next.js, Node.js menjadi Laravel, atau Supabase PostgreSQL menjadi MongoDB.
- Jika Frontend Stack, Backend Stack, atau Database Stack kosong, tulis "Belum ditentukan".
- Gunakan stack berikut secara eksplisit di section System Architecture:
  - Frontend: {$frontendStack}
  - Backend: {$backendStack}
  - Database: {$databaseStack}
  - Stored Data: {$storedDataDescription}
- Functional Requirements, User Journey, Information Architecture, Data Model, API plan, UI pages, implementation design, dan milestones harus menggambarkan produk milik user, bukan aplikasi VibePlan AI.
- Hindari menyisipkan endpoint, fitur history, markdown download, AI provider, atau arsitektur internal generator jika tidak diminta user.
- Do not write shallow generic PRD text. Every section must feel specific to the user's project domain, target users, and business context.
- If the user did not provide a complete stack, keep missing parts as "Belum ditentukan" and optionally add a short recommendation inside System Architecture without pretending it was explicitly chosen by the user.
- User Journey and Data Model & ERD are mandatory in every PRD.
- User Journey must show realistic interaction between actor, frontend, backend/API, database, and external service if relevant.
- Data Model & ERD must use entity names from the app domain. Do not reuse payment entities unless the user's project is actually about payment.
- API Design must use domain-correct modules and realistic versioned routes. Do not output generic demo endpoints if the project scope is broader than a single AI utility.
{$mermaidRules}

Section guidance:
- 1. Document Control:
  - Include document title, draft version, generated date, status, target release, prepared by, and placeholder owner/stakeholder.
- 2. Executive Summary:
  - Open with a concrete product summary in 1 short paragraph.
  - Mention the business context, target user, and why the product matters.
- 3. Background & Context:
  - Explain the current situation, pain points, opportunity, and why the solution is relevant now.
- 4. Problem Statement:
  - Explain the pain points, current alternatives, business gap, and why the problem matters now.
  - Avoid vague statements like "user kesulitan" without context.
- 5. Goals, Objectives & Success Metrics:
  - Separate business goals, user goals, technical goals, product success metrics, and operational success metrics.
  - Include realistic metrics such as conversion, latency, error rate, accuracy, completion rate, or cost per request if relevant.
- 6. Scope:
  - Separate In Scope, Out of Scope, Future Scope, MVP Scope, and extended scope if relevant.
- 7. Assumptions, Constraints & Dependencies:
  - Mention assumptions, technical constraints, business constraints, external dependencies, legal/privacy constraints if relevant.
- 8. Stakeholders & User Roles:
  - List realistic user roles only if they fit the project.
  - Explain stakeholder interest, role description, permission summary, priority, and user needs per role.
- 9. User Personas:
  - Add 2 to 4 realistic personas with role, goals, pain points, behavior, main feature used, and success expectation.
- 10. User Stories:
  - Write 8 to 15 user stories using "As a ..., I want ..., so that ...".
  - Add priority, acceptance criteria, and edge cases for each story.
- 11. Functional Requirements:
  - This must be detailed and implementation-ready.
  - For each requirement use this structure:
    - Description
    - User Role
    - Trigger
    - Preconditions
    - Main Flow
    - Alternative Flow
    - Error Flow
    - Business Rules
    - Input
    - Output
    - Acceptance Criteria
    - Priority
    - Dependencies
  - Include all critical features, not just a short feature list.
- 12. Non-Functional Requirements:
  - Split clearly into Performance, Security, Reliability, Scalability, Maintainability, Usability, Compliance & Privacy.
  - Mention concrete targets or engineering expectations whenever possible.
- 13. System Context:
  - Include one valid Mermaid `flowchart LR` showing user, frontend, backend, database, storage, and external services that are actually relevant.
- 14. High-Level System Architecture:
  - Explain client layer, API layer, application/service layer, domain/business logic layer, data access layer, infrastructure layer, external integration layer, and observability layer.
  - Include one valid Mermaid architecture diagram, preferably `flowchart TB`.
- 15. Module Breakdown:
  - Break the product into modules.
  - For each module include responsibility, main features, input, output, related data model, related API, dependencies, and failure handling.
- 16. Implementation System Design:
  - Cover Frontend Implementation, Backend Implementation, Database Implementation, Storage Implementation, Background Job / Queue Implementation, and Integration Implementation.
  - If a part is not needed for MVP, write "Not required for MVP" and explain why.
- 17. AI/LLM Implementation Plan:
  - If the project uses AI, explain AI use cases, provider, model selection, prompt strategy, preprocessing, parsing, chunking, embedding or retrieval if relevant, token budgeting, schema validation, guardrails, hallucination mitigation, fallback provider, cost control, and evaluation metrics.
  - If the project does not use AI, write clearly that it is not applicable for MVP.
- 18. User Journey:
  - Start with a short explanation of the primary journey.
  - Provide one numbered end-to-end user flow.
  - Include one valid Mermaid `sequenceDiagram`.
  - The diagram must use domain-aware participants, for example Student/Teacher/Admin, Customer/Seller/Admin, Merchant/Router/Provider, User/AI Service/Backend/Database, depending on the project.
- 19. Information Architecture:
  - Explain site map, navigation, and key screens.
  - Mention page groupings or modules that help the product stay organized.
- 20. Data Model & ERD:
  - Start with a short overview of the data layer and explain whether the system uses tables or collections.
  - Add a subsection `### Entity Relationship Diagram` and include one valid Mermaid `erDiagram` that matches the actual product domain.
  - The ERD must use clear business entities, not abstract placeholders.
  - The Mermaid ERD must show relationships only. Do not place fields or types inside entity blocks.
  - Use uppercase entity names such as `USERS`, `DOCUMENTS`, `QUIZZES`, `CHAT_SESSIONS`.
  - Use a cleaner ERD layout with 5 to 8 main entities, realistic foreign-key relationships, and labels that are easy to read.
  - The ERD should feel compact and professional in one viewport. Favor only the core domain entities over long exhaustive lists.
  - Every entity shown in the Mermaid ERD must also be documented in the Data Dictionary.
  - Do not stop after one or two entities unless the product is truly tiny. A normal PRD should document the main domain entities comprehensively.
  - After the ERD, add a subsection `### Data Dictionary`.
  - The Data Dictionary must cover the entities that matter most for implementation, such as ownership, content, workflow, transactions, logs, settings, reports, or results depending on the app domain.
  - Do not stop after only one entity. Cover all main domain entities, minimum 6 if the product scope is not extremely small.
  - Each entity must be domain-aware. Payment products should have payment-oriented entities, marketplace products should have product/order/cart-oriented entities, and AI education products should have document/summary/quiz/chat-oriented entities.
  - Each entity must explicitly declare its `Entity Type`, for example: `Master`, `Transaction`, `Event Log`, `Configuration`, `Reference`, `Join`, `Analytics`, or `System`.
  - For each entity, use this exact structure and order:
    - `#### ENTITY_NAME`
    - `**Entity Type:** ...`
    - `**Purpose:** ...`
    - `**Module / Domain Area:** ...`
    - `**Primary Owner:** ...`
    - `**Storage Type:** Collection/Table`
    - `**Source of Truth:** ...`
    - `**Description:** ...`
    - `**Relationships:**`
    - `**Indexes:**`
    - `**Constraints / Rules:**`
    - `**Retention Policy:** ...`
    - `**Related APIs:**`
    - `**Related Modules:**`
    - If relevant, also add:
      - `**Status Values:**`
      - `**Audit Fields:**`
    - Then add one Markdown field specification table with columns:
      - `Field | Type | Required | Nullable | Default | Unique | Indexed | Example | Validation | Description`
    - If relevant, you may append extra columns such as:
      - `Enum Values`
      - `Sensitive Data`
      - `Notes`
  - The table must explain all important fields, not only 2 or 3 rows.
  - A normal core entity should have around 8 to 16 meaningful fields unless the entity is truly small.
  - Do not compress an entity into a single `Fields:` line. Every main entity must use the full structured specification plus the detailed field table.
  - Every important entity should mention primary key, foreign key or reference field, status field, audit field, unique constraints, index strategy, and business meaning.
  - Make the field set realistic for the entity type:
    - `Master` entities usually have name/code/slug/status/metadata fields.
    - `Transaction` entities usually have ownership, reference, amount or payload, status, processing timestamps, and audit fields.
    - `Event Log` entities usually have parent reference, event type, source, payload, processing status, retry info, and timestamps.
    - `Configuration` entities usually have scope, config key/value, activation flags, and versioning fields.
  - If a status field exists, explain the possible lifecycle values and what each value means.
  - If audit fields such as `created_at`, `updated_at`, `deleted_at`, `created_by`, or `updated_by` exist, explain them clearly.
  - For MongoDB, use the term `Collection` and realistic document types such as `ObjectId`, `string`, `number`, `boolean`, `array`, `object`, `datetime`.
  - For SQL, use the term `Table` and realistic relational types such as `UUID`, `VARCHAR(255)`, `INT`, `DECIMAL(19,4)`, `BOOLEAN`, `TIMESTAMP`, `JSONB`, or `DATE`.
  - Explain whether sensitive or credential fields are internal, secret, or should be encrypted/masked if relevant.
  - Related APIs must reference the important endpoints that read or write the entity.
  - Related Modules must point to the product modules that use the entity.
  - Output clean Markdown tables that can be rendered reliably by the frontend. Do not output fake table rows as bullet lines.
  - Follow this visual pattern semantically: compact ERD first, then a richer data dictionary per entity. The ERD is for relationships; the data dictionary is for fields.
  - The output should feel closer to enterprise schema documentation, not a minimal database note.
- 21. API Design:
  - For the API Design section, generate a complete enterprise-grade API specification. Do not only list endpoint, auth, request, and response briefly.
  - API Design must be domain-aware. Infer the correct API modules from the project domain. Payment apps need authentication, merchants, API keys, providers, provider credentials, payment methods, routing rules, payments, payment attempts, refunds, webhooks, reports, admin, audit, and health APIs. Marketplace apps need auth, products, categories, inventory, carts, checkout, orders, payments, shipments, reviews, sellers, admin, and health APIs. AI education apps need auth, document upload, document processing, summaries, quizzes, chat sessions, AI jobs, history, storage, user settings, analytics, and health APIs.
  - Start with `### API Overview`.
  - In API Overview, explain:
    - `Base URL`
    - `API version`
    - `Authentication method`
    - `Request format`
    - `Response format`
    - `Error format`
    - `Rate limit strategy`
    - `Idempotency strategy` if relevant
    - `Pagination strategy` if relevant
    - `Webhook strategy` if relevant
  - Then add `### API Response Standards`.
  - Under API Response Standards, include:
    - standard success response in fenced `json`
    - standard error response in fenced `json`
    - standard paginated list response in fenced `json`
  - Then add `### API Error Code Catalog` using a Markdown table with columns:
    - `Error Code | HTTP Status | Meaning | Recommended Client Action`
  - Then add `### API Versioning Strategy`.
  - Then add `### API Modules`.
  - Under API Modules, group endpoints by module headings such as `### Authentication API`, `### Payment API`, `### Quiz API`, `### Reporting API`, `### Admin API`, depending on the project domain.
  - The module list must cover the real business needs of the product. Do not skip important modules if they are implied by the feature set, ERD, user roles, or business rules.
  - For a normal enterprise PRD, each major module should contain around 2 to 5 endpoints, except health or utility modules which may contain 1 to 3 endpoints.
  - A normal PRD should have at least 6 domain modules and at least 16 total endpoints. For complex systems, prefer 18 to 28 endpoints.
  - Do not present module endpoints as one-line bullet summaries. Expand each important endpoint using the full documentation template below.
  - Use versioned paths like `/api/v1/...` unless the user's stack clearly uses another pattern.
  - The endpoint set must feel like a real MVP surface area for the product, not generic demo routes.
  - The API set must be synchronized with Functional Requirements, User Roles, Data Model & ERD, and Validation & Business Rules.
  - For every important endpoint, use this exact structure and order:
    - `#### METHOD /api/v1/...`
    - `**Purpose:** ...`
    - `**Auth Required:** Yes/No`
    - `**Permission:** ...`
    - `**Actor:** ...`
    - `**Headers:**`
    - a Markdown table with columns `Header | Required | Description`
    - `**Path Params:**`
    - `**Query Params:**`
    - `**Request Body:**`
    - a Markdown table with columns `Field | Type | Required | Validation | Description`
    - `**Success Response:**` followed by a fenced `json` block
    - `**Error Responses:**` followed by a Markdown table with columns `Status | Error Code | Meaning`
    - `**Business Rules:**`
    - `**Related Data Model:**`
  - Include realistic permissions, roles, validation rules, rate limit assumptions, and idempotency requirement when relevant.
  - Explain request and response contracts clearly enough that backend engineers, frontend engineers, QA, and API consumers can all understand what each endpoint does.
  - Important list endpoints must mention pagination, filter, sort, or search parameters when relevant.
  - Important mutation endpoints must mention duplicate prevention, ownership rules, and validation or state-transition rules when relevant.
  - Sensitive or internal endpoints should explicitly mention security controls such as role restriction, audit logging, or webhook signature verification.
  - Do not stop at `Base URL`, `Auth`, and 2 or 3 sample endpoints. Continue documenting the actual process APIs needed so backend services, jobs, webhooks, reporting, and admin operations can all be implemented from the PRD.
  - Add `### Webhook Design` if the project needs callback, notification, or external provider integration.
  - In Webhook Design, explain security headers, validation strategy, idempotent processing, retry handling, and how webhook events update related entities.
  - Add `### API Flow Diagram` and include one valid Mermaid `sequenceDiagram` for the most critical API interaction.
  - Make the API set feel like production API documentation, not a loose bullet list.
  - Do not stop after 2 or 3 endpoints. A normal PRD should show a realistic API surface for the MVP.
  - If the project is complex, prefer broader API coverage over overly short endpoint examples.
- 22. UI Pages / Screens:
  - List the key pages/screens.
  - For each page include: fungsi halaman, komponen utama, and role akses.
- 23. Validation & Business Rules:
  - Include input validation, role permissions, ownership rules, data integrity rules, and domain-specific rules.
- 24. Recommended Tech Stack:
  - Explain frontend, backend, database, auth, external APIs, storage, queue/background jobs if relevant.
  - If backend is Node.js and no framework is specified, describe it as Node.js REST API or Express.js API.
  - If database is Supabase PostgreSQL, explain storage as tables.
- 25. Development Phases:
  - Write 3 to 5 phases with estimated duration, deliverables, and success checkpoints.
- 26. Final Development Notes:
  - Close with risk register, operational readiness notes, release checklist, and open questions that should be clarified before build starts.

Formatting rules:
- Use clear Markdown headings exactly as specified.
- Use short paragraphs and practical bullets.
- Use tables only when they improve readability.
- Do not create empty sections.
- Do not mention VibePlan AI internal features or infrastructure.
PROMPT;
    }

    private function prdDataModelSectionInstructions(bool $compact): string
    {
        $minimumEntities = $compact ? 6 : 8;
        $maximumEntities = $compact ? 9 : 12;

        return <<<RULES
- Explain the data layer briefly, then include `### Entity Relationship Diagram`.
- Use one valid Mermaid `erDiagram` with 5 to 8 core entities and relationship-only syntax.
- After the ERD, include `### Data Dictionary`.
- The Data Dictionary must document {$minimumEntities} to {$maximumEntities} main entities that are truly needed by the system.
- Do not stop after one or two entities.
- Every entity must use this exact structure:
  - `#### ENTITY_NAME`
  - `**Entity Type:** ...`
  - `**Purpose:** ...`
  - `**Module / Domain Area:** ...`
  - `**Primary Owner:** ...`
  - `**Storage Type:** Collection/Table`
  - `**Source of Truth:** ...`
  - `**Description:** ...`
  - `**Relationships:**`
  - `**Indexes:**`
  - `**Constraints / Rules:**`
  - `**Retention Policy:** ...`
  - `**Related APIs:**`
  - `**Related Modules:**`
  - optional `**Status Values:**`
  - optional `**Audit Fields:**`
- After the metadata lines, include one Markdown field table with columns:
  `Field | Type | Required | Nullable | Default | Unique | Indexed | Example | Validation | Description`
- Every core entity should normally have 8 to 16 meaningful fields unless the entity is genuinely small.
- The data dictionary must cover ownership, configuration, transactions, logs/events, operational records, and admin/reporting data if they are relevant to the domain.
- The section must feel like database documentation that backend engineers can implement directly.
RULES;
    }

    private function prdApiDesignSectionInstructions(bool $compact): string
    {
        $minimumModules = $compact ? 5 : 6;
        $minimumEndpoints = $compact ? 12 : 16;

        return <<<RULES
- Start with `### API Overview`.
- Then include `### API Response Standards`, `### API Error Code Catalog`, `### API Versioning Strategy`, and `### API Modules`.
- Under `### API Modules`, document at least {$minimumModules} API modules and at least {$minimumEndpoints} total endpoints.
- The modules and endpoints must cover the real backend process flow of the system, not just overview endpoints.
- For each important endpoint, use this exact structure:
  - `#### METHOD /api/v1/...`
  - `**Purpose:** ...`
  - `**Auth Required:** Yes/No`
  - `**Permission:** ...`
  - `**Actor:** ...`
  - `**Headers:**`
  - a Markdown table `Header | Required | Description`
  - `**Path Params:**`
  - `**Query Params:**`
  - `**Request Body:**`
  - a Markdown table `Field | Type | Required | Validation | Description`
  - `**Success Response:**` followed by fenced `json`
  - `**Error Responses:**` followed by a Markdown table `Status | Error Code | Meaning`
  - `**Business Rules:**`
  - `**Related Data Model:**`
- Include all critical workflow APIs so backend and database implementation can run end-to-end.
- If the product needs webhook or callback handling, add `### Webhook Design`.
- Finish with `### API Flow Diagram` and one valid Mermaid `sequenceDiagram` for the most critical backend interaction.
RULES;
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
        $projectName = $this->formatPromptValue($project->project_name);
        $normalModeRetry = (bool) ($context['normal_mode_retry'] ?? false);
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
        $normalModeRetryRules = $normalModeRetry
            ? "- Keep every numbered section shorter than the first attempt.\n- Use maximum 2 short bullets per subsection.\n- Every 'Prompt siap pakai' must be maximum 6 lines.\n- Avoid repeated explanation across sections.\n- Prioritize only the most actionable backend, frontend, integration, and testing steps."
            : "- Keep the output practical, structured, and aligned with the selected workflow.";

        if ($compact) {
            return <<<PROMPT
You are a senior technical project planner and beginner-friendly coding mentor.
Return Markdown only.
Write in Indonesian.
Keep the output concise, direct, and practical.
Output wajib mengikuti coding_workflow yang dipilih user. Jangan membuat roadmap generik. Jangan mengganti workflow user dengan workflow lain kecuali coding_workflow = auto.

Create a compact Next Step Planner based on this project context:

- Project Name: {$projectName}
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
  - # Next Step Planner - {$projectName}
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
{$normalModeRetryRules}

Create a Guided Vibe Coding Roadmap based on the project and PRD context below.

- Project Name: {$projectName}
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
  - # Next Step Planner - {$projectName}
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

    /**
     * @return array<int, string>
     */
    private function expectedHeadingsFor(string $generationType, bool $compact, array $context = []): array
    {
        return match ($generationType) {
            'prd' => [
                '# PRD',
                $compact ? '## 1. Executive Summary' : '## 1. Document Control',
                $compact ? '## 2. Project Overview' : '## 2. Executive Summary',
                $compact ? '## 3. Problem Statement' : '## 3. Background & Context',
                $compact ? '## 4. Target Users & Roles' : '## 4. Problem Statement',
                $compact ? '## 5. Core Features' : '## 5. Goals, Objectives & Success Metrics',
                $compact ? '## 6. User Journey' : '## 6. Scope',
                $compact ? '## 7. Information Architecture' : '## 7. Assumptions, Constraints & Dependencies',
                $compact ? '## 8. Data Model & ERD' : '## 8. Stakeholders & User Roles',
                $compact ? '## 9. API Design' : '## 9. User Personas',
                $compact ? '## 10. UI Pages / Screens' : '## 10. User Stories',
                $compact ? '## 11. Recommended Tech Stack' : '## 11. Functional Requirements',
                $compact ? '## 12. Development Phases' : '## 12. Non-Functional Requirements',
                ...($compact ? [] : [
                    '## 13. System Context',
                    '## 14. High-Level System Architecture',
                    '## 15. Module Breakdown',
                    '## 16. Implementation System Design',
                    '## 17. AI/LLM Implementation Plan',
                    '## 18. User Journey',
                    '## 19. Information Architecture',
                    '## 20. Data Model & ERD',
                    '## 21. API Design',
                    '## 22. UI Pages / Screens',
                    '## 23. Validation & Business Rules',
                    '## 24. Recommended Tech Stack',
                    '## 25. Development Phases',
                    '## 26. Final Development Notes',
                ]),
            ],
            'next-step' => $this->expectedNextStepHeadings($context),
            'coding-prompt' => $compact
                ? $this->expectedCodingPromptCompactHeadings($context)
                : $this->expectedCodingPromptNormalHeadings($context),
            default => ['# Document'],
        };
    }

    /**
     * @return array<int, string>
     */
    private function expectedNextStepHeadings(array $context = []): array
    {
        $headings = ['# Next Step Planner'];

        if (($context['coding_workflow'] ?? $context['selected_agent'] ?? 'auto') === 'auto') {
            $headings[] = '## Rekomendasi Workflow';
        }

        return [
            ...$headings,
            '## 1. Taruh PRD di Folder Project',
            '## 2. Buat AGENTS.md',
            '## 3. Prompt Pertama: Baca PRD',
            '## 4. Prompt Kedua: Cek Struktur Folder',
            '## 5. Buat Folder Frontend dan Backend',
            '## 6. Implementasi Backend Terlebih Dahulu',
            '## 7. Konfigurasi Database dan Backend',
            '## 8. Implementasi Frontend',
            '## 9. Integrasi Frontend dan Backend',
            '## 10. Testing Aplikasi',
            '## 11. GitHub dan Deployment',
        ];
    }

    /**
     * @return array<int, string>
     */
    private function expectedCodingPromptCompactHeadings(array $context = []): array
    {
        $headings = ['# Coding Prompt Generator - Mode Ringkas'];

        if (($context['coding_workflow'] ?? $context['selected_agent'] ?? 'auto') === 'auto') {
            $headings[] = '## Rekomendasi Workflow';
        }

        return [
            ...$headings,
            '## 1. Ringkasan Konteks',
            '## 2. Analisis PRD / Roadmap',
            '## 3. Setup Struktur Project',
            '## 4. Implementasi Backend',
            '## 5. Konfigurasi Database dan API',
            '## 6. Implementasi Frontend',
            '## 7. Integrasi Frontend dan Backend',
            '## 8. Testing, GitHub, dan Deployment',
        ];
    }

    /**
     * @return array<int, string>
     */
    private function expectedCodingPromptNormalHeadings(array $context = []): array
    {
        $headings = ['# Coding Prompt Generator - Normal Mode'];

        if (($context['coding_workflow'] ?? $context['selected_agent'] ?? 'auto') === 'auto') {
            $headings[] = '## Rekomendasi Workflow';
        }

        return [
            ...$headings,
            '## 1. Analisis PRD / Roadmap',
            '## 2. Buat AGENTS.md',
            '## 3. Cek Struktur Folder',
            '## 4. Setup Folder Frontend dan Backend',
            '## 5. Implementasi Backend',
            '## 6. Konfigurasi Database dan API',
            '## 7. Implementasi Frontend',
            '## 8. Integrasi Frontend dan Backend',
            '## 9. Testing dan Bug Fixing',
            '## 10. GitHub',
            '## 11. Deployment',
        ];
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
