<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email:rfc,dns', 'max:255', 'unique:users,email'],
            'password' => ['required', 'confirmed', Password::min(12)->mixedCase()->numbers()],
        ]);

        $user = User::create([
            'name' => $data['name'],
            'email' => strtolower($data['email']),
            'password' => $data['password'],
            'role' => 'candidate',
        ]);

        return response()->json($this->authenticated($user), 201);
    }

    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('email', strtolower($credentials['email']))->first();
        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            return response()->json(['message' => 'The provided credentials are incorrect.'], 422);
        }

        return response()->json($this->authenticated($user));
    }

    public function me(Request $request)
    {
        return response()->json(['user' => $this->user($request->user())]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()?->delete();

        return response()->noContent();
    }

    private function user(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'company_id' => $user->company_id,
        ];
    }

    private function authenticated(User $user): array
    {
        $token = $user->createToken('eyros-web', $this->abilities($user))->plainTextToken;

        return ['user' => $this->user($user), 'token' => $token];
    }

    private function abilities(User $user): array
    {
        return match ($user->role) {
            'admin' => ['admin:manage'],
            'employer' => ['jobs:write'],
            default => ['jobs:apply'],
        };
    }
}
