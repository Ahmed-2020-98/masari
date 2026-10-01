@php
    $sender = $shipment->sender;
    $recipient = $shipment->recipient;
@endphp
<style>
    body { font-family: dejavusans; font-size: 9pt; color: #0F2741; }
    table { width: 100%; border-collapse: collapse; }
    td { vertical-align: top; }
    .box { border: 1.2px solid #0F2741; padding: 6px; }
    .muted { color: #4B5563; font-size: 7.5pt; }
    .title { font-size: 8pt; color: #00A576; font-weight: bold; }
    .big { font-size: 13pt; font-weight: bold; }
    .cod { background: #0F2741; color: #fff; text-align: center; padding: 6px; font-size: 12pt; font-weight: bold; }
    .ltr { direction: ltr; text-align: left; }
</style>

<table>
    <tr>
        <td class="big" style="color:#00A576">مساري</td>
        <td class="ltr big">{{ $shipment->carrier->name_en }}</td>
    </tr>
</table>

<div class="box" style="text-align:center; margin-top:4px;">
    <img src="{{ $barcode }}" style="height:16mm; width:80mm;" />
    <div class="ltr" style="text-align:center; font-size:12pt; font-weight:bold; letter-spacing:2px;">{{ $shipment->awb }}</div>
</div>

<table style="margin-top:4px;">
    <tr>
        <td class="box" style="width:50%">
            <div class="title">المرسل</div>
            <div><b>{{ $sender['name'] }}</b></div>
            <div dir="ltr" style="text-align:right">{{ $sender['phone'] }}</div>
            <div>{{ $shipment->originCity->name_ar }} - {{ $sender['district'] ?? '' }}</div>
        </td>
        <td class="box" style="width:50%">
            <div class="title">الخدمة</div>
            <div>{{ $shipment->carrierService->name_ar }}</div>
            <div class="muted">الوزن: {{ $shipment->chargeable_weight_kg }} كجم · القطع: {{ $shipment->pieces }}</div>
            <div class="muted">المرجع: <span class="ltr">{{ $shipment->reference }}</span></div>
        </td>
    </tr>
</table>

<div class="box" style="margin-top:4px;">
    <div class="title">المستلم</div>
    <div class="big">{{ $recipient['name'] }}</div>
    <div dir="ltr" style="text-align:right; font-size:11pt;">{{ $recipient['phone'] }}</div>
    <div style="font-size:11pt;"><b>{{ $shipment->destinationCity->name_ar }}</b> - {{ $recipient['district'] ?? '' }}</div>
    <div>{{ $recipient['street'] ?? '' }} {{ $recipient['building_no'] ?? '' }}</div>
    @if (! empty($recipient['short_address']))
        <div class="muted">العنوان الوطني: <span class="ltr">{{ $recipient['short_address'] }}</span></div>
    @endif
</div>

@if ($shipment->cod_amount > 0)
    <div class="cod" style="margin-top:4px;">الدفع عند الاستلام: {{ number_format($shipment->cod_amount / 100, 2) }} ر.س</div>
@else
    <div class="box" style="margin-top:4px; text-align:center; font-weight:bold;">مدفوعة مسبقاً</div>
@endif

<table style="margin-top:4px;">
    <tr>
        <td class="muted">المحتوى: {{ $shipment->contents ?: '—' }}</td>
        <td class="muted ltr">{{ $shipment->created_at->format('Y-m-d H:i') }}</td>
    </tr>
    @if ($shipment->order_number)
        <tr><td class="muted" colspan="2">رقم الطلب: <span class="ltr">{{ $shipment->order_number }}</span></td></tr>
    @endif
</table>
