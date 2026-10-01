<?php

namespace App\Http\Requests;

use App\Support\Money;
use App\Support\Phone;
use Illuminate\Foundation\Http\FormRequest;

class StoreShipmentRequest extends FormRequest
{
    /**
     * Normalize phones and convert riyal amounts into halalas.
     */
    protected function prepareForValidation(): void
    {
        $merge = [];

        foreach (['sender', 'recipient'] as $party) {
            if (is_array($this->input($party)) && $this->filled("{$party}.phone")) {
                $merge[$party] = array_merge($this->input($party), ['phone' => Phone::normalize((string) $this->input("{$party}.phone"))]);
            }
        }

        $merge['cod_amount'] = Money::toHalalas($this->input('cod_amount', 0) ?: 0);
        $merge['declared_value'] = Money::toHalalas($this->input('declared_value', 0) ?: 0);

        $this->merge($merge);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'carrier_service_id' => ['required', 'integer', 'exists:carrier_services,id'],
            'sender_address_id' => ['nullable', 'integer'],
            'sender' => ['required_without:sender_address_id', 'array'],
            'sender.name' => ['required_with:sender', 'string', 'max:120'],
            'sender.phone' => ['required_with:sender', 'regex:/^\+9665\d{8}$/'],
            'sender.city_id' => ['required_with:sender', 'integer', 'exists:cities,id'],
            'sender.district' => ['nullable', 'string', 'max:120'],
            'sender.street' => ['nullable', 'string', 'max:190'],
            'sender.building_no' => ['nullable', 'string', 'max:20'],
            'sender.short_address' => ['nullable', 'string', 'max:20'],
            'recipient' => ['required', 'array'],
            'recipient.name' => ['required', 'string', 'max:120'],
            'recipient.phone' => ['required', 'regex:/^\+9665\d{8}$/'],
            'recipient.email' => ['nullable', 'email'],
            'recipient.city_id' => ['required', 'integer', 'exists:cities,id'],
            'recipient.district' => ['nullable', 'string', 'max:120'],
            'recipient.street' => ['nullable', 'string', 'max:190'],
            'recipient.building_no' => ['nullable', 'string', 'max:20'],
            'recipient.postal_code' => ['nullable', 'string', 'max:10'],
            'recipient.short_address' => ['nullable', 'string', 'max:20'],
            'save_recipient' => ['boolean'],
            'weight_kg' => ['required', 'numeric', 'min:0.1', 'max:70'],
            'dimensions' => ['nullable', 'array'],
            'dimensions.length' => ['nullable', 'numeric', 'min:1', 'max:300'],
            'dimensions.width' => ['nullable', 'numeric', 'min:1', 'max:300'],
            'dimensions.height' => ['nullable', 'numeric', 'min:1', 'max:300'],
            'pieces' => ['nullable', 'integer', 'min:1', 'max:50'],
            'contents' => ['nullable', 'string', 'max:190'],
            'declared_value' => ['nullable', 'integer', 'min:0'],
            'cod_amount' => ['nullable', 'integer', 'min:0', 'max:5000000'],
            'order_number' => ['nullable', 'string', 'max:60'],
            'notes' => ['nullable', 'string', 'max:500'],
            'store_order_id' => ['nullable', 'integer'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'recipient.phone.regex' => 'رقم جوال المستلم غير صحيح.',
            'sender.phone.regex' => 'رقم جوال المرسل غير صحيح.',
            'recipient.city_id.required' => 'يرجى اختيار مدينة المستلم.',
            'carrier_service_id.required' => 'يرجى اختيار شركة الشحن.',
        ];
    }
}
