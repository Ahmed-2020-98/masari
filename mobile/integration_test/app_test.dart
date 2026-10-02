import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:masari_app/main.dart';

/// End-to-end flow against the local API (demo merchant): login → create a shipment through the 4-step wizard.
/// Run: flutter test integration_test/app_test.dart -d SIMULATOR_ID
void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  Future<void> pumpUntil(WidgetTester tester, Finder finder, {Duration timeout = const Duration(seconds: 25)}) async {
    final end = DateTime.now().add(timeout);
    while (DateTime.now().isBefore(end)) {
      await tester.pump(const Duration(milliseconds: 250));
      if (finder.evaluate().isNotEmpty) return;
    }
    final texts = find.byType(Text).evaluate().map((e) => (e.widget as Text).data).whereType<String>().take(25).toList();
    throw TestFailure('Timed out waiting for $finder. Visible texts: $texts');
  }

  testWidgets('merchant logs in and creates a shipment', (tester) async {
    await initializeDateFormatting('en');
    await tester.pumpWidget(ProviderScope(retry: (_, _) => null, child: const MasariApp()));

    // Either the login form or (token restored from keychain) the home screen.
    await pumpUntil(tester, find.byWidgetPredicate((w) => w is Text && (w.data == 'تسجيل الدخول' || (w.data ?? '').startsWith('مرحباً،'))));

    if (find.text('أهلاً بعودتك').evaluate().isNotEmpty) {
      await tester.enterText(find.byType(TextField).at(0), '0500000000');
      await tester.enterText(find.byType(TextField).at(1), 'password123');
      await tester.tap(find.widgetWithText(FilledButton, 'تسجيل الدخول'));
    }

    // Home dashboard loaded with live data.
    await pumpUntil(tester, find.text('أحدث الشحنات'));
    expect(find.text('رصيد المحفظة'), findsOneWidget);

    // Open the wizard from the centre button.
    await tester.tap(find.byTooltip('شحنة جديدة'));
    await pumpUntil(tester, find.text('المستلم'));

    await tester.enterText(find.byType(TextField).at(0), 'سلطان القرني');
    await tester.enterText(find.byType(TextField).at(1), '0551234567');
    await tester.tap(find.text('اختر المدينة'));
    await pumpUntil(tester, find.text('ابحث عن مدينة').evaluate().isNotEmpty ? find.text('ابحث عن مدينة') : find.byType(ListTile));
    await tester.enterText(find.byType(TextField).last, 'جده'); // matches جدة (Arabic-normalized search)
    await pumpUntil(tester, find.widgetWithText(ListTile, 'جدة'));
    await tester.tap(find.widgetWithText(ListTile, 'جدة'));
    await tester.pumpAndSettle();

    await tester.tap(find.widgetWithText(FilledButton, 'التالي')); // → parcel
    await tester.pumpAndSettle();
    expect(find.text('الدفع عند الاستلام'), findsOneWidget);
    await tester.tap(find.widgetWithText(FilledButton, 'التالي')); // → carriers
    await pumpUntil(tester, find.text('شامل الضريبة'));

    final cheapest = find.textContaining('الأوفر').first;
    expect(cheapest, findsOneWidget);
    await tester.tap(find.text('شامل الضريبة').first);
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(FilledButton, 'التالي')); // → review
    await tester.pumpAndSettle();
    expect(find.textContaining('الإجمالي'), findsWidgets);

    await tester.tap(find.byWidgetPredicate((w) => w is FilledButton && w.child is Text && ((w.child as Text).data ?? '').startsWith('تأكيد ودفع')));
    await pumpUntil(tester, find.text('تم إنشاء الشحنة بنجاح'));
    expect(find.textContaining('تم خصم'), findsOneWidget);
  });
}
