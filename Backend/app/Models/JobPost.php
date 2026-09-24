<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class JobPost extends Model
{
    use \Illuminate\Database\Eloquent\SoftDeletes;
    protected $fillable = [
        'company_id', 'created_by', 'title', 'slug', 'location', 'workplace_type',
        'employment_type', 'salary_range', 'description', 'skills', 'status',
        'published_at', 'closes_at',
        'category', 'experience_level', 'screening_questions', 'moderation_note',
    ];

    protected function casts(): array
    {
        return [
            'skills' => 'array',
            'screening_questions' => 'array',
            'published_at' => 'datetime',
            'closes_at' => 'datetime',
        ];
    }

    public function company()
    {
        return $this->belongsTo(Company::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function applications()
    {
        return $this->hasMany(JobApplication::class);
    }

    public function scopeOpen($query)
    {
        return $query->where('status', 'published')->where(fn ($q) => $q->whereNull('closes_at')->orWhere('closes_at', '>', now()));
    }
}
