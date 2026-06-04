<?php

namespace App\Exceptions;

use RuntimeException;

class AiProviderException extends RuntimeException
{
    public function __construct(
        private readonly string $errorCode,
        string $message,
        private readonly int $status = 500,
        private readonly ?string $rawProviderMessage = null,
        private readonly ?string $userMessage = null,
    ) {
        parent::__construct($message);
    }

    public function errorCode(): string
    {
        return $this->errorCode;
    }

    public function status(): int
    {
        return $this->status;
    }

    public function rawProviderMessage(): ?string
    {
        return $this->rawProviderMessage;
    }

    public function userMessage(): ?string
    {
        return $this->userMessage;
    }
}
