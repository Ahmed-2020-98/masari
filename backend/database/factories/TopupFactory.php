<?php

namespace Database\Factories;

use App\Enums\TopupMethod;
use App\Enums\TopupStatus;
use App\Models\Merchant;
use App\Models\Topup;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Topup>
 */
class TopupFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'merchant_id' => Merchant::factory(),
            'method' => TopupMethod::BankTransfer,
            'amount' => 50000,
            'status' => TopupStatus::Pending,
            'receipt_path' => 'receipts/demo.pdf',
        ];
    }
}
