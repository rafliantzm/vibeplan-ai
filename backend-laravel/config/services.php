<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'frontend_url' => env('FRONTEND_URL', 'http://localhost:3000'),

    'google' => [
        'client_id' => env('GOOGLE_CLIENT_ID'),
        'client_secret' => env('GOOGLE_CLIENT_SECRET'),
        'redirect' => env('GOOGLE_REDIRECT_URI'),
    ],

    'ai' => [
        'provider' => env('AI_PROVIDER', 'gemini'),
        'base_url' => env('AI_BASE_URL', 'https://generativelanguage.googleapis.com/v1beta'),
        'model' => env('AI_MODEL', 'gemini-2.5-flash'),
        'fallback_model' => env('AI_FALLBACK_MODEL'),
        'fallback_provider' => env('AI_FALLBACK_PROVIDER'),
        'fallback_models' => array_values(array_filter(array_map(
            static fn (string $model): string => trim($model),
            explode(',', (string) env('AI_FALLBACK_MODELS', ''))
        ))),
        'fallback_providers' => array_values(array_filter(array_map(
            static fn (string $provider): string => trim($provider),
            explode(',', (string) env('AI_FALLBACK_PROVIDERS', ''))
        ))),
        'enable_mock_fallback' => filter_var(env('AI_ENABLE_MOCK_FALLBACK', false), FILTER_VALIDATE_BOOL),
        'api_key' => env('AI_API_KEY'),
        'timeout' => (int) env('AI_TIMEOUT', 120),
        'thinking_budget' => (int) env('AI_GEMINI_THINKING_BUDGET', 0),
        'max_tokens' => (int) env('AI_MAX_TOKENS', 2200),
        'prd_max_tokens' => (int) env('AI_PRD_MAX_TOKENS', 4800),
        'next_step_max_tokens' => (int) env('AI_NEXT_STEP_MAX_TOKENS', 2400),
        'coding_prompt_max_tokens' => (int) env('AI_CODING_PROMPT_MAX_TOKENS', 2200),
        'compact_max_tokens' => (int) env('AI_COMPACT_MAX_TOKENS', 600),
        'app_name' => env('AI_APP_NAME', 'VibePlan AI'),
        'http_referer' => env('AI_HTTP_REFERER'),
        'providers' => [
            'gemini' => [
                'base_url' => env('GEMINI_BASE_URL', 'https://generativelanguage.googleapis.com/v1beta'),
                'model' => env('GEMINI_MODEL', env('AI_MODEL', 'gemini-2.5-flash')),
                'api_key' => env('GEMINI_API_KEY', env('AI_API_KEY')),
            ],
            'openrouter' => [
                'base_url' => env('OPENROUTER_BASE_URL', 'https://openrouter.ai/api/v1'),
                'model' => env('OPENROUTER_MODEL', 'openai/gpt-4o-mini'),
                'api_key' => env('OPENROUTER_API_KEY', env('AI_API_KEY')),
            ],
            'groq' => [
                'base_url' => env('GROQ_BASE_URL', 'https://api.groq.com/openai/v1'),
                'model' => env('GROQ_MODEL', 'llama-3.1-8b-instant'),
                'api_key' => env('GROQ_API_KEY', env('AI_API_KEY')),
            ],
            'openai' => [
                'base_url' => env('OPENAI_BASE_URL', 'https://api.openai.com/v1'),
                'model' => env('OPENAI_MODEL', 'gpt-4o-mini'),
                'api_key' => env('OPENAI_API_KEY', env('AI_API_KEY')),
            ],
            'mock' => [
                'base_url' => '',
                'model' => 'demo-prd-generator',
                'api_key' => '',
            ],
        ],
    ],

];
