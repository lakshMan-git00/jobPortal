<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Company extends Model
{
    use HasFactory;

    protected $fillable = ['name', 'slug', 'description', 'website', 'created_by'];

    public function employers()
    {
        return $this->hasMany(User::class);
    }

    public function jobs()
    {
        return $this->hasMany(JobPost::class);
    }
}
