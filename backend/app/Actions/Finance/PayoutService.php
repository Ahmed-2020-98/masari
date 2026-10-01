<?php

namespace App\Actions\Finance;

use App\Enums\PayoutStatus;
use App\Enums\WalletTransactionType;
use App\Exceptions\DomainException;
use App\Models\Merchant;
use App\Models\PayoutRequest;
use App\Models\User;
use App\Services\MerchantNotifier;
use App\Services\Wallet\WalletService;
use App\Support\Money;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;

class PayoutService
{
    public function __construct(private WalletService $wallet, private MerchantNotifier $notifier) {}

    /**
     * Request a bank payout; the amount is held (debited) immediately and reversed if rejected.
     */
    public function request(Merchant $merchant, User $user, int $amount): PayoutRequest
    {
        if (! $merchant->iban || ! $merchant->account_holder) {
            throw new DomainException('يرجى إضافة بيانات الحساب البنكي (الآيبان) من الإعدادات أولاً.', 'missing_iban');
        }

        if ($amount < config('masari.min_payout')) {
            throw new DomainException('الحد الأدنى لطلب التحويل '.Money::format(config('masari.min_payout')).'.', 'amount_too_low');
        }

        if ($merchant->payoutRequests()->where('status', PayoutStatus::Pending)->exists()) {
            throw new DomainException('لديك طلب تحويل قيد المراجعة بالفعل.', 'payout_pending');
        }

        return DB::transaction(function () use ($merchant, $user, $amount): PayoutRequest {
            $payout = $merchant->payoutRequests()->create([
                'user_id' => $user->id,
                'amount' => $amount,
                'iban' => $merchant->iban,
                'bank_name' => $merchant->bank_name,
                'account_holder' => $merchant->account_holder,
                'status' => PayoutStatus::Pending,
            ]);

            $this->wallet->debit($merchant, $amount, WalletTransactionType::Payout, 'طلب تحويل بنكي إلى '.$merchant->iban, $payout, $user);

            return $payout;
        });
    }

    /**
     * Mark the payout as transferred.
     */
    public function approve(PayoutRequest $payout, User $admin, ?string $transferReference, ?UploadedFile $proof): PayoutRequest
    {
        $this->guardPending($payout);

        $payout->update([
            'status' => PayoutStatus::Approved,
            'reviewed_by' => $admin->id,
            'reviewed_at' => now(),
            'transfer_reference' => $transferReference,
            'proof_path' => $proof?->store("payouts/{$payout->merchant_id}", 'local'),
        ]);

        $this->notifier->notify($payout->merchant, 'payout.approved', 'تم تنفيذ التحويل البنكي', 'تم تحويل '.Money::format($payout->amount).' إلى حسابك البنكي.', ['payout_id' => $payout->id], 'green');

        return $payout;
    }

    /**
     * Reject the payout and return the held amount to the wallet.
     */
    public function reject(PayoutRequest $payout, User $admin, string $reason): PayoutRequest
    {
        $this->guardPending($payout);

        DB::transaction(function () use ($payout, $admin, $reason): void {
            $payout->update(['status' => PayoutStatus::Rejected, 'reviewed_by' => $admin->id, 'reviewed_at' => now(), 'rejection_reason' => $reason]);
            $this->wallet->credit($payout->merchant, $payout->amount, WalletTransactionType::PayoutReversal, 'إلغاء طلب تحويل: '.$reason, $payout, $admin);
        });

        $this->notifier->notify($payout->merchant, 'payout.rejected', 'تم رفض طلب التحويل', $reason, ['payout_id' => $payout->id], 'rose');

        return $payout;
    }

    /**
     * Ensure the payout has not been reviewed yet.
     */
    private function guardPending(PayoutRequest $payout): void
    {
        if ($payout->status !== PayoutStatus::Pending) {
            throw new DomainException('تمت مراجعة هذا الطلب مسبقاً.', 'already_reviewed');
        }
    }
}
