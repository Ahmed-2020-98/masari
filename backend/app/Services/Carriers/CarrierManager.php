<?php

namespace App\Services\Carriers;

use App\Models\Carrier;
use App\Services\Carriers\Drivers\MockCarrierDriver;
use Illuminate\Contracts\Container\Container;
use InvalidArgumentException;

class CarrierManager
{
    /**
     * Map of driver keys to implementations. Real carrier drivers are registered here as they are built.
     *
     * @var array<string, class-string<CarrierDriver>>
     */
    private array $drivers = [
        'mock' => MockCarrierDriver::class,
    ];

    public function __construct(private Container $container) {}

    /**
     * Resolve the driver configured for the carrier.
     */
    public function for(Carrier $carrier): CarrierDriver
    {
        $class = $this->drivers[$carrier->driver] ?? throw new InvalidArgumentException("Unknown carrier driver [{$carrier->driver}].");

        return $this->container->make($class, ['carrier' => $carrier]);
    }
}
