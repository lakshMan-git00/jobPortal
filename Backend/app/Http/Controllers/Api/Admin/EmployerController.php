<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class EmployerController extends Controller
{
    public function index()
    {
        return response()->json([
            'data' => User::query()->with('company')->where('role', 'employer')->latest()->get()->map(fn (User $user) => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'company' => $user->company?->name,
                'company_id' => $user->company_id,
            ]),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email:rfc,dns', 'max:255', 'unique:users,email'],
            'password' => ['required', 'confirmed', Password::min(12)->mixedCase()->numbers()],
            'company_id' => ['required', 'integer', Rule::exists(Company::class, 'id')],
        ]);

        $employer = User::create([
            'name' => $data['name'],
            'email' => strtolower($data['email']),
            'password' => $data['password'],
            'role' => 'employer',
            'company_id' => $data['company_id'],
            'email_verified_at' => null,
        ]);

        return response()->json(['data' => [
            'id' => $employer->id,
            'name' => $employer->name,
            'email' => $employer->email,
            'role' => $employer->role,
            'company_id' => $employer->company_id,
        ]], 201);
    }
}
