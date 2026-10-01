<?php

namespace App\Services\Carriers\Data;

use App\Enums\ShipmentStatus;
use Carbon\CarbonInterface;

final readonly class TrackingEvent
{
    /**
     * @param  array<string, mixed>  $raw
     */
    public function __construct(
        public ShipmentStatus $status,
        public string $description,
        public CarbonInterface $occurredAt,
        public ?string $location = null,
        public array $raw = [],
    ) {}
}
