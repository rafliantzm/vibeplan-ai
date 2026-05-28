<?php

namespace App\Models;

use MongoDB\Laravel\Eloquent\Model;

class TeamMember extends Model
{
    protected $connection = 'mongodb';

    protected $collection = 'team_members';

    protected $fillable = [
        'name',
        'nim',
        'role',
        'contribution',
    ];
}
