<?php

namespace App\Services;

use App\Models\AiGeneration;
use Illuminate\Support\Str;

class MarkdownService
{
    public function normalize(string $markdown): string
    {
        $normalized = str_replace(["\r\n", "\r"], "\n", trim($markdown));

        return $normalized === '' ? '' : $normalized."\n";
    }

    public function titleFor(string $generationType, string $projectName): string
    {
        $cleanProjectName = $this->cleanProjectTitle($projectName) ?: 'VibePlan';
        $label = match ($generationType) {
            'prd' => 'PRD',
            'next-step' => 'Next Step Planner',
            'coding-prompt' => 'Coding Prompts',
            default => Str::title(str_replace('-', ' ', $generationType)),
        };

        return "{$label} - {$cleanProjectName}";
    }

    public function downloadFilename(AiGeneration $generation): string
    {
        $projectName = $this->resolveProjectName($generation);
        $slug = Str::slug($projectName ?: 'vibeplan');
        $suffix = match ((string) $generation->generation_type) {
            'prd', 'prd_generator' => 'prd',
            'next-step', 'next_step', 'next_step_planner' => 'next-step-planner',
            'coding-prompt', 'coding_prompt', 'coding_prompt_generator' => 'coding-prompt',
            default => 'result',
        };

        return "{$slug}-{$suffix}.md";
    }

    private function resolveProjectName(AiGeneration $generation): string
    {
        $snapshotProjectName = data_get($generation->json_content, 'project_name')
            ?: data_get($generation->json_content, 'input_snapshot.project_name');

        if (is_string($snapshotProjectName) && trim($snapshotProjectName) !== '') {
            return $this->cleanProjectTitle(trim($snapshotProjectName)) ?: trim($snapshotProjectName);
        }

        $projectName = $generation->project?->project_name;

        if (is_string($projectName) && trim($projectName) !== '') {
            return $this->cleanProjectTitle(trim($projectName)) ?: trim($projectName);
        }

        $title = (string) ($generation->title ?? '');

        if ($title !== '') {
            $cleaned = preg_replace('/^(PRD|Next Step Planner|Coding Prompts?)\s*-\s*/i', '', $title) ?? $title;
            $cleaned = trim($cleaned);

            if ($cleaned !== '') {
                return $this->cleanProjectTitle($cleaned) ?: $cleaned;
            }
        }

        return 'vibeplan';
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
