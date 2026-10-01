<?php

namespace App\Models;

use App\Enums\StoreOrderStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['merchant_id', 'store_connection_id', 'external_id', 'number', 'customer', 'items', 'total', 'payment_method', 'cod_amount', 'weight_kg', 'status', 'shipment_id', 'ordered_at', 'raw'])]
#[Hidden(['raw'])]
class StoreOrder extends Model
{
    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'customer' => 'array',
            'items' => 'array',
            'raw' => 'array',
            'status' => StoreOrderStatus::class,
            'ordered_at' => 'datetime',
            'total' => 'integer',
            'cod_amount' => 'integer',
            'weight_kg' => 'decimal:2',
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
     * @return BelongsTo<StoreConnection, $this>
     */
    public function storeConnection(): BelongsTo
    {
        return $this->belongsTo(StoreConnection::class);
    }

    /**
     * @return BelongsTo<Shipment, $this>
     */
    public function shipment(): BelongsTo
    {
        return $this->belongsTo(Shipment::class);
    }
}
