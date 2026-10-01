<?php

namespace App\Services\Integrations;

use App\Models\City;
use Illuminate\Support\Str;

class CityResolver
{
    /**
     * Best-effort match of a free-text city name (Arabic or English) to a known city.
     */
    public function guess(?string $name): ?City
    {
        if (! $name) {
            return null;
        }

        $needle = $this->normalize($name);

        return City::query()->where('is_active', true)->get()
            ->first(fn (City $city): bool => $this->normalize($city->name_ar) === $needle || $this->normalize($city->name_en) === $needle);
    }

    /**
     * Strip diacritics, the Arabic definite article and punctuation for comparison.
     */
    private function normalize(string $value): string
    {
        $value = Str::lower(trim($value));
        $value = strtr($value, ['أ' => 'ا', 'إ' => 'ا', 'آ' => 'ا', 'ة' => 'ه', 'ى' => 'ي']);
        $value = preg_replace('/^ال/u', '', $value) ?? $value;

        return preg_replace('/[^\p{L}\p{N}]+/u', '', $value) ?? $value;
    }
}
