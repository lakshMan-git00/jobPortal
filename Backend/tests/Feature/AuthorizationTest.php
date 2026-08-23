<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthorizationTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_job_list_is_empty_until_an_employer_publishes_a_job(): void
    {
        $this->getJson('/api/jobs')
            ->assertOk()
            ->assertJsonPath('data', []);
    }

    public function test_candidate_cannot_access_admin_company_management(): void
    {
        $candidate = User::factory()->create(['role' => 'candidate']);

        $this->actingAs($candidate)
            ->postJson('/api/admin/companies', ['name' => 'Unauthorised Company'])
            ->assertForbidden();
    }

    public function test_admin_can_create_a_company(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin)
            ->postJson('/api/admin/companies', ['name' => 'Acme Inc.'])
            ->assertCreated()
            ->assertJsonPath('data.name', 'Acme Inc.');

        $this->assertDatabaseHas('companies', ['name' => 'Acme Inc.', 'created_by' => $admin->id]);
    }
}
