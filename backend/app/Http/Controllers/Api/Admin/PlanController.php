<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\PlanResource;
use App\Models\Plan;
use App\Support\Activity;
use App\Support\Money;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class PlanController extends Controller
{
    /**
     * Pricing plans.
     */
    public function index(): AnonymousResourceCollection
    {
        return PlanResource::collection(Plan::query()->withCount('merchants')->orderBy('sort')->get());
    }

    /**
     * Create a plan.
     */
    public function store(Request $request): JsonResponse
    {
        $plan = DB::transaction(fn () => Plan::create($this->validated($request)));
        Activity::log('admin.plan_created', $plan);

        return PlanResource::make($plan)->response()->setStatusCode(201);
    }

    /**
     * Update a plan.
     */
    public function update(Request $request, Plan $plan): PlanResource
    {
        DB::transaction(fn () => $plan->update($this->validated($request, $plan)));
        Activity::log('admin.plan_updated', $plan, $plan->getChanges());

        return PlanResource::make($plan);
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(Request $request, ?Plan $plan = null): array
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:60'],
            'slug' => ['required', 'alpha_dash', 'max:60', Rule::unique('plans', 'slug')->ignore($plan?->id)],
            'description' => ['nullable', 'string', 'max:300'],
            'markup_type' => ['required', Rule::in(['percent', 'fixed'])],
            'markup_value' => ['required', 'integer', 'min:0'],
            'cod_fee' => ['required', 'numeric', 'min:0'],
            'return_fee' => ['required', 'numeric', 'min:0'],
            'monthly_fee' => ['required', 'numeric', 'min:0'],
            'features' => ['nullable', 'array'],
            'features.*' => ['string', 'max:120'],
            'is_default' => ['boolean'],
            'is_active' => ['boolean'],
            'sort' => ['nullable', 'integer'],
        ]);

        foreach (['cod_fee', 'return_fee', 'monthly_fee'] as $field) {
            $data[$field] = Money::toHalalas($data[$field]);
        }

        if (! empty($data['is_default'])) {
            Plan::query()->when($plan, fn ($query) => $query->whereKeyNot($plan->id))->update(['is_default' => false]);
        }

        return $data;
    }
}
