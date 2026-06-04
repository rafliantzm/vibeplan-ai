<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\DatabaseHealthService;
use App\Support\DatabaseErrorResponder;
use Illuminate\Http\JsonResponse;
use Throwable;

class DatabaseHealthController extends Controller
{
    public function __construct(
        private readonly DatabaseHealthService $databaseHealthService,
    ) {
    }

    public function show(): JsonResponse
    {
        try {
            $result = $this->databaseHealthService->pingMongo();

            return response()->json([
                'success' => true,
                'database' => 'mongodb',
                'message' => 'MongoDB connection is healthy',
                'meta' => $result,
            ]);
        } catch (Throwable $exception) {
            report($exception);

            return DatabaseErrorResponder::mongoUnavailable(
                $exception,
                'MongoDB connection failed'
            );
        }
    }
}
