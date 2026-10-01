<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\CityResource;
use App\Models\City;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class CityController extends Controller
{
    /**
     * Cities with their region and remote flag.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        return CityResource::collection(
            City::query()->with('region')
                ->when($request->query('search'), fn ($query, $term) => $query->where('name_ar', 'like', "%{$term}%")->orWhere('name_en', 'like', "%{$term}%"))
                ->orderBy('region_id')->orderBy('name_ar')
                ->get()
        );
    }

    /**
     * Toggle remote / active flags (affects zone pricing).
     */
    public function update(Request $request, City $city): CityResource
    {
        $city->update($request->validate(['is_remote' => ['sometimes', 'boolean'], 'is_active' => ['sometimes', 'boolean']]));

        return CityResource::make($city->load('region'));
    }
}
