<?php

namespace App\Exports;

use App\Models\Shipment;
use Illuminate\Database\Eloquent\Builder;
use Maatwebsite\Excel\Concerns\FromQuery;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class ShipmentsExport implements FromQuery, ShouldAutoSize, WithHeadings, WithMapping, WithStyles
{
    /**
     * @param  Builder<Shipment>  $query
     */
    public function __construct(private Builder $query) {}

    /**
     * @return Builder<Shipment>
     */
    public function query(): Builder
    {
        return $this->query;
    }

    /**
     * @return list<string>
     */
    public function headings(): array
    {
        return ['المرجع', 'رقم التتبع', 'الحالة', 'شركة الشحن', 'المستلم', 'الجوال', 'المدينة', 'الوزن', 'الدفع عند الاستلام', 'التكلفة', 'رقم الطلب', 'التاريخ'];
    }

    /**
     * @param  Shipment  $shipment
     * @return list<string|float|null>
     */
    public function map($shipment): array
    {
        return [
            $shipment->reference,
            $shipment->awb,
            $shipment->status->label(),
            $shipment->carrier->name_ar,
            $shipment->recipient['name'],
            $shipment->recipient['phone'],
            $shipment->recipient['city'] ?? '',
            (float) $shipment->chargeable_weight_kg,
            $shipment->cod_amount / 100,
            $shipment->total / 100,
            $shipment->order_number,
            $shipment->created_at->format('Y-m-d H:i'),
        ];
    }

    /**
     * @return array<string, mixed>|null
     */
    public function styles(Worksheet $sheet): ?array
    {
        $sheet->setRightToLeft(true);
        $sheet->getStyle('A1:L1')->getFont()->setBold(true);

        return null;
    }
}
