<?php

namespace App\Services\Labels;

use App\Models\Shipment;
use Illuminate\Support\Facades\Storage;
use Mpdf\Mpdf;
use Picqer\Barcode\BarcodeGeneratorSVG;

class LabelService
{
    /**
     * Render the 4x6 inch shipping label PDF and store it privately.
     */
    public function generate(Shipment $shipment): string
    {
        $shipment->loadMissing(['carrier', 'carrierService', 'originCity', 'destinationCity', 'merchant']);

        $barcode = (new BarcodeGeneratorSVG)->getBarcode($shipment->awb, BarcodeGeneratorSVG::TYPE_CODE_128, 2, 70);

        $html = view('pdf.label', [
            'shipment' => $shipment,
            'barcode' => 'data:image/svg+xml;base64,'.base64_encode($barcode),
        ])->render();

        $pdf = $this->makePdf([101.6, 152.4]);
        $pdf->WriteHTML($html);

        $path = "labels/{$shipment->uuid}.pdf";
        Storage::disk('local')->put($path, $pdf->Output('', 'S'));

        return $path;
    }

    /**
     * Combine several stored labels into one printable document.
     *
     * @param  iterable<Shipment>  $shipments
     */
    public function merge(iterable $shipments): string
    {
        $pdf = $this->makePdf([101.6, 152.4]);
        $first = true;

        foreach ($shipments as $shipment) {
            if (! $shipment->label_path || ! Storage::disk('local')->exists($shipment->label_path)) {
                continue;
            }

            $pageCount = $pdf->setSourceFile(Storage::disk('local')->path($shipment->label_path));

            for ($page = 1; $page <= $pageCount; $page++) {
                if (! $first) {
                    $pdf->AddPage();
                }

                $pdf->useTemplate($pdf->importPage($page));
                $first = false;
            }
        }

        return $pdf->Output('', 'S');
    }

    /**
     * Configure mPDF for Arabic (RTL shaping) output.
     *
     * @param  array{0: float, 1: float}|string  $format
     */
    public function makePdf(array|string $format = 'A4'): Mpdf
    {
        $pdf = new Mpdf([
            'mode' => 'utf-8',
            'format' => $format,
            'margin_left' => 4,
            'margin_right' => 4,
            'margin_top' => 4,
            'margin_bottom' => 4,
            'default_font' => 'dejavusans',
            'tempDir' => storage_path('app/mpdf'),
            'autoScriptToLang' => true,
            'autoLangToFont' => true,
        ]);
        $pdf->SetDirectionality('rtl');

        return $pdf;
    }
}
