<?php

namespace App\Services\Carriers\Data;

final readonly class CreatedShipment
{
    /**
     * @param  array<string, mixed>  $raw
     */
    public function __construct(
        public string $awb,
        public ?string $labelPdf = null,
        public array $raw = [],
    ) {}
}
