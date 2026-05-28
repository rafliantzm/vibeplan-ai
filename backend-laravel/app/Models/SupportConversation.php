<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use MongoDB\Laravel\Eloquent\Model;

class SupportConversation extends Model
{
    protected $connection = 'mongodb';

    protected $collection = 'support_conversations';

    protected $fillable = [
        'user_id',
        'guest_session_id',
        'name',
        'email',
        'status',
        'last_message',
        'last_message_at',
        'unread_for_admin',
        'unread_for_user',
    ];

    protected function casts(): array
    {
        return [
            'last_message_at' => 'datetime',
            'unread_for_admin' => 'integer',
            'unread_for_user' => 'integer',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function messages(): HasMany
    {
        return $this->hasMany(SupportChatMessage::class, 'conversation_id');
    }
}
