<?php

namespace App\Http\Controllers\Api\Merchant;

use App\Actions\Shipments\CreateShipmentAction;
use App\Exports\BulkTemplateExport;
use App\Http\Controllers\Concerns\InteractsWithMerchant;
use App\Http\Controllers\Controller;
use App\Imports\BulkShipmentsImport;
use App\Models\CarrierService;
use App\Services\Integrations\CityResolver;
use App\Services\Pricing\PricingService;
use App\Support\Money;
use App\Support\Phone;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Throwable;

class BulkShipmentController extends Controller
{
    use InteractsWithMerchant;

    /**
     * Download the Excel template.
     */
    public function template(): BinaryFileResponse
    {
        return Excel::download(new BulkTemplateExport, 'masari-bulk-template.xlsx');
    }

    /**
     * Parse and validate an uploaded sheet, returning priced rows without creating anything.
     */
    public function preview(Request $request, CityResolver $cities, PricingService $pricing): JsonResponse
    {
        $data = $request->validate([
            'file' => ['required', 'file', 'mimes:xlsx,xls,csv', 'max:5120'],
            'carrier_service_id' => ['required', 'exists:carrier_services,id'],
            'sender_address_id' => ['required', 'integer'],
        ]);

        $merchant = $this->merchant($request);
        $sender = $merchant->addresses()->with('city')->findOrFail($data['sender_address_id']);
        $service = CarrierService::query()->with('carrier')->findOrFail($data['carrier_service_id']);
        $sheet = Excel::toArray(new BulkShipmentsImport, $data['file'])[0] ?? [];
        $rows = array_slice($sheet, 1, 500);

        $parsed = collect($rows)
            ->filter(fn (array $row) => collect($row)->filter(fn ($cell) => $cell !== null && $cell !== '')->isNotEmpty())
            ->values()
            ->map(function (array $row, int $index) use ($cities, $pricing, $merchant, $sender, $service): array {
                $errors = [];
                $city = $cities->guess((string) ($row[2] ?? ''));
                $phone = Phone::normalize((string) ($row[1] ?? ''));
                $weight = (float) ($row[6] ?? 0);
                $cod = Money::toHalalas($row[9] ?? 0);

                if (blank($row[0] ?? null)) {
                    $errors[] = 'اسم المستلم مطلوب';
                }
                if (! Phone::isValidSaudiMobile($phone)) {
                    $errors[] = 'رقم الجوال غير صحيح';
                }
                if (! $city) {
                    $errors[] = 'لم يتم التعرف على المدينة';
                }
                if ($weight <= 0 || $weight > 70) {
                    $errors[] = 'الوزن غير صحيح';
                }

                $quote = $errors === [] ? $pricing->quote($merchant, $service, $sender->city, $city, $weight, null, $cod) : null;

                if ($errors === [] && ! $quote) {
                    $errors[] = 'الخدمة غير متاحة لهذه المدينة';
                }

                return [
                    'row' => $index + 2,
                    'valid' => $errors === [],
                    'errors' => $errors,
                    'recipient' => [
                        'name' => (string) ($row[0] ?? ''),
                        'phone' => $phone,
                        'city_id' => $city?->id,
                        'city' => $city?->name_ar ?? (string) ($row[2] ?? ''),
                        'district' => $row[3] ?? null,
                        'street' => $row[4] ?? null,
                        'short_address' => $row[5] ?? null,
                    ],
                    'weight_kg' => $weight,
                    'pieces' => max(1, (int) ($row[7] ?? 1)),
                    'contents' => $row[8] ?? null,
                    'cod_amount' => Money::present($cod),
                    'order_number' => isset($row[10]) ? (string) $row[10] : null,
                    'notes' => $row[11] ?? null,
                    'total' => $quote ? Money::present($quote->total) : null,
                ];
            });

        return response()->json([
            'data' => $parsed,
            'summary' => [
                'rows' => $parsed->count(),
                'valid' => $parsed->where('valid', true)->count(),
                'invalid' => $parsed->where('valid', false)->count(),
                'total' => Money::present((int) $parsed->where('valid', true)->sum(fn (array $row) => $row['total']['amount'] ?? 0)),
                'wallet' => Money::present($merchant->wallet?->balance ?? 0),
            ],
        ]);
    }

    /**
     * Create shipments for the confirmed rows; each row succeeds or fails independently.
     */
    public function store(Request $request, CreateShipmentAction $create): JsonResponse
    {
        $data = $request->validate([
            'carrier_service_id' => ['required', 'exists:carrier_services,id'],
            'sender_address_id' => ['required', 'integer'],
            'rows' => ['required', 'array', 'min:1', 'max:500'],
            'rows.*.recipient.name' => ['required', 'string', 'max:120'],
            'rows.*.recipient.phone' => ['required', 'regex:/^\+9665\d{8}$/'],
            'rows.*.recipient.city_id' => ['required', 'exists:cities,id'],
            'rows.*.weight_kg' => ['required', 'numeric', 'min:0.1', 'max:70'],
            'rows.*.cod_amount' => ['nullable', 'integer', 'min:0'],
        ]);

        $merchant = $this->merchant($request);
        $sender = $merchant->addresses()->findOrFail($data['sender_address_id'])->toArray();
        $results = [];

        foreach ($request->input('rows') as $row) {
            try {
                $shipment = $create->handle($merchant, [
                    'carrier_service_id' => (int) $data['carrier_service_id'],
                    'sender' => $sender,
                    'recipient' => $row['recipient'],
                    'weight_kg' => (float) $row['weight_kg'],
                    'pieces' => (int) ($row['pieces'] ?? 1),
                    'contents' => $row['contents'] ?? null,
                    'cod_amount' => (int) ($row['cod_amount'] ?? 0),
                    'order_number' => $row['order_number'] ?? null,
                    'notes' => $row['notes'] ?? null,
                    'source' => 'bulk',
                ], $request->user());

                $results[] = ['row' => $row['row'] ?? null, 'ok' => true, 'id' => $shipment->uuid, 'awb' => $shipment->awb];
            } catch (Throwable $exception) {
                $results[] = ['row' => $row['row'] ?? null, 'ok' => false, 'message' => $exception->getMessage()];
            }
        }

        return response()->json([
            'data' => $results,
            'created' => collect($results)->where('ok', true)->count(),
            'failed' => collect($results)->where('ok', false)->count(),
        ]);
    }
}
