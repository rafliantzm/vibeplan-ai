<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use MongoDB\Laravel\Eloquent\Model;

class SupportChatMessage extends Model
{
    protected $connection = 'mongodb';

    protected $collection = 'support_chat_messages';

    protected $fillable = [
        'conversation_id',
        'sender_type',
        'sender_id',
        'sender_name',
        'message',
        'read_at',
    ];

    protected function casts(): array
    {
        return [
            'read_at' => 'datetime',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(SupportConversation::class, 'conversation_id');
    }
}
