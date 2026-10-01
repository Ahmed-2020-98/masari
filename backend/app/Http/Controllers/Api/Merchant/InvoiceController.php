<?php

namespace App\Http\Controllers\Api\Merchant;

use App\Enums\ShipmentStatus;
use App\Http\Controllers\Concerns\InteractsWithMerchant;
use App\Http\Controllers\Controller;
use App\Services\Labels\LabelService;
use App\Support\Money;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class InvoiceController extends Controller
{
    use InteractsWithMerchant;

    /**
     * Monthly tax invoices (one per month with shipping activity).
     */
    public function index(Request $request): JsonResponse
    {
        $months = $this->merchant($request)->shipments()
            ->where('status', '!=', ShipmentStatus::Cancelled)
            ->selectRaw("DATE_FORMAT(created_at, '%Y-%m') as month, count(*) as shipments, sum(price) as subtotal, sum(vat) as vat, sum(total) as total")
            ->groupBy('month')
            ->orderByDesc('month')
            ->get();

        return response()->json([
            'data' => $months->map(fn ($row) => [
                'month' => $row->month,
                'number' => 'INV-'.str_replace('-', '', $row->month).'-'.str_pad((string) $this->merchant($request)->id, 5, '0', STR_PAD_LEFT),
                'shipments' => (int) $row->shipments,
                'subtotal' => Money::present((int) $row->subtotal),
                'vat' => Money::present((int) $row->vat),
                'total' => Money::present((int) $row->total),
            ]),
        ]);
    }

    /**
     * Render the simplified VAT invoice PDF for a month.
     */
    public function show(Request $request, string $month, LabelService $pdf): Response
    {
        abort_unless(preg_match('/^\d{4}-\d{2}$/', $month) === 1, 404);

        $merchant = $this->merchant($request);
        $start = CarbonImmutable::createFromFormat('Y-m-d', $month.'-01')->startOfMonth();
        $shipments = $merchant->shipments()
            ->with('carrier')
            ->where('status', '!=', ShipmentStatus::Cancelled)
            ->whereBetween('created_at', [$start, $start->endOfMonth()])
            ->orderBy('id')
            ->get();

        abort_if($shipments->isEmpty(), 404);

        $document = $pdf->makePdf('A4');
        $document->WriteHTML(view('pdf.invoice', [
            'merchant' => $merchant,
            'month' => $start,
            'number' => 'INV-'.$start->format('Ym').'-'.str_pad((string) $merchant->id, 5, '0', STR_PAD_LEFT),
            'shipments' => $shipments,
        ])->render());

        return response($document->Output('', 'S'), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="invoice-'.$month.'.pdf"',
        ]);
    }
}
