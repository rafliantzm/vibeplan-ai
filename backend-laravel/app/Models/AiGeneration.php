<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use MongoDB\Laravel\Eloquent\Model;

class AiGeneration extends Model
{
    protected $connection = 'mongodb';

    protected $collection = 'ai_generations';

    protected $fillable = [
        'project_id',
        'user_id',
        'generation_type',
        'title',
        'markdown_content',
        'json_content',
        'ai_provider',
        'ai_model',
    ];

    protected function casts(): array
    {
        return [
            'json_content' => 'array',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class, 'project_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
