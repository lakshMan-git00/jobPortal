<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->json('profile')->nullable();
        });
        Schema::table('job_posts', function (Blueprint $table) {
            $table->string('category')->nullable()->index();
            $table->string('experience_level')->nullable();
            $table->json('screening_questions')->nullable();
            $table->text('moderation_note')->nullable();
            $table->softDeletes();
        });
        Schema::create('resumes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('path');
            $table->string('mime');
            $table->unsignedBigInteger('size');
            $table->boolean('is_default')->default(false);
            $table->timestamps();
        });
        Schema::create('saved_jobs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('job_post_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['user_id', 'job_post_id']);
        });
        Schema::table('job_applications', function (Blueprint $table) {
            $table->foreignId('resume_id')->nullable()->constrained()->nullOnDelete();
            $table->json('answers')->nullable();
            $table->json('history')->nullable();
        });
        Schema::create('interviews', function (Blueprint $table) {
            $table->id();
            $table->foreignId('job_application_id')->constrained()->cascadeOnDelete();
            $table->timestamp('starts_at');
            $table->unsignedInteger('duration_minutes')->default(30);
            $table->string('location');
            $table->text('notes')->nullable();
            $table->string('status')->default('scheduled');
            $table->timestamps();
        });
        Schema::create('portal_notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->string('href');
            $table->timestamp('read_at')->nullable();
            $table->timestamps();
        });
        Schema::create('application_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('job_application_id')->constrained()->cascadeOnDelete();
            $table->foreignId('sender_id')->constrained('users')->cascadeOnDelete();
            $table->text('body');
            $table->timestamp('read_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('application_messages');
        Schema::dropIfExists('portal_notifications');
        Schema::dropIfExists('interviews');
        Schema::table('job_applications', function (Blueprint $table) {
            $table->dropConstrainedForeignId('resume_id');
            $table->dropColumn(['answers', 'history']);
        });
        Schema::dropIfExists('saved_jobs');
        Schema::dropIfExists('resumes');
        Schema::table('job_posts', fn (Blueprint $table) => $table->dropColumn(['category', 'experience_level', 'screening_questions', 'moderation_note', 'deleted_at']));
        Schema::table('users', fn (Blueprint $table) => $table->dropColumn('profile'));
    }
};
