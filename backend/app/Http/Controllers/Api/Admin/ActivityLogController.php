<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\ActivityLogResource;
use App\Models\ActivityLog;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ActivityLogController extends Controller
{
    /**
     * Audit trail.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        return ActivityLogResource::collection(
            ActivityLog::query()->with(['user', 'merchant'])
                ->when($request->query('action'), fn ($query, $action) => $query->where('action', 'like', "{$action}%"))
                ->when($request->query('merchant_id'), fn ($query, $merchant) => $query->where('merchant_id', $merchant))
                ->latest('id')
                ->paginate(50)
        );
    }
}
