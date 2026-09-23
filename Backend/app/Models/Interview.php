<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Interview extends Model
{
    protected $guarded = ['id'];
    protected function casts(): array
    {
        return ['starts_at' => 'datetime'];
    }
    public function application()
    {
        return $this->belongsTo(JobApplication::class, 'job_application_id');
    }
}
