<?php

namespace App\Exceptions;

use RuntimeException;

class TokenLimitExceededException extends RuntimeException
{
    public function __construct(
        string $message = 'Token VibePlan AI tidak cukup untuk memproses input sebesar ini.',
        private readonly ?string $rawProviderMessage = null,
    ) {
        parent::__construct($message);
    }

    public function rawProviderMessage(): ?string
    {
        return $this->rawProviderMessage;
    }
}
