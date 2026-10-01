<?php

namespace App\Services\Integrations;

use App\Enums\StorePlatform;

class IntegrationManager
{
    public function __construct(private CityResolver $cities) {}

    /**
     * Resolve the integration for a store platform.
     */
    public function for(StorePlatform $platform): StoreIntegration
    {
        return match ($platform) {
            StorePlatform::Salla => new SallaIntegration(config('masari.integrations.salla'), $this->cities),
            StorePlatform::Zid => new ZidIntegration(config('masari.integrations.zid'), $this->cities),
        };
    }
}
