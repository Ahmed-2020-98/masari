<?php

namespace App\Http\Requests;

use App\Support\Phone;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class RegisterRequest extends FormRequest
{
    /**
     * Normalize the phone before validation.
     */
    protected function prepareForValidation(): void
    {
        if ($this->filled('phone')) {
            $this->merge(['phone' => Phone::normalize((string) $this->input('phone'))]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'verification_token' => ['required', 'string'],
            'phone' => ['required', 'regex:/^\+9665\d{8}$/', Rule::unique('users', 'phone')],
            'name' => ['required', 'string', 'max:120'],
            'email' => ['nullable', 'email', 'max:190', Rule::unique('users', 'email')],
            'password' => ['required', 'confirmed', Password::min(8)->letters()->numbers()],
            'store_name' => ['required', 'string', 'max:120'],
            'store_url' => ['nullable', 'url', 'max:255'],
            'monthly_volume' => ['nullable', Rule::in(['0-100', '100-500', '500-2000', '2000+'])],
            'device_name' => ['required', 'string', 'max:120'],
            'platform' => ['nullable', Rule::in(['web', 'ios', 'android'])],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'phone' => 'رقم الجوال',
            'name' => 'الاسم',
            'email' => 'البريد الإلكتروني',
            'password' => 'كلمة المرور',
            'store_name' => 'اسم المتجر',
            'store_url' => 'رابط المتجر',
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'phone.regex' => 'يرجى إدخال رقم جوال سعودي صحيح يبدأ بـ 05.',
            'phone.unique' => 'رقم الجوال مسجل مسبقاً، يمكنك تسجيل الدخول.',
        ];
    }
}
