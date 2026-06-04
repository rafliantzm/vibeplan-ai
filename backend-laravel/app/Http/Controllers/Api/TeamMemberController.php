<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TeamMember;
use App\Support\DatabaseErrorResponder;
use Illuminate\Http\JsonResponse;
use Throwable;

class TeamMemberController extends Controller
{
    public function index(): JsonResponse
    {
        if (! extension_loaded('mongodb')) {
            return DatabaseErrorResponder::extensionMissing('team member endpoint');
        }

        try {
            $members = TeamMember::query()->orderBy('name')->get();

            return response()->json([
                'data' => $members,
            ]);
        } catch (Throwable $exception) {
            report($exception);

            return DatabaseErrorResponder::isMongoConnectivityError($exception)
                ? DatabaseErrorResponder::mongoUnavailable($exception, 'Database sedang tidak dapat diakses saat memuat data tim.')
                : response()->json([
                    'success' => false,
                    'message' => 'Failed to fetch team members.',
                ], 500);
        }
    }
}
