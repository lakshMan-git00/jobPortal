<?php

namespace Tests\Feature;

use App\Models\{Company, Interview, JobApplication, JobPost, Resume, User};
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class RecruitmentWorkflowTest extends TestCase
{
    use RefreshDatabase;

    private function team(): array
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $company = Company::create(['name' => 'Test Team', 'slug' => 'test-team', 'created_by' => $admin->id]);
        $employer = User::factory()->create(['role' => 'employer', 'company_id' => $company->id]);
        $candidate = User::factory()->create(['role' => 'candidate']);
        return [$admin, $employer, $candidate];
    }

    private function job(User $employer, array $attributes = []): JobPost
    {
        return JobPost::create([...$this->jobData(), 'slug' => 'role-'.uniqid(), 'created_by' => $employer->id, 'company_id' => $employer->company_id, 'status' => 'published', 'published_at' => now(), ...$attributes]);
    }

    private function jobData(): array
    {
        return ['title' => 'Senior engineer', 'location' => 'Kathmandu', 'workplace_type' => 'Hybrid', 'employment_type' => 'Full-time', 'description' => 'Build reliable software with our team.', 'skills' => ['Laravel']];
    }

    public function test_job_review_application_interview_and_notification_journey(): void
    {
        [$admin, $employer, $candidate] = $this->team();
        $jobId = $this->actingAs($employer)->postJson('/api/employer/jobs', $this->jobData())->assertCreated()->assertJsonPath('data.status', 'pending')->json('data.id');
        $this->getJson('/api/jobs')->assertJsonCount(0, 'data');
        $this->actingAs($employer)->patchJson("/api/employer/jobs/$jobId/status", ['status' => 'published'])->assertUnprocessable();
        $this->actingAs($admin)->patchJson("/api/admin/jobs/$jobId/status", ['status' => 'published'])->assertOk();
        $this->getJson('/api/jobs')->assertJsonPath('meta.total', 1);
        $appId = $this->actingAs($candidate)->postJson("/api/jobs/$jobId/apply", ['cover_letter' => 'I enjoy building reliable products.'])->assertCreated()->json('data.id');
        $this->postJson("/api/jobs/$jobId/apply")->assertConflict();
        $this->getJson('/api/workspace/applications')->assertJsonCount(1, 'data');
        $this->actingAs($employer)->getJson('/api/workspace/notifications')->assertJsonCount(2, 'data');
        $this->patchJson("/api/workspace/applications/$appId/status", ['status' => 'hired'])->assertUnprocessable();
        $this->patchJson("/api/workspace/applications/$appId/status", ['status' => 'shortlisted'])->assertOk();
        $interviewId = $this->postJson('/api/employer/interviews', ['job_application_id' => $appId, 'starts_at' => now()->addDay()->toISOString(), 'duration_minutes' => 45, 'location' => 'Office'])->assertCreated()->json('data.id');
        $this->actingAs($candidate)->getJson('/api/workspace/interviews')->assertJsonPath('data.0.id', $interviewId);
        $this->getJson("/api/workspace/applications/$appId")->assertJsonPath('data.status', 'interview')->assertJsonCount(3, 'data.history');
        $this->postJson("/api/workspace/applications/$appId/messages", ['body' => 'Thank you. See you then.'])->assertCreated();
        $this->actingAs($employer)->getJson("/api/workspace/applications/$appId/messages")->assertJsonPath('data.0.body', 'Thank you. See you then.');
        $this->actingAs($candidate)->patchJson("/api/workspace/applications/$appId/status", ['status' => 'withdrawn'])->assertOk();
        $this->assertDatabaseHas('interviews', ['id' => $interviewId, 'status' => 'cancelled']);
        $this->actingAs($employer)->patchJson("/api/workspace/applications/$appId/status", ['status' => 'offer'])->assertUnprocessable();
    }

    public function test_other_users_cannot_read_or_change_private_workflow_data(): void
    {
        [, $employer, $candidate] = $this->team();
        $job = $this->job($employer);
        $application = JobApplication::create(['job_post_id' => $job->id, 'candidate_id' => $candidate->id, 'status' => 'shortlisted']);
        $otherCandidate = User::factory()->create(['role' => 'candidate']);
        $otherEmployer = User::factory()->create(['role' => 'employer', 'company_id' => $employer->company_id]);
        foreach ([$otherCandidate, $otherEmployer] as $user) {
            $this->actingAs($user)->getJson('/api/workspace/applications')->assertJsonCount(0, 'data');
            $this->getJson('/api/workspace/applications/'.$application->id)->assertNotFound();
            $this->postJson('/api/workspace/applications/'.$application->id.'/messages', ['body' => 'Uninvited'])->assertNotFound();
        }
        $this->actingAs($otherEmployer)->putJson('/api/employer/jobs/'.$job->id, $this->jobData())->assertForbidden();
        $this->postJson('/api/employer/interviews', ['job_application_id' => $application->id, 'starts_at' => now()->addDay()->toISOString(), 'duration_minutes' => 30, 'location' => 'Office'])->assertNotFound();
        $this->actingAs($candidate)->postJson('/api/employer/jobs', $this->jobData())->assertForbidden();
    }

    public function test_resumes_are_private_validated_and_retained_after_submission(): void
    {
        Storage::fake('local');
        [, $employer, $candidate] = $this->team();
        $this->actingAs($candidate)->postJson('/api/candidate/resumes', ['file' => UploadedFile::fake()->create('unsafe.html', 20, 'text/html')])->assertUnprocessable();
        $id = $this->postJson('/api/candidate/resumes', ['file' => UploadedFile::fake()->create('resume.pdf', 30, 'application/pdf')])->assertCreated()->assertJsonPath('data.is_default', true)->assertJsonMissingPath('data.path')->json('data.id');
        $other = User::factory()->create(['role' => 'candidate']);
        $this->actingAs($other)->getJson("/api/workspace/resumes/$id/download")->assertNotFound();
        $job = $this->job($employer);
        $this->postJson('/api/jobs/'.$job->id.'/apply', ['resume_id' => $id])->assertUnprocessable();
        $this->actingAs($candidate)->postJson('/api/jobs/'.$job->id.'/apply', ['resume_id' => $id])->assertCreated();
        $this->deleteJson("/api/candidate/resumes/$id")->assertUnprocessable();
        $this->actingAs($employer)->get("/api/workspace/resumes/$id/download")->assertOk();
    }

    public function test_saved_jobs_are_idempotent_and_scoped(): void
    {
        [, $employer, $candidate] = $this->team();
        $job = $this->job($employer);
        $this->actingAs($candidate)->putJson('/api/candidate/saved-jobs/'.$job->id)->assertNoContent();
        $this->putJson('/api/candidate/saved-jobs/'.$job->id)->assertNoContent();
        $this->getJson('/api/candidate/saved-jobs')->assertJsonCount(1, 'data');
        $this->getJson('/api/candidate/jobs/'.$job->slug.'/state')->assertJsonPath('data.saved', true);
        $this->actingAs(User::factory()->create(['role' => 'candidate']))->getJson('/api/candidate/saved-jobs')->assertJsonCount(0, 'data');
        $this->actingAs($candidate)->deleteJson('/api/candidate/saved-jobs/'.$job->id)->assertNoContent();
        $this->getJson('/api/candidate/saved-jobs')->assertJsonCount(0, 'data');
    }

    public function test_search_filters_paginate_and_exclude_expired_or_unreviewed_jobs(): void
    {
        [, $employer] = $this->team();
        for ($i = 0; $i < 14; $i++) $this->job($employer);
        $this->job($employer, ['status' => 'pending']);
        $this->job($employer, ['closes_at' => now()->subDay()]);
        $this->getJson('/api/jobs?workplace_type=Hybrid&keyword=Laravel')->assertJsonPath('meta.total', 14)->assertJsonCount(12, 'data');
        $this->getJson('/api/jobs?page=2')->assertJsonPath('meta.current_page', 2)->assertJsonCount(2, 'data');
        $this->getJson('/api/jobs?workplace_type=Remote')->assertJsonPath('meta.total', 0);
        $expired = $this->job($employer, ['closes_at' => now()->subDay()]);
        $this->actingAs(User::factory()->create(['role' => 'candidate']))->postJson('/api/jobs/'.$expired->id.'/apply')->assertNotFound();
    }

    public function test_editing_requires_review_and_deleting_retains_application_history(): void
    {
        [, $employer, $candidate] = $this->team();
        $job = $this->job($employer);
        $application = JobApplication::create(['job_post_id' => $job->id, 'candidate_id' => $candidate->id]);
        $this->actingAs($employer)->putJson('/api/employer/jobs/'.$job->id, [...$this->jobData(), 'status' => 'pending'])->assertOk()->assertJsonPath('data.status', 'pending');
        $this->getJson('/api/jobs/'.$job->slug)->assertNotFound();
        $this->deleteJson('/api/employer/jobs/'.$job->id)->assertNoContent();
        $this->actingAs($candidate)->getJson('/api/workspace/applications/'.$application->id)->assertOk()->assertJsonPath('data.job.title', $job->title);
    }

    public function test_screening_answers_and_profile_fields_are_validated(): void
    {
        [, $employer, $candidate] = $this->team();
        $job = $this->job($employer, ['screening_questions' => ['Why this team?']]);
        $this->actingAs($candidate)->postJson('/api/jobs/'.$job->id.'/apply')->assertUnprocessable();
        $this->postJson('/api/jobs/'.$job->id.'/apply', ['answers' => ['Because of your work.']])->assertCreated();
        $this->putJson('/api/workspace/profile', ['name' => 'Updated', 'role' => 'admin', 'portfolio' => 'javascript:alert(1)'])->assertUnprocessable();
        $this->putJson('/api/workspace/profile', ['name' => 'Updated', 'role' => 'admin', 'skills' => ['React']])->assertOk();
        $this->assertDatabaseHas('users', ['id' => $candidate->id, 'role' => 'candidate']);
    }

    public function test_cookie_login_persists_without_issuing_browser_tokens(): void
    {
        $user = User::factory()->create(['password' => 'TestPassword123!', 'role' => 'candidate']);
        $this->withHeader('Origin', 'http://localhost:5173')->postJson('/api/auth/login', ['email' => $user->email, 'password' => 'TestPassword123!'])->assertOk()->assertJsonMissingPath('token');
        $this->getJson('/api/auth/me')->assertOk()->assertJsonPath('user.id', $user->id);
        $this->postJson('/api/auth/logout')->assertNoContent();
        $this->assertDatabaseCount('personal_access_tokens', 0);
    }
}
