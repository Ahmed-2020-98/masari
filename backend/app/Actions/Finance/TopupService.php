<?php

namespace App\Actions\Finance;

use App\Enums\TopupMethod;
use App\Enums\TopupStatus;
use App\Enums\WalletTransactionType;
use App\Exceptions\DomainException;
use App\Models\Merchant;
use App\Models\Topup;
use App\Models\User;
use App\Services\MerchantNotifier;
use App\Services\Payments\PaymentGateway;
use App\Services\Wallet\WalletService;
use App\Services\Webhooks\WebhookDispatcher;
use App\Support\Money;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;

class TopupService
{
    public function __construct(
        private PaymentGateway $gateway,
        private WalletService $wallet,
        private MerchantNotifier $notifier,
        private WebhookDispatcher $webhooks,
    ) {}

    /**
     * Start an online card top-up and return the checkout URL.
     *
     * @return array{topup: Topup, payment_url: string}
     */
    public function startCard(Merchant $merchant, User $user, int $amount, string $redirectUrl): array
    {
        $this->guardAmount($amount);

        $topup = $merchant->topups()->create([
            'user_id' => $user->id,
            'method' => TopupMethod::Card,
            'amount' => $amount,
            'status' => TopupStatus::Pending,
        ]);

        return ['topup' => $topup, 'payment_url' => $this->gateway->createCharge($topup, $redirectUrl)];
    }

    /**
     * Record a bank transfer receipt awaiting admin review.
     */
    public function submitBankTransfer(Merchant $merchant, User $user, int $amount, UploadedFile $receipt, ?string $bankName, ?string $reference): Topup
    {
        $this->guardAmount($amount);

        return $merchant->topups()->create([
            'user_id' => $user->id,
            'method' => TopupMethod::BankTransfer,
            'amount' => $amount,
            'status' => TopupStatus::Pending,
            'receipt_path' => $receipt->store("receipts/{$merchant->id}", 'local'),
            'bank_name' => $bankName,
            'transfer_reference' => $reference,
        ]);
    }

    /**
     * Re-check a card top-up with the gateway and settle it (idempotent; safe for webhooks and redirects).
     */
    public function syncWithGateway(Topup $topup): Topup
    {
        if ($topup->status !== TopupStatus::Pending || ! $topup->gateway_reference) {
            return $topup;
        }

        return match ($this->gateway->status($topup->gateway_reference)) {
            'paid' => $this->markPaid($topup),
            'failed' => tap($topup)->update(['status' => TopupStatus::Failed]),
            default => $topup,
        };
    }

    /**
     * Approve a pending top-up and credit the wallet exactly once.
     */
    public function markPaid(Topup $topup, ?User $reviewer = null): Topup
    {
        DB::transaction(function () use ($topup, $reviewer): void {
            $locked = Topup::query()->lockForUpdate()->findOrFail($topup->id);

            if ($locked->status !== TopupStatus::Pending) {
                return;
            }

            $locked->update([
                'status' => TopupStatus::Paid,
                'reviewed_by' => $reviewer?->id,
                'reviewed_at' => $reviewer ? now() : null,
            ]);

            $this->wallet->credit($locked->merchant, $locked->amount, WalletTransactionType::Topup, 'شحن رصيد — '.$locked->method->label(), $locked, $reviewer);
        });

        $topup->refresh();

        if ($topup->status === TopupStatus::Paid) {
            $this->notifier->notify($topup->merchant, 'wallet.topup', 'تم شحن رصيد المحفظة', 'تمت إضافة '.Money::format($topup->amount).' إلى محفظتك.', ['topup_id' => $topup->id], 'green');
            $this->webhooks->dispatch($topup->merchant, 'wallet.credited', ['type' => 'topup', 'amount' => Money::present($topup->amount)]);
        }

        return $topup;
    }

    /**
     * Reject a bank transfer top-up.
     */
    public function reject(Topup $topup, User $reviewer, string $reason): Topup
    {
        if ($topup->status !== TopupStatus::Pending) {
            throw new DomainException('تمت مراجعة هذا الطلب مسبقاً.', 'already_reviewed');
        }

        $topup->update(['status' => TopupStatus::Rejected, 'reviewed_by' => $reviewer->id, 'reviewed_at' => now(), 'rejection_reason' => $reason]);

        $this->notifier->notify($topup->merchant, 'wallet.topup_rejected', 'تم رفض طلب شحن الرصيد', $reason, ['topup_id' => $topup->id], 'rose');

        return $topup;
    }

    /**
     * Enforce the minimum top-up amount.
     */
    private function guardAmount(int $amount): void
    {
        if ($amount < config('masari.min_topup')) {
            throw new DomainException('الحد الأدنى لشحن الرصيد '.Money::format(config('masari.min_topup')).'.', 'amount_too_low');
        }
    }
}
