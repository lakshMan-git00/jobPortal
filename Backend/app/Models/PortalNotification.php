<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PortalNotification extends Model
{
    protected $guarded = ['id'];

    public static function send(int $userId, string $title, string $href): void
    {
        static::create(['user_id' => $userId, 'title' => $title, 'href' => $href]);
    }
}
