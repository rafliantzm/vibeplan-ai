<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use MongoDB\Laravel\Eloquent\Model;

class TokenResetRequest extends Model
{
    protected $connection = 'mongodb';

    protected $collection = 'token_reset_requests';

    protected $fillable = [
        'user_id',
        'reason',
        'status',
        'admin_note',
    ];

    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
