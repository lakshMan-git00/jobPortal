<?php

use App\Http\Controllers\Api\Admin\CompanyController;
use App\Http\Controllers\Api\Admin\EmployerController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\JobController;
use App\Http\Controllers\Api\WorkspaceController;
use Illuminate\Support\Facades\Route;

Route::get('/jobs', [JobController::class, 'index']);
Route::get('/jobs/{slug}', [JobController::class, 'show']);
Route::get('/companies', [WorkspaceController::class, 'companies']);
Route::get('/companies/{slug}', [WorkspaceController::class, 'companies']);

Route::middleware('throttle:5,1')->group(function () {
    Route::post('/auth/register', [AuthController::class, 'register']);
    Route::post('/auth/login', [AuthController::class, 'login']);
    Route::post('/auth/forgot-password', [AuthController::class, 'forgotPassword']);
    Route::post('/auth/reset-password', [AuthController::class, 'resetPassword']);
});

Route::middleware(['auth:sanctum', 'active'])->group(function () {
    Route::get('/workspace/dashboard', [WorkspaceController::class, 'dashboard']);
    Route::get('/workspace/profile', [WorkspaceController::class, 'profile']);
    Route::put('/workspace/profile', [WorkspaceController::class, 'updateProfile']);
    Route::put('/workspace/password', [WorkspaceController::class, 'password'])->middleware('throttle:5,1');
    Route::get('/workspace/applications', [WorkspaceController::class, 'applications']);
    Route::get('/workspace/applications/{id}', [WorkspaceController::class, 'applicationDetail']);
    Route::patch('/workspace/applications/{id}/status', [WorkspaceController::class, 'applicationStatus']);
    Route::get('/workspace/applications/{id}/messages', [WorkspaceController::class, 'messages']);
    Route::post('/workspace/applications/{id}/messages', [WorkspaceController::class, 'sendMessage'])->middleware('throttle:30,1');
    Route::get('/workspace/interviews', [WorkspaceController::class, 'interviews']);
    Route::get('/workspace/notifications', [WorkspaceController::class, 'notifications']);
    Route::patch('/workspace/notifications', [WorkspaceController::class, 'readNotifications']);
    Route::delete('/workspace/notifications/{id}', [WorkspaceController::class, 'deleteNotification']);
    Route::get('/workspace/resumes/{resume}/download', [WorkspaceController::class, 'downloadResume']);
    Route::prefix('candidate')->middleware('role:candidate')->group(function () {
        Route::get('/jobs/{slug}/state', [WorkspaceController::class, 'jobState']);
        Route::get('/resumes', [WorkspaceController::class, 'resumes']);
        Route::post('/resumes', [WorkspaceController::class, 'uploadResume']);
        Route::patch('/resumes/{resume}', [WorkspaceController::class, 'updateResume']);
        Route::delete('/resumes/{resume}', [WorkspaceController::class, 'deleteResume']);
        Route::get('/saved-jobs', [WorkspaceController::class, 'savedJobs']);
        Route::put('/saved-jobs/{job}', [WorkspaceController::class, 'saveJob']);
        Route::delete('/saved-jobs/{job}', [WorkspaceController::class, 'unsaveJob']);
    });
    Route::prefix('employer')->middleware('role:employer')->group(function () {
        Route::get('/jobs', [JobController::class, 'managed']);
        Route::get('/jobs/{job}', [JobController::class, 'managedShow']);
        Route::put('/jobs/{job}', [JobController::class, 'update']);
        Route::patch('/jobs/{job}/status', [JobController::class, 'status']);
        Route::post('/jobs/{job}/duplicate', [JobController::class, 'duplicate']);
        Route::delete('/jobs/{job}', [JobController::class, 'destroy']);
        Route::get('/company', [WorkspaceController::class, 'company']);
        Route::put('/company', [WorkspaceController::class, 'updateCompany']);
        Route::post('/interviews', [WorkspaceController::class, 'scheduleInterview']);
        Route::patch('/interviews/{interview}', [WorkspaceController::class, 'updateInterview']);
    });
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::post('/jobs/{job}/apply', [JobController::class, 'apply'])->middleware('role:candidate');
    Route::post('/employer/jobs', [JobController::class, 'store'])->middleware('role:employer');

    Route::prefix('admin')->middleware('role:admin')->group(function () {
        Route::get('/users', [WorkspaceController::class, 'users']);
        Route::patch('/users/{user}/status', [WorkspaceController::class, 'userStatus']);
        Route::get('/jobs', [JobController::class, 'managed']);
        Route::patch('/jobs/{job}/status', [JobController::class, 'status']);
        Route::get('/companies', [CompanyController::class, 'index']);
        Route::post('/companies', [CompanyController::class, 'store'])->middleware('throttle:20,1');
        Route::get('/employers', [EmployerController::class, 'index']);
        Route::post('/employers', [EmployerController::class, 'store'])->middleware('throttle:10,1');
        Route::patch('/employers/{employer}', [EmployerController::class, 'update'])->middleware('throttle:20,1');
        Route::delete('/employers/{employer}', [EmployerController::class, 'destroy'])->middleware('throttle:20,1');
    });
});
