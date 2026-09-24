<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class JobApplication extends Model
{
    protected $fillable = ['job_post_id', 'candidate_id', 'cover_letter', 'status', 'resume_id', 'answers', 'history'];

    protected function casts(): array
    {
        return ['answers' => 'array', 'history' => 'array'];
    }

    public function job()
    {
        return $this->belongsTo(JobPost::class, 'job_post_id')->withTrashed();
    }

    public function candidate()
    {
        return $this->belongsTo(User::class, 'candidate_id')->withTrashed();
    }
}
