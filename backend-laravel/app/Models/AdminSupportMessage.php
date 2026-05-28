<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use MongoDB\Laravel\Eloquent\Model;

class AdminSupportMessage extends Model
{
    protected $connection = 'mongodb';

    protected $collection = 'admin_support_messages';

    protected $fillable = [
        'user_id',
        'name',
        'email',
        'message',
        'status',
        'admin_reply',
        'replied_by',
        'replied_at',
    ];

    protected function casts(): array
    {
        return [
            'replied_at' => 'datetime',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function repliedByAdmin(): BelongsTo
    {
        return $this->belongsTo(User::class, 'replied_by');
    }
}
