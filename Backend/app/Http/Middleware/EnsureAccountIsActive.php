<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class EnsureAccountIsActive
{
    public function handle(Request $request, Closure $next)
    {
        if (! $request->user()?->is_active) {
            $request->user()?->tokens()->delete();

            return response()->json(['message' => 'Your account is suspended. Contact your administrator.'], 401);
        }

        return $next($request);
    }
}
