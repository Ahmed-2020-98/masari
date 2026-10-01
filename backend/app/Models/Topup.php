<?php

namespace App\Models;

use App\Enums\TopupMethod;
use App\Enums\TopupStatus;
use Database\Factories\TopupFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['merchant_id', 'user_id', 'method', 'amount', 'status', 'gateway_reference', 'receipt_path', 'bank_name', 'transfer_reference', 'reviewed_by', 'reviewed_at', 'rejection_reason', 'meta'])]
class Topup extends Model
{
    /** @use HasFactory<TopupFactory> */
    use HasFactory;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'method' => TopupMethod::class,
            'status' => TopupStatus::class,
            'amount' => 'integer',
            'reviewed_at' => 'datetime',
            'meta' => 'array',
        ];
    }

    /**
     * @return BelongsTo<Merchant, $this>
     */
    public function merchant(): BelongsTo
    {
        return $this->belongsTo(Merchant::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
