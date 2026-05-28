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
        'base_url',
        'updated_by',
        'updated_at',
    ];

    protected function casts(): array
    {
        return [
            'updated_at' => 'datetime',
        ];
    }

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
