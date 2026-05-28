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
        $label = match ($generationType) {
            'prd' => 'PRD',
            'next-step' => 'Next Step Planner',
            'coding-prompt' => 'Coding Prompts',
            default => Str::title(str_replace('-', ' ', $generationType)),
        };

        return "{$label} - {$projectName}";
    }

    public function downloadFilename(AiGeneration $generation): string
    {
        $slug = Str::slug($generation->title ?: $generation->generation_type ?: 'generation');
        $timestamp = optional($generation->created_at)->format('Ymd-His') ?? now()->format('Ymd-His');

        return "{$slug}-{$timestamp}.md";
    }
}
