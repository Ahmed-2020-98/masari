<?php

namespace App\Models;

use App\Enums\StorePlatform;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['merchant_id', 'platform', 'store_id', 'store_name', 'store_url', 'access_token', 'refresh_token', 'token_expires_at', 'settings', 'status', 'last_synced_at'])]
#[Hidden(['access_token', 'refresh_token'])]
class StoreConnection extends Model
{
    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'platform' => StorePlatform::class,
            'access_token' => 'encrypted',
            'refresh_token' => 'encrypted',
            'token_expires_at' => 'datetime',
            'settings' => 'array',
            'last_synced_at' => 'datetime',
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
     * @return HasMany<StoreOrder, $this>
     */
    public function orders(): HasMany
    {
        return $this->hasMany(StoreOrder::class);
    }
}
