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

    'ai' => [
        'provider' => env('AI_PROVIDER', 'groq'),
        'base_url' => env('AI_BASE_URL'),
        'model' => env('AI_MODEL'),
        'api_key' => env('AI_API_KEY'),
        'timeout' => (int) env('AI_TIMEOUT', 120),
        'max_tokens' => (int) env('AI_MAX_TOKENS', 1800),
        'prd_max_tokens' => (int) env('AI_PRD_MAX_TOKENS', 2500),
        'next_step_max_tokens' => (int) env('AI_NEXT_STEP_MAX_TOKENS', 2200),
        'coding_prompt_max_tokens' => (int) env('AI_CODING_PROMPT_MAX_TOKENS', 3500),
        'compact_max_tokens' => (int) env('AI_COMPACT_MAX_TOKENS', 1200),
        'app_name' => env('AI_APP_NAME', 'VibePlan AI'),
        'http_referer' => env('AI_HTTP_REFERER'),
    ],

];
