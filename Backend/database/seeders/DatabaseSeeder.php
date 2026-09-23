<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $email = strtolower(trim((string) env('ADMIN_EMAIL')));
        $password = env('ADMIN_PASSWORD');
        if (! $email || ! $password) {
            $this->command?->warn('Set ADMIN_EMAIL and ADMIN_PASSWORD to provision the initial administrator.');

            return;
        }
        // Never reset credentials or promote an existing account during a deploy.
        if (User::withTrashed()->whereRaw('LOWER(email) = ?', [$email])->exists()) {
            return;
        }
        User::query()->create(
            [
                'email' => $email,
                'name' => env('ADMIN_NAME', 'Eyros Administrator'),
                'role' => 'admin',
                'password' => $password,
            ],
        );
    }
}
