<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class BulkTemplateExport implements FromArray, ShouldAutoSize, WithHeadings, WithStyles
{
    /**
     * Column headings, in order, expected by the bulk importer.
     *
     * @var list<string>
     */
    public const HEADINGS = ['اسم المستلم', 'جوال المستلم', 'المدينة', 'الحي', 'الشارع', 'العنوان الوطني', 'الوزن (كجم)', 'عدد القطع', 'المحتوى', 'مبلغ الدفع عند الاستلام', 'رقم الطلب', 'ملاحظات'];

    /**
     * @return list<string>
     */
    public function headings(): array
    {
        return self::HEADINGS;
    }

    /**
     * @return list<list<string|int|float>>
     */
    public function array(): array
    {
        return [
            ['محمد العتيبي', '0551234567', 'الرياض', 'النرجس', 'شارع الأمير سلطان', 'RRRD2929', 1.5, 1, 'ملابس', 250, '10045', ''],
            ['سارة الغامدي', '0569876543', 'جدة', 'الروضة', 'شارع التحلية', '', 0.8, 1, 'عطور', 0, '10046', 'الاتصال قبل التوصيل'],
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
