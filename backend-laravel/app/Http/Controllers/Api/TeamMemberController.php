<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TeamMember;
use Illuminate\Http\JsonResponse;
use Throwable;

class TeamMemberController extends Controller
{
    public function index(): JsonResponse
    {
        if (! extension_loaded('mongodb')) {
            return response()->json([
                'message' => 'MongoDB PHP extension is not installed. Install ext-mongodb before using the team member endpoint.',
            ], 500);
        }

        try {
            $members = TeamMember::query()->orderBy('name')->get();

            return response()->json([
                'data' => $members,
            ]);
        } catch (Throwable $exception) {
            report($exception);

            return response()->json([
                'message' => 'Failed to fetch team members.',
            ], 500);
        }
    }
}
