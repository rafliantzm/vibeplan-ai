<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AiGeneration;
use App\Services\MarkdownService;
use App\Services\UserActivityLogger;
use App\Support\DatabaseErrorResponder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Throwable;

class HistoryController extends Controller
{
    public function __construct(
        private readonly MarkdownService $markdownService,
        private readonly UserActivityLogger $activityLogger,
    ) {
    }

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user) {
            return response()->json([
                'success' => false,
                'error_code' => 'AUTH_REQUIRED',
                'message' => 'Silakan login terlebih dahulu untuk menggunakan fitur generate AI.',
            ], 401);
        }

        if (! extension_loaded('mongodb')) {
            return DatabaseErrorResponder::extensionMissing('history endpoints');
        }

        $validated = $request->validate([
            'generation_type' => ['nullable', 'string'],
            'project_id' => ['nullable', 'string'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:50'],
        ]);

        try {
            $query = AiGeneration::query()->with('project')->orderByDesc('created_at');
            $query->where('user_id', (string) $user->getKey());

            if (! empty($validated['generation_type'])) {
                $query->where('generation_type', $validated['generation_type']);
            }

            if (! empty($validated['project_id'])) {
                $query->where('project_id', $validated['project_id']);
            }

            $history = $query->paginate((int) ($validated['per_page'] ?? 10));

            return response()->json($history);
        } catch (Throwable $exception) {
            report($exception);

            return DatabaseErrorResponder::isMongoConnectivityError($exception)
                ? DatabaseErrorResponder::mongoUnavailable($exception, 'Database sedang tidak dapat diakses saat memuat history.')
                : response()->json([
                    'success' => false,
                    'message' => 'Failed to fetch generation history.',
                ], 500);
        }
    }

    public function show(string $id): JsonResponse
    {
        $user = request()->user();

        if (! $user) {
            return response()->json([
                'success' => false,
                'error_code' => 'AUTH_REQUIRED',
                'message' => 'Silakan login terlebih dahulu untuk menggunakan fitur generate AI.',
            ], 401);
        }

        if (! extension_loaded('mongodb')) {
            return DatabaseErrorResponder::extensionMissing('history endpoints');
        }

        try {
            $generation = AiGeneration::query()
                ->with('project')
                ->where('user_id', (string) $user->getKey())
                ->find($id);

            if (! $generation) {
                return response()->json([
                    'message' => 'Generation history not found.',
                ], 404);
            }

            return response()->json([
                'data' => $generation,
            ]);
        } catch (Throwable $exception) {
            report($exception);

            return DatabaseErrorResponder::isMongoConnectivityError($exception)
                ? DatabaseErrorResponder::mongoUnavailable($exception, 'Database sedang tidak dapat diakses saat memuat detail history.')
                : response()->json([
                    'success' => false,
                    'message' => 'Failed to fetch generation history detail.',
                ], 500);
        }
    }

    public function download(string $id): Response|JsonResponse
    {
        $user = request()->user();

        if (! $user) {
            return response()->json([
                'success' => false,
                'error_code' => 'AUTH_REQUIRED',
                'message' => 'Silakan login terlebih dahulu untuk menggunakan fitur generate AI.',
            ], 401);
        }

        if (! extension_loaded('mongodb')) {
            return DatabaseErrorResponder::extensionMissing('download endpoint');
        }

        try {
            $generation = AiGeneration::query()
                ->where('user_id', (string) $user->getKey())
                ->find($id);

            if (! $generation) {
                return response()->json([
                    'message' => 'Generation history not found.',
                ], 404);
            }

            $this->activityLogger->log(
                request(),
                'download_markdown',
                'User mengunduh file markdown hasil generate.',
                [
                    'generation_id' => (string) $generation->getKey(),
                    'generation_type' => $generation->generation_type,
                ],
                $user,
                $user,
            );

            return response($generation->markdown_content, 200, [
                'Content-Type' => 'text/markdown; charset=UTF-8',
                'Content-Disposition' => 'attachment; filename="'.$this->markdownService->downloadFilename($generation).'"',
            ]);
        } catch (Throwable $exception) {
            report($exception);

            return DatabaseErrorResponder::isMongoConnectivityError($exception)
                ? DatabaseErrorResponder::mongoUnavailable($exception, 'Database sedang tidak dapat diakses saat menyiapkan file Markdown.')
                : response()->json([
                    'success' => false,
                    'message' => 'Failed to download markdown file.',
                ], 500);
        }
    }

    public function destroy(string $id): JsonResponse
    {
        $user = request()->user();

        if (! $user) {
            return response()->json([
                'success' => false,
                'error_code' => 'AUTH_REQUIRED',
                'message' => 'Silakan login terlebih dahulu untuk menggunakan fitur generate AI.',
            ], 401);
        }

        if (! extension_loaded('mongodb')) {
            return DatabaseErrorResponder::extensionMissing('history endpoints');
        }

        try {
            $generation = AiGeneration::query()
                ->where('user_id', (string) $user->getKey())
                ->find($id);

            if (! $generation) {
                return response()->json([
                    'message' => 'Generation history not found.',
                ], 404);
            }

            $generationId = (string) $generation->getKey();
            $generationType = (string) $generation->generation_type;

            $generation->delete();

            $this->activityLogger->log(
                request(),
                'delete_history',
                'User menghapus history hasil generate.',
                [
                    'generation_id' => $generationId,
                    'generation_type' => $generationType,
                ],
                $user,
                $user,
            );

            return response()->json([
                'message' => 'Generation history deleted successfully.',
            ]);
        } catch (Throwable $exception) {
            report($exception);

            return DatabaseErrorResponder::isMongoConnectivityError($exception)
                ? DatabaseErrorResponder::mongoUnavailable($exception, 'Database sedang tidak dapat diakses saat menghapus history.')
                : response()->json([
                    'success' => false,
                    'message' => 'Failed to delete generation history.',
                ], 500);
        }
    }
}
