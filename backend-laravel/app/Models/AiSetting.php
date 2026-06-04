<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use MongoDB\Laravel\Eloquent\Model;

class AiSetting extends Model
{
    protected $connection = 'mongodb';

    protected $collection = 'ai_settings';

    protected $fillable = [
        'provider',
        'masked_api_key',
        'model',
        'fallback_models',
        'base_url',
        'updated_by',
        'updated_at',
    ];

    protected function casts(): array
    {
        return [
            'updated_at' => 'datetime',
            'fallback_models' => 'array',
        ];
    }

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
