<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Hash;
use Laravel\Prompts\password;
use Laravel\Prompts\text;
use App\Models\User;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('app:create-admin', function () {
    $name = text('Nama admin');
    $email = strtolower(text('Email admin'));
    $password = password('Password admin');

    if (User::query()->where('email', $email)->exists()) {
        $this->error('Email admin sudah terdaftar.');
        return;
    }

    User::query()->create([
        'name' => $name,
        'email' => $email,
        'password_hash' => Hash::make($password),
        'role' => 'admin',
        'token_balance' => 100,
        'status' => 'active',
    ]);

    $this->info('Admin berhasil dibuat. Command ini hanya untuk local MVP.');
})->purpose('Create local admin user for VibePlan AI MVP');
