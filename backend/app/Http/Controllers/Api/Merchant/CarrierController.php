<?php

namespace App\Http\Controllers\Api\Merchant;

use App\Http\Controllers\Controller;
use App\Http\Resources\CarrierResource;
use App\Models\Carrier;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class CarrierController extends Controller
{
    /**
     * Active carriers and their services.
     */
    public function index(): AnonymousResourceCollection
    {
        return CarrierResource::collection(
            Carrier::query()->where('is_active', true)->with(['services' => fn ($query) => $query->where('is_active', true)])->orderBy('sort')->get()
        );
    }
}
