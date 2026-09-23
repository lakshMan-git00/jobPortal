<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $this->normalizeEmail($request);
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email:rfc', 'max:255', 'unique:users,email'],
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
        $this->normalizeEmail($request);
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        return DB::transaction(function () use ($credentials) {
            $user = User::whereRaw('LOWER(email) = ?', [$credentials['email']])->lockForUpdate()->first();
            if (! $user || ! Hash::check($credentials['password'], $user->password)) {
                return response()->json(['message' => 'The provided credentials are incorrect.'], 422);
            }

            if (! $user->is_active) {
                return response()->json(['message' => 'Your account is suspended. Contact your administrator.'], 403);
            }

            return response()->json($this->authenticated($user));
        });
    }

    public function me(Request $request)
    {
        return response()->json(['user' => $this->user($request->user())]);
    }

    public function logout(Request $request)
    {
        $token = $request->user()->currentAccessToken();
        if ($token instanceof \Laravel\Sanctum\PersonalAccessToken) $token->delete();
        if ($request->hasSession()) {
            auth('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

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

    public function forgotPassword(Request $request)
    {
        $this->normalizeEmail($request);
        $data = $request->validate(['email' => ['required', 'email']]);
        \Illuminate\Support\Facades\Password::sendResetLink($data);
        return response()->json(['message' => 'If this account exists, a password reset link has been requested.']);
    }

    public function resetPassword(Request $request)
    {
        $data = $request->validate(['email' => ['required', 'email'], 'token' => ['required', 'string'], 'password' => ['required', 'confirmed', Password::min(12)->mixedCase()->numbers()]]);
        $status = \Illuminate\Support\Facades\Password::reset($data, function (User $user, string $password) {
            $user->forceFill(['password' => $password, 'remember_token' => \Illuminate\Support\Str::random(60)])->save();
            $user->tokens()->delete();
            DB::table('sessions')->where('user_id', $user->id)->delete();
            event(new \Illuminate\Auth\Events\PasswordReset($user));
        });
        return $status === \Illuminate\Support\Facades\Password::PASSWORD_RESET ? response()->json(['message' => 'Password reset.']) : response()->json(['message' => 'This reset link is invalid or expired. Request another link.'], 422);
    }

    private function normalizeEmail(Request $request): void
    {
        if (is_string($request->input('email'))) {
            $request->merge(['email' => strtolower(trim($request->input('email')))]);
        }
    }

    private function authenticated(User $user): array
    {
        if (request()->hasSession()) {
            auth('web')->login($user);
            request()->session()->regenerate();
            return ['user' => $this->user($user)];
        }
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
