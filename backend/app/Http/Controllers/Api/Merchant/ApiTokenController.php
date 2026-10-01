<?php

namespace App\Http\Controllers\Api\Merchant;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;

class ApiTokenController extends Controller
{
    /**
     * API keys for server-to-server integrations (tokens with the `api` ability).
     */
    public function index(Request $request): JsonResponse
    {
        return response()->json([
            'data' => $request->user()->tokens()->whereJsonContains('abilities', 'api')->latest('id')->get()
                ->map(fn (PersonalAccessToken $token) => [
                    'id' => $token->id,
                    'name' => $token->name,
                    'last_used_at' => $token->last_used_at?->toIso8601String(),
                    'created_at' => $token->created_at->toIso8601String(),
                ]),
        ]);
    }

    /**
     * Create an API key. The plain token is returned once.
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate(['name' => ['required', 'string', 'max:60']]);
        $token = $request->user()->createToken($data['name'], ['api', 'merchant']);

        return response()->json([
            'id' => $token->accessToken->id,
            'name' => $data['name'],
            'token' => $token->plainTextToken,
        ], 201);
    }

    /**
     * Revoke an API key.
     */
    public function destroy(Request $request, int $token): JsonResponse
    {
        $request->user()->tokens()->whereKey($token)->whereJsonContains('abilities', 'api')->delete();

        return response()->json(['message' => 'تم حذف المفتاح.']);
    }
}
