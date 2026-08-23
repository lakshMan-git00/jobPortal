<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\JobApplication;
use App\Models\JobPost;
use Illuminate\Http\Request;
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
        ]);

        $jobs = JobPost::query()->with('company')->where('status', 'published')
            ->when($data['keyword'] ?? null, function ($query, $keyword) {
                $query->where(function ($inner) use ($keyword) {
                    $like = '%'.strtolower($keyword).'%';
                    $inner->whereRaw('LOWER(title) LIKE ?', [$like])
                        ->orWhereRaw('LOWER(description) LIKE ?', [$like])
                        ->orWhereHas('company', fn ($company) => $company->whereRaw('LOWER(name) LIKE ?', [$like]));
                });
            })
            ->when($data['location'] ?? null, fn ($query, $location) => $query->whereRaw('LOWER(location) LIKE ?', ['%'.strtolower($location).'%']))
            ->when($data['workplace_type'] ?? null, fn ($query, $type) => $query->where('workplace_type', $type))
            ->latest('published_at')->paginate(20);

        return response()->json([
            'data' => $jobs->getCollection()->map(fn (JobPost $job) => $this->job($job)),
            'meta' => ['total' => $jobs->total()],
        ]);
    }

    public function show(string $slug)
    {
        $job = JobPost::with('company')->where('slug', $slug)->where('status', 'published')->firstOrFail();

        return response()->json(['data' => $this->job($job, true)]);
    }

    public function store(Request $request)
    {
        $user = $request->user();
        abort_unless($user->company_id, 422, 'Your employer account is not assigned to a company.');

        $data = $request->validate($this->rules());
        $data['slug'] = $this->uniqueSlug($data['title']);
        $data['company_id'] = $user->company_id;
        $data['created_by'] = $user->id;
        $data['status'] = 'published';
        $data['published_at'] = now();

        $job = JobPost::create($data)->load('company');

        return response()->json(['data' => $this->job($job, true)], 201);
    }

    public function apply(Request $request, JobPost $job)
    {
        abort_if($job->status !== 'published', 404);
        $data = $request->validate(['cover_letter' => ['nullable', 'string', 'max:5000']]);

        $application = JobApplication::firstOrCreate(
            ['job_post_id' => $job->id, 'candidate_id' => $request->user()->id],
            ['cover_letter' => $data['cover_letter'] ?? null],
        );

        if (! $application->wasRecentlyCreated) {
            return response()->json(['message' => 'You have already applied for this role.'], 409);
        }

        return response()->json(['data' => ['id' => $application->id, 'status' => $application->status]], 201);
    }

    private function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:160'],
            'location' => ['required', 'string', 'max:160'],
            'workplace_type' => ['required', Rule::in(['Remote', 'Hybrid', 'On-site'])],
            'employment_type' => ['required', Rule::in(['Full-time', 'Part-time', 'Contract', 'Internship'])],
            'salary_range' => ['nullable', 'string', 'max:100'],
            'description' => ['required', 'string', 'max:20000'],
            'skills' => ['nullable', 'array', 'max:20'],
            'skills.*' => ['string', 'max:60'],
            'closes_at' => ['nullable', 'date', 'after:today'],
        ];
    }

    private function uniqueSlug(string $title): string
    {
        $base = Str::slug($title) ?: 'job';
        $slug = $base;
        $suffix = 2;
        while (JobPost::where('slug', $slug)->exists()) {
            $slug = "{$base}-{$suffix}";
            $suffix++;
        }

        return $slug;
    }

    private function job(JobPost $job, bool $detail = false): array
    {
        return [
            'id' => $job->id,
            'slug' => $job->slug,
            'title' => $job->title,
            'company' => $job->company->name,
            'location' => $job->location,
            'mode' => $job->workplace_type,
            'type' => $job->employment_type,
            'salary' => $job->salary_range,
            'posted' => $job->published_at?->diffForHumans() ?? $job->created_at->diffForHumans(),
            'skills' => $job->skills ?? [],
            'description' => $job->description,
            'company_description' => $job->company->description,
        ];
    }
}
