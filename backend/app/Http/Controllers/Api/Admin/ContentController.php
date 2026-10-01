<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Support\Activity;
use App\Support\Settings;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ContentController extends Controller
{
    /**
     * Landing page content blocks.
     */
    public function show(): JsonResponse
    {
        return response()->json([
            'faqs' => Settings::get('landing.faqs', []),
            'stats' => Settings::get('landing.stats', []),
            'contact' => Settings::get('landing.contact', []),
        ]);
    }

    /**
     * Save landing page content blocks.
     */
    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'faqs' => ['present', 'array'],
            'faqs.*.question' => ['required', 'string', 'max:190'],
            'faqs.*.answer' => ['required', 'string', 'max:2000'],
            'stats' => ['present', 'array', 'max:6'],
            'stats.*.label' => ['required', 'string', 'max:60'],
            'stats.*.value' => ['required', 'numeric'],
            'stats.*.suffix' => ['nullable', 'string', 'max:10'],
            'contact' => ['present', 'array'],
            'contact.phone' => ['nullable', 'string', 'max:30'],
            'contact.whatsapp' => ['nullable', 'string', 'max:30'],
            'contact.email' => ['nullable', 'email'],
            'contact.address' => ['nullable', 'string', 'max:190'],
            'contact.cr_number' => ['nullable', 'string', 'max:20'],
            'contact.vat_number' => ['nullable', 'string', 'max:20'],
        ]);

        foreach (['faqs', 'stats', 'contact'] as $key) {
            Settings::put("landing.{$key}", $data[$key]);
        }

        Activity::log('admin.content_updated');

        return $this->show();
    }
}
