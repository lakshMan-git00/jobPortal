<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        User::query()->updateOrCreate(
            ['email' => env('ADMIN_EMAIL', 'eyros@admin.com')],
            [
                'name' => env('ADMIN_NAME', 'Eyros Administrator'),
                'role' => 'admin',
                'password' => Hash::make(env('ADMIN_PASSWORD', 'eyros@123')),
                'email_verified_at' => now(),
            ],
        );
    }
}
