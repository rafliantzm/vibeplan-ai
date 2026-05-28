<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\HasMany;
use MongoDB\Laravel\Eloquent\Model;

class Project extends Model
{
    protected $connection = 'mongodb';

    protected $collection = 'projects';

    protected $fillable = [
        'project_name',
        'project_idea',
        'target_user',
        'main_problem',
        'app_type',
        'tech_stack',
        'skill_level',
        'initial_prd',
    ];

    public function generations(): HasMany
    {
        return $this->hasMany(AiGeneration::class, 'project_id');
    }
}
