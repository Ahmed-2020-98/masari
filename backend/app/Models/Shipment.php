<?php

namespace App\Models;

use App\Enums\CodStatus;
use App\Enums\ShipmentStatus;
use App\Enums\ShipmentType;
use App\Enums\Zone;
use Database\Factories\ShipmentFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'reference', 'merchant_id', 'created_by', 'carrier_id', 'carrier_service_id', 'type', 'parent_id', 'source', 'awb', 'status',
    'order_number', 'sender', 'recipient', 'origin_city_id', 'destination_city_id', 'zone', 'pieces', 'weight_kg', 'chargeable_weight_kg',
    'dimensions', 'contents', 'declared_value', 'cod_amount', 'cod_status', 'cod_settlement_id', 'cod_credited_at', 'carrier_cost', 'price',
    'vat', 'total', 'price_breakdown', 'label_path', 'notes', 'delivered_at', 'cancelled_at', 'last_tracked_at',
])]
class Shipment extends Model
{
    /** @use HasFactory<ShipmentFactory> */
    use HasFactory, HasUlids;

    /**
     * Default attribute values mirrored from the database defaults.
     *
     * @var array<string, mixed>
     */
    protected $attributes = [
        'type' => 'outbound',
        'source' => 'manual',
        'status' => 'created',
        'pieces' => 1,
        'declared_value' => 0,
        'cod_amount' => 0,
        'carrier_cost' => 0,
        'price' => 0,
        'vat' => 0,
        'total' => 0,
    ];

    /**
     * Only the public `uuid` column is a ULID; the primary key stays an auto-increment id.
     *
     * @return list<string>
     */
    public function uniqueIds(): array
    {
        return ['uuid'];
    }

    /**
     * Route model binding resolves shipments by their public ULID.
     */
    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'type' => ShipmentType::class,
            'status' => ShipmentStatus::class,
            'cod_status' => CodStatus::class,
            'zone' => Zone::class,
            'sender' => 'array',
            'recipient' => 'array',
            'dimensions' => 'array',
            'price_breakdown' => 'array',
            'weight_kg' => 'decimal:2',
            'chargeable_weight_kg' => 'decimal:2',
            'cod_amount' => 'integer',
            'carrier_cost' => 'integer',
            'price' => 'integer',
            'vat' => 'integer',
            'total' => 'integer',
            'declared_value' => 'integer',
            'cod_credited_at' => 'datetime',
            'delivered_at' => 'datetime',
            'cancelled_at' => 'datetime',
            'last_tracked_at' => 'datetime',
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
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * @return BelongsTo<Carrier, $this>
     */
    public function carrier(): BelongsTo
    {
        return $this->belongsTo(Carrier::class);
    }

    /**
     * @return BelongsTo<CarrierService, $this>
     */
    public function carrierService(): BelongsTo
    {
        return $this->belongsTo(CarrierService::class);
    }

    /**
     * @return BelongsTo<City, $this>
     */
    public function originCity(): BelongsTo
    {
        return $this->belongsTo(City::class, 'origin_city_id');
    }

    /**
     * @return BelongsTo<City, $this>
     */
    public function destinationCity(): BelongsTo
    {
        return $this->belongsTo(City::class, 'destination_city_id');
    }

    /**
     * @return HasMany<ShipmentEvent, $this>
     */
    public function events(): HasMany
    {
        return $this->hasMany(ShipmentEvent::class)->orderByDesc('occurred_at')->orderByDesc('id');
    }

    /**
     * @return BelongsTo<Shipment, $this>
     */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(Shipment::class, 'parent_id');
    }

    /**
     * @return HasMany<Shipment, $this>
     */
    public function returns(): HasMany
    {
        return $this->hasMany(Shipment::class, 'parent_id');
    }

    /**
     * @return BelongsTo<CodSettlement, $this>
     */
    public function codSettlement(): BelongsTo
    {
        return $this->belongsTo(CodSettlement::class);
    }

    /**
     * @return BelongsToMany<Pickup, $this>
     */
    public function pickups(): BelongsToMany
    {
        return $this->belongsToMany(Pickup::class);
    }

    /**
     * Shipments still moving through the carrier network.
     *
     * @param  Builder<Shipment>  $query
     * @return Builder<Shipment>
     */
    #[Scope]
    protected function trackable(Builder $query): Builder
    {
        return $query->whereNotIn('status', [
            ShipmentStatus::Draft, ShipmentStatus::Delivered, ShipmentStatus::Returned, ShipmentStatus::Cancelled,
        ])->whereNotNull('awb');
    }

    /**
     * Whether the shipment collects cash on delivery.
     */
    public function isCod(): bool
    {
        return $this->cod_amount > 0;
    }
}
