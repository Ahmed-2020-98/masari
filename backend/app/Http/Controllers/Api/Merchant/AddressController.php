<?php

namespace App\Http\Controllers\Api\Merchant;

use App\Http\Controllers\Concerns\InteractsWithMerchant;
use App\Http\Controllers\Controller;
use App\Http\Resources\AddressResource;
use App\Models\Address;
use App\Support\Phone;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class AddressController extends Controller
{
    use InteractsWithMerchant;

    /**
     * Sender (warehouse) or saved recipient addresses.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $addresses = $this->merchant($request)->addresses()
            ->with('city')
            ->when($request->query('type'), fn ($query, $type) => $query->where('type', $type))
            ->when($request->query('search'), fn ($query, $term) => $query->where(fn ($inner) => $inner->where('name', 'like', "%{$term}%")->orWhere('phone', 'like', "%{$term}%")))
            ->orderByDesc('is_default')
            ->latest('id')
            ->paginate(50);

        return AddressResource::collection($addresses);
    }

    /**
     * Save a new address.
     */
    public function store(Request $request): JsonResponse
    {
        $address = DB::transaction(function () use ($request): Address {
            $data = $this->validated($request);
            $merchant = $this->merchant($request);

            if (! empty($data['is_default'])) {
                $merchant->addresses()->where('type', $data['type'])->update(['is_default' => false]);
            }

            return $merchant->addresses()->create($data);
        });

        return AddressResource::make($address->load('city'))->response()->setStatusCode(201);
    }

    /**
     * Update an address.
     */
    public function update(Request $request, Address $address): AddressResource
    {
        $this->ensureOwned($request, $address);

        DB::transaction(function () use ($request, $address): void {
            $data = $this->validated($request);

            if (! empty($data['is_default'])) {
                $this->merchant($request)->addresses()->where('type', $data['type'])->whereKeyNot($address->id)->update(['is_default' => false]);
            }

            $address->update($data);
        });

        return AddressResource::make($address->load('city'));
    }

    /**
     * Delete an address.
     */
    public function destroy(Request $request, Address $address): JsonResponse
    {
        $this->ensureOwned($request, $address);
        $address->delete();

        return response()->json(['message' => 'تم حذف العنوان.']);
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(Request $request): array
    {
        if ($request->filled('phone')) {
            $request->merge(['phone' => Phone::normalize((string) $request->input('phone'))]);
        }

        return $request->validate([
            'type' => ['required', Rule::in(['sender', 'recipient'])],
            'label' => ['nullable', 'string', 'max:60'],
            'name' => ['required', 'string', 'max:120'],
            'phone' => ['required', 'regex:/^\+9665\d{8}$/'],
            'email' => ['nullable', 'email'],
            'city_id' => ['required', 'exists:cities,id'],
            'district' => ['nullable', 'string', 'max:120'],
            'street' => ['nullable', 'string', 'max:190'],
            'building_no' => ['nullable', 'string', 'max:20'],
            'postal_code' => ['nullable', 'string', 'max:10'],
            'short_address' => ['nullable', 'string', 'max:20'],
            'notes' => ['nullable', 'string', 'max:300'],
            'is_default' => ['boolean'],
        ], ['phone.regex' => 'يرجى إدخال رقم جوال سعودي صحيح.']);
    }
}
