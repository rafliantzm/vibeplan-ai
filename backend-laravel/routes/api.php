<?php

use App\Http\Controllers\Api\GenerateController;
use App\Http\Controllers\Api\GoogleAuthController;
use App\Http\Controllers\Api\HistoryController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\AuthPasswordResetController;
use App\Http\Controllers\Api\AdminAiSettingsController;
use App\Http\Controllers\Api\AdminSupportMessageController;
use App\Http\Controllers\Api\SupportChatController;
use App\Http\Controllers\Api\AdminUserController;
use App\Http\Controllers\Api\AdminTokenResetRequestController;
use App\Http\Controllers\Api\AiHealthController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\DatabaseHealthController;
use App\Http\Controllers\Api\TeamMemberController;
use App\Http\Controllers\Api\TokenResetRequestController;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function (): void {
    Route::get('/google/redirect', [GoogleAuthController::class, 'redirect']);
    Route::get('/google/callback', [GoogleAuthController::class, 'callback']);
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/forgot-password', [AuthPasswordResetController::class, 'forgotPassword']);
    Route::post('/reset-password', [AuthPasswordResetController::class, 'resetPassword']);

    Route::middleware('auth.token')->group(function (): void {
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/logout', [AuthController::class, 'logout']);
    });
});

Route::get('/team-members', [TeamMemberController::class, 'index']);
Route::get('/health/database', [DatabaseHealthController::class, 'show']);
Route::get('/health/ai', [AiHealthController::class, 'show']);
Route::post('/support/messages', [AdminSupportMessageController::class, 'store']);
Route::post('/support/conversations', [SupportChatController::class, 'storeConversation']);
Route::get('/support/conversations/{id}/messages', [SupportChatController::class, 'getConversationMessages']);
Route::post('/support/conversations/{id}/messages', [SupportChatController::class, 'postConversationMessage']);

Route::middleware('auth.token')->group(function (): void {
    Route::prefix('generate')->group(function (): void {
        Route::post('/prd', [GenerateController::class, 'generatePrd']);
        Route::post('/next-step', [GenerateController::class, 'generateNextStep']);
        Route::post('/coding-prompt', [GenerateController::class, 'generateCodingPrompt']);
    });

    Route::get('/history', [HistoryController::class, 'index']);
    Route::get('/history/{id}', [HistoryController::class, 'show']);
    Route::get('/download/{id}', [HistoryController::class, 'download']);
    Route::delete('/history/{id}', [HistoryController::class, 'destroy']);
    Route::get('/profile', [ProfileController::class, 'show']);
    Route::patch('/profile', [ProfileController::class, 'update']);
    Route::patch('/profile/display-name', [ProfileController::class, 'updateName']);
    Route::patch('/profile/password', [ProfileController::class, 'updatePassword']);
    Route::post('/profile/avatar', [ProfileController::class, 'updateAvatar']);

    Route::post('/token-reset-requests', [TokenResetRequestController::class, 'store']);
    Route::get('/token-reset-requests/my', [TokenResetRequestController::class, 'mine']);

    Route::prefix('admin')->middleware('admin')->group(function (): void {
        Route::get('/token-reset-requests', [AdminTokenResetRequestController::class, 'index']);
        Route::patch('/token-reset-requests/{id}', [AdminTokenResetRequestController::class, 'update']);
        Route::get('/ai-settings', [AdminAiSettingsController::class, 'show']);
        Route::get('/ai-settings/diagnostics', [AdminAiSettingsController::class, 'diagnostics']);
        Route::get('/ai-settings/models', [AdminAiSettingsController::class, 'availableModels']);
        Route::post('/ai-settings/validate-key', [AdminAiSettingsController::class, 'validateKey']);
        Route::post('/ai-settings/update-key', [AdminAiSettingsController::class, 'updateKey']);
        Route::get('/support/messages', [AdminSupportMessageController::class, 'index']);
        Route::get('/support/messages/{id}', [AdminSupportMessageController::class, 'show']);
        Route::patch('/support/messages/{id}/reply', [AdminSupportMessageController::class, 'reply']);
        Route::patch('/support/messages/{id}/close', [AdminSupportMessageController::class, 'close']);
        Route::get('/support/conversations', [SupportChatController::class, 'adminIndex']);
        Route::get('/support/conversations/{id}', [SupportChatController::class, 'adminShow']);
        Route::post('/support/conversations/{id}/messages', [SupportChatController::class, 'adminPostMessage']);
        Route::delete('/support/conversations/{id}', [SupportChatController::class, 'adminDestroy']);
        Route::delete('/support/conversations/{id}/messages/{messageId}', [SupportChatController::class, 'adminDestroyMessage']);
        Route::patch('/support/conversations/{id}/close', [SupportChatController::class, 'adminClose']);
        Route::patch('/support/conversations/{id}/reopen', [SupportChatController::class, 'adminReopen']);
        Route::get('/users', [AdminUserController::class, 'index']);
        Route::get('/users/{id}', [AdminUserController::class, 'show']);
        Route::patch('/users/{id}', [AdminUserController::class, 'update']);
        Route::patch('/users/{id}/password', [AdminUserController::class, 'resetPassword']);
        Route::patch('/users/{id}/tokens', [AdminUserController::class, 'updateTokens']);
        Route::get('/users/{id}/logs', [AdminUserController::class, 'logs']);
    });
});
