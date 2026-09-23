<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Env;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AdminProvisioningTest extends TestCase
{
    use RefreshDatabase;

    public function test_provisioning_does_not_reset_passwords_or_promote_existing_accounts(): void
    {
        $repository = Env::getRepository();
        $oldEmail = $repository->get('ADMIN_EMAIL');
        $oldPassword = $repository->get('ADMIN_PASSWORD');
        $repository->set('ADMIN_EMAIL', ' ADMIN@example.com ');
        $repository->set('ADMIN_PASSWORD', 'InitialPassword123');
        try {
            $this->seed(DatabaseSeeder::class);
            $admin = User::where('email', 'admin@example.com')->firstOrFail();
            $this->assertSame('admin', $admin->role);
            $admin->update(['password' => 'ChangedPassword123']);
            $this->seed(DatabaseSeeder::class);
            $this->assertTrue(Hash::check('ChangedPassword123', $admin->fresh()->password));

            $employer = User::factory()->create(['email' => 'employer@example.com', 'role' => 'employer']);
            $repository->set('ADMIN_EMAIL', $employer->email);
            $this->seed(DatabaseSeeder::class);
            $this->assertSame('employer', $employer->fresh()->role);
        } finally {
            $oldEmail === null ? $repository->clear('ADMIN_EMAIL') : $repository->set('ADMIN_EMAIL', $oldEmail);
            $oldPassword === null ? $repository->clear('ADMIN_PASSWORD') : $repository->set('ADMIN_PASSWORD', $oldPassword);
        }
    }
}
