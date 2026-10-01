<?php

namespace App\Http\Controllers\Api\Merchant;

use App\Http\Controllers\Concerns\InteractsWithMerchant;
use App\Http\Controllers\Controller;
use App\Http\Resources\MerchantResource;
use App\Support\Activity;
use Illuminate\Http\Request;

class SettingsController extends Controller
{
    use InteractsWithMerchant;

    /**
     * Merchant profile, legal and bank details.
     */
    public function show(Request $request): MerchantResource
    {
        return MerchantResource::make($this->merchant($request)->load(['plan', 'wallet']));
    }

    /**
     * Update store profile and bank details (owner / manager only).
     */
    public function update(Request $request): MerchantResource
    {
        $request->merge(['iban' => $request->filled('iban') ? strtoupper(str_replace(' ', '', (string) $request->input('iban'))) : null]);
        $data = $request->validate([
            'store_name' => ['required', 'string', 'max:120'],
            'store_url' => ['nullable', 'url', 'max:255'],
            'email' => ['nullable', 'email', 'max:190'],
            'commercial_registration' => ['nullable', 'digits:10'],
            'vat_number' => ['nullable', 'digits:15'],
            'iban' => ['nullable', 'regex:/^SA\d{22}$/'],
            'bank_name' => ['nullable', 'string', 'max:120'],
            'account_holder' => ['nullable', 'required_with:iban', 'string', 'max:120'],
        ], [
            'iban.regex' => 'رقم الآيبان يجب أن يبدأ بـ SA ويتكون من 24 خانة.',
            'vat_number.digits' => 'الرقم الضريبي يتكون من 15 رقماً.',
            'commercial_registration.digits' => 'السجل التجاري يتكون من 10 أرقام.',
        ]);

        $merchant = $this->merchant($request);
        $merchant->update($data);
        Activity::log('merchant.settings_updated', $merchant, array_keys($merchant->getChanges()), $merchant->id);

        return MerchantResource::make($merchant->load(['plan', 'wallet']));
    }
}
