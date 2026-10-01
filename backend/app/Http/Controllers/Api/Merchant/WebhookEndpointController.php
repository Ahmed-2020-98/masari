<?php

namespace App\Http\Controllers\Api\Merchant;

use App\Http\Controllers\Concerns\InteractsWithMerchant;
use App\Http\Controllers\Controller;
use App\Http\Resources\WebhookEndpointResource;
use App\Models\WebhookEndpoint;
use App\Services\Webhooks\WebhookDispatcher;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class WebhookEndpointController extends Controller
{
    use InteractsWithMerchant;

    /**
     * Registered webhook endpoints and the available events.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        return WebhookEndpointResource::collection($this->merchant($request)->webhookEndpoints()->latest('id')->get())
            ->additional(['events' => WebhookDispatcher::EVENTS]);
    }

    /**
     * Register an endpoint; the signing secret is returned once.
     */
    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request);
        $endpoint = $this->merchant($request)->webhookEndpoints()->create($data + ['secret' => Str::random(40)]);

        return WebhookEndpointResource::make($endpoint)->response()->setStatusCode(201);
    }

    /**
     * Update an endpoint.
     */
    public function update(Request $request, WebhookEndpoint $webhookEndpoint): WebhookEndpointResource
    {
        $this->ensureOwned($request, $webhookEndpoint);
        $webhookEndpoint->update($this->validated($request));

        return WebhookEndpointResource::make($webhookEndpoint);
    }

    /**
     * Delete an endpoint.
     */
    public function destroy(Request $request, WebhookEndpoint $webhookEndpoint): JsonResponse
    {
        $this->ensureOwned($request, $webhookEndpoint);
        $webhookEndpoint->delete();

        return response()->json(['message' => 'تم الحذف.']);
    }

    /**
     * Recent deliveries for debugging.
     */
    public function deliveries(Request $request, WebhookEndpoint $webhookEndpoint): JsonResponse
    {
        $this->ensureOwned($request, $webhookEndpoint);

        return response()->json(['data' => $webhookEndpoint->deliveries()->latest('id')->limit(50)->get(['id', 'event', 'response_status', 'attempts', 'delivered_at', 'created_at'])]);
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(Request $request): array
    {
        return $request->validate([
            'url' => ['required', 'url:https', 'max:255'],
            'events' => ['required', 'array', 'min:1'],
            'events.*' => [Rule::in([...WebhookDispatcher::EVENTS, '*'])],
            'is_active' => ['boolean'],
        ]);
    }
}
