<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class JobApplication extends Model
{
    protected $fillable = ['job_post_id', 'candidate_id', 'cover_letter', 'status'];

    public function job()
    {
        return $this->belongsTo(JobPost::class, 'job_post_id');
    }
}
