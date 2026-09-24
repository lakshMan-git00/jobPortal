<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\{JobApplication, JobPost, PortalNotification, Resume};
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class JobController extends Controller
{
    public function index(Request $request)
    {
        $data = $request->validate([
            'keyword' => ['nullable', 'string', 'max:100'],
            'location' => ['nullable', 'string', 'max:100'],
            'workplace_type' => ['nullable', Rule::in(['Remote', 'Hybrid', 'On-site'])],
            'employment_type' => ['nullable', Rule::in(['Full-time', 'Part-time', 'Contract', 'Internship'])],
            'category' => ['nullable', 'string', 'max:100'],
            'experience_level' => ['nullable', 'string', 'max:60'],
            'posted_days' => ['nullable', 'integer', 'min:1', 'max:365'],
            'sort' => ['nullable', Rule::in(['newest', 'oldest'])],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);
        $query = JobPost::with('company')->open()
            ->when($data['keyword'] ?? null, function ($query, $keyword) {
                $query->where(function ($inner) use ($keyword) {
                    $like = '%'.strtolower($keyword).'%';
                    $inner->whereRaw('LOWER(title) LIKE ?', [$like])
                        ->orWhereRaw('LOWER(description) LIKE ?', [$like])
                        ->orWhereRaw('LOWER(CAST(skills AS TEXT)) LIKE ?', [$like])
                        ->orWhereHas('company', fn ($company) => $company->whereRaw('LOWER(name) LIKE ?', [$like]));
                });
            })
            ->when($data['location'] ?? null, fn ($q, $v) => $q->whereRaw('LOWER(location) LIKE ?', ['%'.strtolower($v).'%']));
        foreach (['workplace_type', 'employment_type', 'category', 'experience_level'] as $field) {
            $query->when($data[$field] ?? null, fn ($q, $v) => $q->where($field, $v));
        }
        $query->when($data['posted_days'] ?? null, fn ($q, $v) => $q->where('published_at', '>=', now()->subDays($v)));
        $jobs = $query->orderBy('published_at', ($data['sort'] ?? '') === 'oldest' ? 'asc' : 'desc')->orderByDesc('id')->paginate(12);
        return response()->json(['data' => $jobs->getCollection()->map(fn ($job) => $this->job($job)), 'meta' => [
            'total' => $jobs->total(), 'current_page' => $jobs->currentPage(), 'last_page' => $jobs->lastPage(), 'per_page' => $jobs->perPage(),
        ]]);
    }

    public function show(string $slug)
    {
        return response()->json(['data' => $this->job(JobPost::with('company')->open()->where('slug', $slug)->firstOrFail())]);
    }

    public function managed(Request $request)
    {
        $query = JobPost::with('company')->withCount('applications');
        if ($request->user()->role !== 'admin') {
            $query->where('created_by', $request->user()->id)->where('company_id', $request->user()->company_id);
        }
        $jobs = $query->latest()->paginate(20);
        return response()->json(['data' => $jobs->getCollection()->map(fn ($job) => $this->job($job)), 'meta' => [
            'total' => $jobs->total(), 'current_page' => $jobs->currentPage(), 'last_page' => $jobs->lastPage(),
        ]]);
    }

    public function store(Request $request)
    {
        $user = $request->user();
        abort_unless($user->company_id, 422, 'Your employer account is not assigned to a company.');
        $data = $request->validate($this->rules());
        $data['slug'] = (Str::slug($data['title']) ?: 'job').'-'.Str::lower(Str::random(8));
        $data['company_id'] = $user->company_id;
        $data['created_by'] = $user->id;
        $data['status'] = $data['status'] ?? 'pending';
        $data['description'] = strip_tags($data['description']);
        return response()->json(['data' => $this->job(JobPost::create($data)->load('company'))], 201);
    }

    public function managedShow(Request $request, JobPost $job)
    {
        $this->owns($request, $job);
        return response()->json(['data' => $this->job($job->load('company'))]);
    }

    public function update(Request $request, JobPost $job)
    {
        $this->owns($request, $job);
        $data = $request->validate($this->rules());
        $data['description'] = strip_tags($data['description']);
        // Editing an approved post always requires a new review.
        $data['status'] = $data['status'] ?? 'draft';
        $data['moderation_note'] = null;
        $job->update($data);
        return response()->json(['data' => $this->job($job->load('company'))]);
    }

    public function status(Request $request, JobPost $job)
    {
        if ($request->user()->role !== 'admin') $this->owns($request, $job);
        $admin = $request->user()->role === 'admin';
        $data = $request->validate([
            'status' => ['required', Rule::in($admin ? ['published', 'rejected', 'paused', 'closed'] : ['draft', 'pending', 'paused', 'closed'])],
            'moderation_note' => ['nullable', 'string', 'max:2000'],
        ]);
        if (!$admin && $job->status === 'rejected') abort(422, 'Edit this job before resubmitting it for review.');
        $data['published_at'] = $data['status'] === 'published' ? now() : $job->published_at;
        if (!$admin) unset($data['moderation_note']);
        $job->update($data);
        if ($admin) PortalNotification::send($job->created_by, 'Your job “'.$job->title.'” is '.$job->status.'.', '/employer/jobs');
        return response()->json(['data' => $this->job($job->load('company'))]);
    }

    public function destroy(Request $request, JobPost $job)
    {
        $this->owns($request, $job);
        $job->delete();
        return response()->noContent();
    }

    public function duplicate(Request $request, JobPost $job)
    {
        $this->owns($request, $job);
        $copy = $job->replicate(['published_at', 'moderation_note', 'closes_at']);
        $copy->title .= ' (copy)';
        $copy->slug = Str::slug($copy->title).'-'.Str::lower(Str::random(8));
        $copy->status = 'draft';
        $copy->save();
        return response()->json(['data' => $this->job($copy->load('company'))], 201);
    }

    public function apply(Request $request, JobPost $job)
    {
        abort_unless(JobPost::open()->whereKey($job->id)->exists(), 404);
        $data = $request->validate([
            'cover_letter' => ['nullable', 'string', 'max:5000'],
            'resume_id' => ['nullable', 'integer', Rule::exists('resumes', 'id')->where('user_id', $request->user()->id)],
            'answers' => ['nullable', 'array', 'max:20'],
            'answers.*' => ['required', 'string', 'max:2000'],
        ]);
        if (count($job->screening_questions ?? []) !== count($data['answers'] ?? [])) {
            return response()->json(['message' => 'Please answer all screening questions.'], 422);
        }
        return DB::transaction(function () use ($request, $job, $data) {
            $application = JobApplication::firstOrCreate(
                ['job_post_id' => $job->id, 'candidate_id' => $request->user()->id],
                [...$data, 'status' => 'submitted', 'history' => [['status' => 'submitted', 'at' => now()->toISOString()]]],
            );
            if (!$application->wasRecentlyCreated) return response()->json(['message' => 'You have already applied for this role.'], 409);
            PortalNotification::send($job->created_by, 'New application for '.$job->title, '/employer/applications/'.$application->id);
            return response()->json(['data' => $application], 201);
        });
    }

    private function owns(Request $request, JobPost $job): void
    {
        abort_unless($job->created_by === $request->user()->id && $job->company_id === $request->user()->company_id, 403);
    }

    private function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:160'], 'location' => ['required', 'string', 'max:160'],
            'workplace_type' => ['required', Rule::in(['Remote', 'Hybrid', 'On-site'])],
            'employment_type' => ['required', Rule::in(['Full-time', 'Part-time', 'Contract', 'Internship'])],
            'salary_range' => ['nullable', 'string', 'max:100'], 'description' => ['required', 'string', 'max:20000'],
            'skills' => ['nullable', 'array', 'max:20'], 'skills.*' => ['string', 'max:60'],
            'closes_at' => ['nullable', 'date', 'after:today'],
            'category' => ['nullable', 'string', 'max:100'], 'experience_level' => ['nullable', 'string', 'max:60'],
            'screening_questions' => ['nullable', 'array', 'max:20'], 'screening_questions.*' => ['required', 'string', 'max:300'],
            'status' => ['sometimes', Rule::in(['draft', 'pending'])],
        ];
    }

    public function job(JobPost $job): array
    {
        return [
            'id' => $job->id, 'slug' => $job->slug, 'title' => $job->title, 'company' => $job->company->name,
            'company_slug' => $job->company->slug, 'location' => $job->location, 'mode' => $job->workplace_type,
            'type' => $job->employment_type, 'salary' => $job->salary_range,
            'posted' => $job->published_at?->diffForHumans() ?? $job->created_at->diffForHumans(),
            'published_at' => $job->published_at, 'closes_at' => $job->closes_at,
            'skills' => $job->skills ?? [], 'description' => $job->description,
            'company_description' => $job->company->description, 'status' => $job->status,
            'category' => $job->category, 'experience_level' => $job->experience_level,
            'screening_questions' => $job->screening_questions ?? [], 'moderation_note' => $job->moderation_note,
            'applications_count' => $job->applications_count ?? 0,
        ];
    }
}
