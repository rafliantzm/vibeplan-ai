<?php

namespace App\Services;

class UploadedPrdPreparationService
{
    /**
     * @return array{markdown: string, was_trimmed: bool, original_length: int, trimmed_length: int}
     */
    public function prepareForAi(string $markdown, string $generationMode = 'normal'): array
    {
        $originalLength = strlen($markdown);
        $limit = $generationMode === 'compact' ? 7000 : 12000;

        $normalized = $this->normalizeMarkdown($markdown);
        $prioritized = $this->extractPrioritySections($normalized);
        $prepared = $prioritized !== '' ? $prioritized : $normalized;
        $trimmed = $this->trimToLength($prepared, $limit);

        return [
            'markdown' => $trimmed,
            'was_trimmed' => $trimmed !== $markdown,
            'original_length' => $originalLength,
            'trimmed_length' => strlen($trimmed),
        ];
    }

    private function normalizeMarkdown(string $markdown): string
    {
        $normalized = str_replace(["\r\n", "\r"], "\n", $markdown);
        $normalized = preg_replace('/[ \t]+/', ' ', $normalized) ?? $normalized;
        $normalized = preg_replace('/^\s*([-=_*])\1{2,}\s*$/m', '---', $normalized) ?? $normalized;
        $normalized = preg_replace("/\n{3,}/", "\n\n", $normalized) ?? $normalized;

        return trim($normalized);
    }

    private function extractPrioritySections(string $markdown): string
    {
        $sections = [
            'Overview',
            'Requirements',
            'Core Features',
            'User Flow',
            'Architecture',
            'Entity Relationship Diagram',
            'ERD',
            'Development Phases',
            'API Endpoint List',
        ];

        $found = [];

        foreach ($sections as $section) {
            $pattern = '/^(#{1,6}\s*'.preg_quote($section, '/').'\b[^\n]*)\n?(.*?)(?=^#{1,6}\s+\S|\z)/ims';
            if (preg_match($pattern, $markdown, $matches)) {
                $block = trim(($matches[1] ?? '')."\n".($matches[2] ?? ''));
                if ($block !== '' && ! in_array($block, $found, true)) {
                    $found[] = $block;
                }
            }
        }

        return trim(implode("\n\n", $found));
    }

    private function trimToLength(string $markdown, int $limit): string
    {
        if (strlen($markdown) <= $limit) {
            return $markdown;
        }

        $snippet = substr($markdown, 0, $limit);
        $lastParagraphBreak = strrpos($snippet, "\n\n");

        if ($lastParagraphBreak !== false && $lastParagraphBreak > (int) ($limit * 0.6)) {
            $snippet = substr($snippet, 0, $lastParagraphBreak);
        }

        return trim($snippet);
    }
}
