<?php

namespace App\Services\Wallet;

use App\Enums\WalletTransactionType;
use App\Exceptions\DomainException;
use App\Models\Merchant;
use App\Models\User;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use App\Support\Money;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

class WalletService
{
    /**
     * The merchant's wallet, created on first access.
     */
    public function for(Merchant $merchant): Wallet
    {
        return Wallet::query()->firstOrCreate(['merchant_id' => $merchant->id]);
    }

    /**
     * Add funds to the wallet.
     *
     * @param  array<string, mixed>  $meta
     */
    public function credit(Merchant $merchant, int $amount, WalletTransactionType $type, string $description, ?Model $reference = null, ?User $by = null, array $meta = []): WalletTransaction
    {
        return $this->record($merchant, abs($amount), $type, $description, $reference, $by, $meta);
    }

    /**
     * Remove funds from the wallet, failing when the balance (plus credit limit) is insufficient.
     *
     * @param  array<string, mixed>  $meta
     */
    public function debit(Merchant $merchant, int $amount, WalletTransactionType $type, string $description, ?Model $reference = null, ?User $by = null, array $meta = [], bool $allowNegative = false): WalletTransaction
    {
        return $this->record($merchant, -abs($amount), $type, $description, $reference, $by, $meta, $allowNegative);
    }

    /**
     * Write a ledger entry and update the balance under a row lock.
     *
     * @param  array<string, mixed>  $meta
     */
    private function record(Merchant $merchant, int $signedAmount, WalletTransactionType $type, string $description, ?Model $reference, ?User $by, array $meta, bool $allowNegative = false): WalletTransaction
    {
        return DB::transaction(function () use ($merchant, $signedAmount, $type, $description, $reference, $by, $meta, $allowNegative): WalletTransaction {
            $this->for($merchant);

            $wallet = Wallet::query()->where('merchant_id', $merchant->id)->lockForUpdate()->firstOrFail();
            $newBalance = $wallet->balance + $signedAmount;

            if ($signedAmount < 0 && ! $allowNegative && $newBalance < -$wallet->credit_limit) {
                throw new DomainException(
                    'رصيد المحفظة غير كافٍ. الرصيد الحالي '.Money::format($wallet->balance).' والمطلوب '.Money::format(abs($signedAmount)).'.',
                    'insufficient_balance',
                    402,
                );
            }

            $wallet->update(['balance' => $newBalance]);

            return $wallet->transactions()->create([
                'type' => $type,
                'amount' => $signedAmount,
                'balance_after' => $newBalance,
                'description' => $description,
                'reference_type' => $reference?->getMorphClass(),
                'reference_id' => $reference?->getKey(),
                'created_by' => $by?->id,
                'meta' => $meta ?: null,
            ]);
        });
    }
}
