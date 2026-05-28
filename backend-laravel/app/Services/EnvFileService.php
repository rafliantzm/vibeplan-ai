<?php

namespace App\Services;

use RuntimeException;

class EnvFileService
{
    public function updateValue(string $envPath, string $key, string $value): void
    {
        $envContent = file_exists($envPath) ? (string) file_get_contents($envPath) : '';
        $lineEnding = $this->detectLineEnding($envContent);
        $existingLine = $this->findLine($envContent, $key);
        $replacementLine = $this->buildLine($key, $value, $existingLine);

        if ($existingLine !== null) {
            $pattern = '/^'.preg_quote($key, '/').'=.*$/m';
            $updatedContent = preg_replace($pattern, $replacementLine, $envContent, 1);

            if ($updatedContent === null) {
                throw new RuntimeException("Gagal memperbarui key {$key} di file .env.");
            }
        } else {
            $trimmedContent = rtrim($envContent, "\r\n");
            $updatedContent = $trimmedContent === ''
                ? $replacementLine.$lineEnding
                : $trimmedContent.$lineEnding.$replacementLine.$lineEnding;
        }

        $bytesWritten = file_put_contents($envPath, $updatedContent, LOCK_EX);

        if ($bytesWritten === false) {
            throw new RuntimeException("Gagal menulis perubahan {$key} ke file .env.");
        }

        $verifiedValue = $this->readValue($envPath, $key);

        if ($verifiedValue !== $value) {
            throw new RuntimeException("Verifikasi update {$key} di file .env gagal.");
        }
    }

    public function readValue(string $envPath, string $key): ?string
    {
        if (! file_exists($envPath)) {
            return null;
        }

        $content = (string) file_get_contents($envPath);
        $line = $this->findLine($content, $key);

        if ($line === null) {
            return null;
        }

        $rawValue = substr($line, strlen($key) + 1);
        $trimmedValue = trim($rawValue);

        if ($trimmedValue === '') {
            return '';
        }

        $firstChar = $trimmedValue[0];
        $lastChar = $trimmedValue[strlen($trimmedValue) - 1];

        if (
            strlen($trimmedValue) >= 2
            && (($firstChar === '"' && $lastChar === '"') || ($firstChar === "'" && $lastChar === "'"))
        ) {
            $trimmedValue = substr($trimmedValue, 1, -1);
        }

        return str_replace('\"', '"', $trimmedValue);
    }

    private function findLine(string $content, string $key): ?string
    {
        if (preg_match('/^'.preg_quote($key, '/').'=.*$/m', $content, $matches) !== 1) {
            return null;
        }

        return $matches[0];
    }

    private function buildLine(string $key, string $value, ?string $existingLine): string
    {
        $quote = $this->detectQuote($existingLine);
        $escapedValue = str_replace('"', '\"', $value);

        if ($quote === "'") {
            return $key."='".$value."'";
        }

        if ($quote === '') {
            return $key.'='.$value;
        }

        return $key.'="'.$escapedValue.'"';
    }

    private function detectQuote(?string $existingLine): string
    {
        if ($existingLine === null) {
            return '"';
        }

        $value = substr($existingLine, strpos($existingLine, '=') + 1);
        $trimmedValue = trim($value);

        if ($trimmedValue === '') {
            return '"';
        }

        $firstChar = $trimmedValue[0];

        if ($firstChar === '"' || $firstChar === "'") {
            return $firstChar;
        }

        return '';
    }

    private function detectLineEnding(string $content): string
    {
        return str_contains($content, "\r\n") ? "\r\n" : PHP_EOL;
    }
}
