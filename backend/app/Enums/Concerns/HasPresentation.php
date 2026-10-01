<?php

namespace App\Enums\Concerns;

trait HasPresentation
{
    /**
     * Serialize the case for API consumers so clients never duplicate label/color mappings.
     *
     * @return array{value: string, label: string, color: string}
     */
    public function present(): array
    {
        return [
            'value' => $this->value,
            'label' => $this->label(),
            'color' => $this->color(),
        ];
    }

    /**
     * All cases presented as options for select inputs and filters.
     *
     * @return list<array{value: string, label: string, color: string}>
     */
    public static function options(): array
    {
        return array_map(fn (self $case): array => $case->present(), self::cases());
    }
}
