<?php

namespace App\Models;

use MongoDB\Laravel\Eloquent\Model;

class UserActivityLog extends Model
{
    protected $connection = 'mongodb';

    protected $collection = 'user_activity_logs';

    protected $fillable = [
        'user_id',
        'performed_by',
        'target_user_id',
        'action',
        'description',
        'metadata',
        'ip_address',
        'user_agent',
    ];

    protected function casts(): array
    {
        return [
            'metadata' => 'array',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }
}
