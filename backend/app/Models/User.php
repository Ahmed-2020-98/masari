<?php

namespace App\Models;

use App\Enums\MerchantRole;
use App\Enums\UserType;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

#[Fillable(['name', 'phone', 'phone_verified_at', 'email', 'password', 'type', 'current_merchant_id', 'is_active', 'last_login_at'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, HasRoles, Notifiable;

    /**
     * Default attribute values mirrored from the database defaults.
     *
     * @var array<string, mixed>
     */
    protected $attributes = [
        'type' => 'merchant',
        'is_active' => true,
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'phone_verified_at' => 'datetime',
            'email_verified_at' => 'datetime',
            'last_login_at' => 'datetime',
            'password' => 'hashed',
            'type' => UserType::class,
            'is_active' => 'boolean',
        ];
    }

    /**
     * @return BelongsToMany<Merchant, $this>
     */
    public function merchants(): BelongsToMany
    {
        return $this->belongsToMany(Merchant::class)->withPivot('role')->withTimestamps();
    }

    /**
     * @return BelongsTo<Merchant, $this>
     */
    public function currentMerchant(): BelongsTo
    {
        return $this->belongsTo(Merchant::class, 'current_merchant_id');
    }

    /**
     * @return HasMany<DeviceToken, $this>
     */
    public function deviceTokens(): HasMany
    {
        return $this->hasMany(DeviceToken::class);
    }

    /**
     * Whether the user belongs to the back-office.
     */
    public function isAdmin(): bool
    {
        return $this->type === UserType::Admin;
    }

    /**
     * The user's role inside the given merchant account, if a member.
     */
    public function roleIn(Merchant $merchant): ?MerchantRole
    {
        $membership = $this->merchants->firstWhere('id', $merchant->id);

        return $membership ? MerchantRole::from($membership->pivot->role) : null;
    }

    /**
     * FCM tokens used by the push notification channel.
     *
     * @return list<string>
     */
    public function routeNotificationForFcm(): array
    {
        return $this->deviceTokens()->pluck('token')->all();
    }

    /**
     * Phone number used by the SMS notification channel.
     */
    public function routeNotificationForSms(): string
    {
        return $this->phone;
    }
}
