<?php

use App\Http\Controllers\Api\Admin\CompanyController;
use App\Http\Controllers\Api\Admin\EmployerController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\JobController;
use Illuminate\Support\Facades\Route;

Route::get('/jobs', [JobController::class, 'index']);
Route::get('/jobs/{slug}', [JobController::class, 'show']);

Route::middleware('throttle:5,1')->group(function () {
    Route::post('/auth/register', [AuthController::class, 'register']);
    Route::post('/auth/login', [AuthController::class, 'login']);
});

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::post('/jobs/{job}/apply', [JobController::class, 'apply'])->middleware('role:candidate');
    Route::post('/employer/jobs', [JobController::class, 'store'])->middleware('role:employer');

    Route::prefix('admin')->middleware('role:admin')->group(function () {
        Route::get('/companies', [CompanyController::class, 'index']);
        Route::post('/companies', [CompanyController::class, 'store'])->middleware('throttle:20,1');
        Route::get('/employers', [EmployerController::class, 'index']);
        Route::post('/employers', [EmployerController::class, 'store'])->middleware('throttle:10,1');
    });
});
