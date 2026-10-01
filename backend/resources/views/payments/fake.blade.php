<!doctype html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>الدفع التجريبي — مساري</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap" rel="stylesheet">
    <style>
        body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #F5F8FA; font-family: Tajawal, sans-serif; color: #0F2741; }
        .card { background: #fff; border: 1px solid #E5E7EB; border-radius: 20px; padding: 32px; width: min(420px, 90vw); box-shadow: 0 20px 40px -24px rgba(15,39,65,.35); }
        .badge { display: inline-block; background: #FEF3C7; color: #92400E; padding: 4px 10px; border-radius: 999px; font-size: 13px; }
        .amount { font-size: 40px; font-weight: 700; margin: 16px 0 4px; }
        .muted { color: #6B7280; font-size: 14px; }
        button { width: 100%; border: 0; border-radius: 12px; padding: 14px; font: inherit; font-weight: 700; cursor: pointer; margin-top: 12px; min-height: 48px; }
        .pay { background: #00C48C; color: #fff; }
        .fail { background: #fff; color: #BE123C; border: 1px solid #FECDD3; }
    </style>
</head>
<body>
<div class="card">
    <span class="badge">بوابة دفع تجريبية</span>
    <div class="amount">{{ number_format($topup->amount / 100, 2) }} <small>ر.س</small></div>
    <div class="muted">شحن رصيد محفظة مساري · طلب رقم {{ $topup->id }}</div>
    <form method="post" action="{{ route('payments.fake.complete', $topup) }}">
        <input type="hidden" name="redirect" value="{{ $redirect }}">
        <input type="hidden" name="signature" value="{{ $signature }}">
        <button class="pay" name="outcome" value="paid">إتمام الدفع بنجاح</button>
        <button class="fail" name="outcome" value="failed">محاكاة فشل الدفع</button>
    </form>
</div>
</body>
</html>
