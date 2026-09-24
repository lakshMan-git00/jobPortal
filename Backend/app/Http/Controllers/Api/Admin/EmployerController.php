<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class EmployerController extends Controller
{
    public function index()
    {
        return response()->json([
            'data' => User::query()->with('company')->where('role', 'employer')->latest()->get()->map(fn (User $user) => $this->resource($user)),
        ]);
    }

    public function store(Request $request)
    {
        $this->normalizeEmail($request);
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email:rfc', 'max:255', 'unique:users,email'],
            'password' => ['required', 'confirmed', Password::min(12)->mixedCase()->numbers()],
            'company_id' => ['required', 'integer', Rule::exists(Company::class, 'id')],
        ]);

        $employer = User::create([
            'name' => $data['name'],
            'email' => strtolower($data['email']),
            'password' => $data['password'],
            'role' => 'employer',
            'company_id' => $data['company_id'],
        ]);

        return response()->json(['data' => $this->resource($employer->refresh())], 201);
    }

    public function update(Request $request, User $employer)
    {
        abort_unless($employer->role === 'employer', 404);
        $this->normalizeEmail($request);
        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:120'],
            'email' => ['sometimes', 'required', 'email:rfc', 'max:255', Rule::unique('users', 'email')->ignore($employer->id)],
            'company_id' => ['sometimes', 'required', 'integer', Rule::exists(Company::class, 'id')],
            'is_active' => ['sometimes', 'required', 'boolean'],
            'password' => ['sometimes', 'required', 'confirmed', Password::min(12)->mixedCase()->numbers()],
        ]);

        return DB::transaction(function () use ($employer, $data) {
            $employer = User::whereKey($employer->id)->lockForUpdate()->firstOrFail();
            abort_unless($employer->role === 'employer', 404);
            $employer->fill($data);
            $revokeTokens = $employer->isDirty(['email', 'password', 'company_id', 'is_active']);
            $employer->save();
            if ($revokeTokens) {
                $employer->tokens()->delete();
                DB::table('sessions')->where('user_id', $employer->id)->delete();
            }

            return response()->json(['data' => $this->resource($employer)]);
        });
    }

    public function destroy(User $employer)
    {
        abort_unless($employer->role === 'employer', 404);
        DB::transaction(function () use ($employer) {
            $employer = User::whereKey($employer->id)->lockForUpdate()->firstOrFail();
            abort_unless($employer->role === 'employer', 404);
            $employer->tokens()->delete();
            DB::table('sessions')->where('user_id', $employer->id)->delete();
            // Keep posted jobs and candidate applications intact for the company.
            $employer->delete();
        });

        return response()->noContent();
    }

    private function resource(User $employer): array
    {
        return [
            'id' => $employer->id,
            'name' => $employer->name,
            'email' => $employer->email,
            'role' => $employer->role,
            'company_id' => $employer->company_id,
            'company' => $employer->company?->name,
            'is_active' => $employer->is_active,
        ];
    }

    private function normalizeEmail(Request $request): void
    {
        if (is_string($request->input('email'))) {
            $request->merge(['email' => strtolower(trim($request->input('email')))]);
        }
    }
}
