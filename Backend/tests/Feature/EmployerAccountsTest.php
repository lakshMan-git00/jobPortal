<?php

namespace Tests\Feature;

use App\Models\Company;
use App\Models\JobApplication;
use App\Models\JobPost;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class EmployerAccountsTest extends TestCase
{
    use RefreshDatabase;

    private function company(User $admin): Company
    {
        return Company::create(['name' => 'Acme', 'slug' => 'acme', 'created_by' => $admin->id]);
    }

    private function token(User $user): string
    {
        return $user->createToken('test')->plainTextToken;
    }

    private function asToken(?string $token): static
    {
        // Each HTTP request must resolve its own bearer token, as in production.
        $this->app['auth']->forgetGuards();
        $this->withHeaders(['Authorization' => $token ? 'Bearer '.$token : '']);

        return $this;
    }

    public function test_admin_created_employer_can_login_and_publish_for_its_company(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $company = $this->company($admin);
        $adminToken = $this->token($admin);
        $id = $this->asToken($adminToken)->postJson('/api/admin/employers', [
            'name' => 'Hiring Manager', 'email' => '  Employer@Example.com ',
            'password' => 'StrongPassword123', 'password_confirmation' => 'StrongPassword123',
            'company_id' => $company->id,
        ])->assertCreated()->assertJsonPath('data.is_active', true)->json('data.id');
        $this->assertTrue(Hash::check('StrongPassword123', User::findOrFail($id)->password));
        $token = $this->asToken(null)->postJson('/api/auth/login', [
            'email' => ' EMPLOYER@example.COM ', 'password' => 'StrongPassword123',
        ])->assertOk()->assertJsonPath('user.role', 'employer')->json('token');
        $this->asToken($token)->getJson('/api/auth/me')->assertOk()->assertJsonPath('user.id', $id);
        $this->asToken($token)->postJson('/api/employer/jobs', [
            'title' => 'Engineer', 'location' => 'Kathmandu', 'workplace_type' => 'Remote',
            'employment_type' => 'Full-time', 'description' => 'Build our product.',
        ])->assertCreated()->assertJsonPath('data.company', 'Acme');
        $this->asToken($token)->getJson('/api/admin/employers')->assertForbidden();
        $this->asToken($adminToken)->getJson('/api/admin/employers')->assertOk()->assertJsonPath('data.0.id', $id);
    }

    public function test_password_reset_revokes_sessions_and_replaces_credentials(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $employer = User::factory()->create(['role' => 'employer', 'password' => 'OldPassword123']);
        $oldToken = $this->token($employer);
        $this->asToken($this->token($admin))->patchJson('/api/admin/employers/'.$employer->id, [
            'password' => 'NewPassword123', 'password_confirmation' => 'NewPassword123',
        ])->assertOk();
        $this->asToken($oldToken)->getJson('/api/auth/me')->assertUnauthorized();
        $this->asToken(null)->postJson('/api/auth/login', ['email' => $employer->email, 'password' => 'OldPassword123'])->assertUnprocessable();
        $this->asToken(null)->postJson('/api/auth/login', ['email' => $employer->email, 'password' => 'NewPassword123'])->assertOk();
    }

    public function test_suspension_blocks_existing_sessions_and_login_until_activated(): void
    {
        $adminToken = $this->token(User::factory()->create(['role' => 'admin']));
        $employer = User::factory()->create(['role' => 'employer', 'password' => 'EmployerPass123']);
        $oldToken = $this->token($employer);
        $url = '/api/admin/employers/'.$employer->id;
        $this->asToken($adminToken)->patchJson($url, ['is_active' => false])->assertOk();
        $this->asToken($oldToken)->getJson('/api/auth/me')->assertUnauthorized();
        $this->asToken(null)->postJson('/api/auth/login', ['email' => $employer->email, 'password' => 'EmployerPass123'])->assertForbidden();
        $this->asToken($adminToken)->patchJson($url, ['is_active' => true])->assertOk();
        $this->asToken(null)->postJson('/api/auth/login', ['email' => $employer->email, 'password' => 'EmployerPass123'])->assertOk();
        $this->asToken($oldToken)->getJson('/api/auth/me')->assertUnauthorized();
    }

    public function test_removal_preserves_jobs_and_applications_but_ends_access(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $company = $this->company($admin);
        $employer = User::factory()->create(['role' => 'employer', 'company_id' => $company->id, 'password' => 'EmployerPass123']);
        $job = JobPost::create([
            'company_id' => $company->id, 'created_by' => $employer->id, 'title' => 'Engineer', 'slug' => 'engineer',
            'location' => 'Remote', 'workplace_type' => 'Remote', 'employment_type' => 'Full-time', 'description' => 'Build things.',
        ]);
        $application = JobApplication::create(['job_post_id' => $job->id, 'candidate_id' => User::factory()->create()->id]);
        $token = $this->token($employer);
        $adminToken = $this->token($admin);
        $this->asToken($adminToken)->deleteJson('/api/admin/employers/'.$employer->id)->assertNoContent();
        $this->assertSoftDeleted($employer);
        $this->assertDatabaseHas('job_posts', ['id' => $job->id]);
        $this->assertDatabaseHas('job_applications', ['id' => $application->id]);
        $this->asToken($token)->getJson('/api/auth/me')->assertUnauthorized();
        $this->asToken(null)->postJson('/api/auth/login', ['email' => $employer->email, 'password' => 'EmployerPass123'])->assertUnprocessable();
        $this->asToken($adminToken)->getJson('/api/admin/employers')->assertJsonPath('data', []);
    }

    public function test_only_admins_can_manage_employers_and_other_roles_cannot_be_targeted(): void
    {
        $employer = User::factory()->create(['role' => 'employer']);
        foreach (['candidate', 'employer'] as $role) {
            $token = $this->token(User::factory()->create(['role' => $role]));
            $this->asToken($token)->postJson('/api/admin/employers', [])->assertForbidden();
            $this->asToken($token)->patchJson('/api/admin/employers/'.$employer->id, ['is_active' => false])->assertForbidden();
            $this->asToken($token)->deleteJson('/api/admin/employers/'.$employer->id)->assertForbidden();
        }
        $admin = User::factory()->create(['role' => 'admin']);
        $adminToken = $this->token($admin);
        foreach ([$admin, User::factory()->create(['role' => 'candidate'])] as $other) {
            $this->asToken($adminToken)->patchJson('/api/admin/employers/'.$other->id, ['is_active' => false])->assertNotFound();
            $this->asToken($adminToken)->deleteJson('/api/admin/employers/'.$other->id)->assertNotFound();
        }
    }

    public function test_normalized_duplicate_email_and_invalid_password_are_rejected(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $company = $this->company($admin);
        User::factory()->create(['email' => 'existing@example.com']);
        $this->asToken($this->token($admin))->postJson('/api/admin/employers', [
            'name' => 'Employer', 'email' => 'Existing@Example.com', 'company_id' => $company->id,
            'password' => 'short', 'password_confirmation' => 'different',
        ])->assertUnprocessable()->assertJsonValidationErrors(['email', 'password']);
    }

    public function test_account_edit_revokes_access_and_ignores_role_escalation(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $employer = User::factory()->create(['role' => 'employer']);
        $oldToken = $this->token($employer);
        $this->asToken($this->token($admin))->patchJson('/api/admin/employers/'.$employer->id, [
            'email' => ' Updated@Example.com ', 'name' => 'Updated Employer',
            'company_id' => $this->company($admin)->id, 'role' => 'admin',
        ])->assertOk()->assertJsonPath('data.email', 'updated@example.com')->assertJsonPath('data.role', 'employer');
        $this->asToken($oldToken)->getJson('/api/auth/me')->assertUnauthorized();
    }

    public function test_legacy_mixed_case_email_can_sign_in(): void
    {
        User::factory()->create(['email' => 'LegacyEmployer@Example.com', 'role' => 'employer', 'password' => 'EmployerPass123']);
        $this->postJson('/api/auth/login', ['email' => 'legacyemployer@example.com', 'password' => 'EmployerPass123'])
            ->assertOk()->assertJsonPath('user.role', 'employer');
    }

    public function test_suspended_account_cannot_use_a_token_even_if_it_was_not_revoked(): void
    {
        $employer = User::factory()->create(['role' => 'employer', 'is_active' => false]);
        $token = $this->token($employer);
        $this->asToken($token)->getJson('/api/auth/me')->assertUnauthorized();
        $this->assertSame(0, $employer->tokens()->count());
    }
}
