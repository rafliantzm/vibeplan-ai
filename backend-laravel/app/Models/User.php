<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\HasMany;
use MongoDB\Laravel\Auth\User as Authenticatable;

class User extends Authenticatable
{
    protected $connection = 'mongodb';

    protected $collection = 'users';

    protected $fillable = [
        'name',
        'display_name',
        'email',
        'password_hash',
        'avatar_url',
        'avatar_path',
        'role',
        'token_balance',
        'status',
    ];

    protected $hidden = [
        'password_hash',
    ];

    protected function casts(): array
    {
        return [
            'token_balance' => 'integer',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
            'avatar_url' => 'string',
            'avatar_path' => 'string',
            'display_name' => 'string',
        ];
    }

    public function getAuthPassword(): string
    {
        return (string) $this->password_hash;
    }

    public function authTokens(): HasMany
    {
        return $this->hasMany(AuthToken::class, 'user_id');
    }

    public function tokenResetRequests(): HasMany
    {
        return $this->hasMany(TokenResetRequest::class, 'user_id');
    }

    public function generations(): HasMany
    {
        return $this->hasMany(AiGeneration::class, 'user_id');
    }

    public function activityLogs(): HasMany
    {
        return $this->hasMany(UserActivityLog::class, 'user_id');
    }
}
