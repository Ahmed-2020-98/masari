<style>
    body { font-family: dejavusans; font-size: 9pt; color: #1F2937; }
    h1 { color: #0F2741; font-size: 18pt; margin: 0; }
    .brand { color: #00A576; font-size: 20pt; font-weight: bold; }
    table { width: 100%; border-collapse: collapse; }
    .grid th { background: #0F2741; color: #fff; padding: 6px; font-weight: normal; }
    .grid td { border-bottom: 1px solid #E5E7EB; padding: 5px; }
    .muted { color: #6B7280; }
    .ltr { direction: ltr; }
    .totals td { padding: 5px; }
    .total-row td { background: #E6F9F3; font-weight: bold; color: #0F2741; }
</style>

<table>
    <tr>
        <td><span class="brand">مساري</span><br><span class="muted">كل شحناتك في مكان واحد</span></td>
        <td style="text-align:left"><h1>فاتورة ضريبية مبسطة</h1><span class="muted ltr">{{ $number }}</span></td>
    </tr>
</table>

<table style="margin-top:14px;">
    <tr>
        <td style="width:50%">
            <b>المورد:</b> شركة مساري للخدمات اللوجستية<br>
            <span class="muted">الرقم الضريبي: 310000000000003</span><br>
            <span class="muted">الرياض، المملكة العربية السعودية</span>
        </td>
        <td style="width:50%">
            <b>العميل:</b> {{ $merchant->store_name }}<br>
            @if ($merchant->vat_number)<span class="muted">الرقم الضريبي: {{ $merchant->vat_number }}</span><br>@endif
            <span class="muted">فترة الفاتورة: {{ $month->format('Y/m') }}</span>
        </td>
    </tr>
</table>

<table class="grid" style="margin-top:14px;">
    <thead>
        <tr><th>#</th><th>رقم التتبع</th><th>شركة الشحن</th><th>المدينة</th><th>التاريخ</th><th>المبلغ</th><th>الضريبة</th><th>الإجمالي</th></tr>
    </thead>
    <tbody>
        @foreach ($shipments as $shipment)
            <tr>
                <td>{{ $loop->iteration }}</td>
                <td class="ltr">{{ $shipment->awb }}</td>
                <td>{{ $shipment->carrier->name_ar }}</td>
                <td>{{ $shipment->recipient['city'] ?? '' }}</td>
                <td class="ltr">{{ $shipment->created_at->format('Y-m-d') }}</td>
                <td>{{ number_format($shipment->price / 100, 2) }}</td>
                <td>{{ number_format($shipment->vat / 100, 2) }}</td>
                <td>{{ number_format($shipment->total / 100, 2) }}</td>
            </tr>
        @endforeach
    </tbody>
</table>

<table class="totals" style="margin-top:14px; width:45%;">
    <tr><td>المجموع قبل الضريبة</td><td>{{ number_format($shipments->sum('price') / 100, 2) }} ر.س</td></tr>
    <tr><td>ضريبة القيمة المضافة (15%)</td><td>{{ number_format($shipments->sum('vat') / 100, 2) }} ر.س</td></tr>
    <tr class="total-row"><td>الإجمالي</td><td>{{ number_format($shipments->sum('total') / 100, 2) }} ر.س</td></tr>
</table>
