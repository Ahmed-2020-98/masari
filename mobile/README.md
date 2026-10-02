# مساري — تطبيق الجوال (Flutter)

تطبيق التاجر لمنصة مساري. يتصل بنفس Laravel API (`/api/v1`) برمز Sanctum خاص بكل جهاز، ويخزّنه في Keychain / Keystore.

**الشاشات:** تسجيل الدخول، إنشاء حساب (جوال ← OTP ← بيانات المتجر)، الرئيسية (مؤشرات ورسم بياني)، الشحنات (فلترة وبحث وتمرير لانهائي)، تفاصيل الشحنة (سجل التتبع وإلغاء)، إنشاء شحنة (4 خطوات مع مقارنة الشركات)، المحفظة (كشف حساب وشحن بالبطاقة)، الإشعارات، حسابي.

**التقنيات:** Flutter 3.47 · Riverpod 3 · go_router · Dio · flutter_secure_storage · fl_chart · google_fonts (Tajawal) · RTL عربي.

## التشغيل

```bash
cd mobile
flutter pub get
open -a Simulator
flutter run -d <simulator-id>                                  # iOS: http://127.0.0.1:8010/api/v1
flutter run --dart-define=API_URL=https://api.example.com/api/v1  # خادم آخر
```

Android emulator يستخدم `10.0.2.2:8010` تلقائياً. الخادم المحلي: `cd backend && php artisan serve --port=8010`.

حساب تجريبي: `0500000000` / `password123` (رمز OTP دائماً `1111` خارج الإنتاج).

## الاختبار

```bash
flutter analyze
flutter test integration_test/app_test.dart -d <simulator-id>   # دخول ← إنشاء شحنة كاملة على الـ API المحلي
```

## وضع التطوير (debug فقط)

ملف `<tmp التطبيق>/masari_dev.json` بالشكل `{"phone":"…","password":"…","route":"/wallet"}` يسجّل الدخول تلقائياً ويفتح مساراً محدداً (`lib/core/dev_config.dart`). يُتجاهل تماماً في نسخ release.

## غير مكتمل بعد

- استقبال الإشعارات الفورية (Push): الـ API جاهز (`POST me/device-tokens`) والتطبيق لا يسجّل رمز FCM بعد.
- تنزيل / طباعة بوليصة الشحن PDF (يحتاج رابطاً موقّعاً من الـ API).
- أيقونة التطبيق وشاشة البداية الأصلية (الافتراضية حالياً).
- الدفع عند الاستلام، المرتجعات، الاستلام من المستودع، الفريق، الربط: متاحة على الويب فقط حالياً.
