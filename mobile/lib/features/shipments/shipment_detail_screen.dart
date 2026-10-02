import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/api.dart';
import '../../core/format.dart';
import '../../core/models.dart';
import '../../core/theme.dart';
import '../../core/widgets.dart';
import '../auth/auth_controller.dart';
import '../home/home_screen.dart';

final shipmentProvider = FutureProvider.autoDispose.family<Shipment, String>((ref, id) async => Shipment((await ref.read(apiProvider).get('merchant/shipments/$id'))['data'] as Json));

class ShipmentDetailScreen extends ConsumerWidget {
  const ShipmentDetailScreen({super.key, required this.id});
  final String id;

  Future<void> _cancel(BuildContext context, WidgetRef ref, Shipment shipment) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('إلغاء الشحنة؟'),
        content: Text('سيتم إلغاء البوليصة لدى ${shipment.carrier?.name} واسترداد ${shipment.total.formatted} إلى محفظتك.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('تراجع')),
          TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('نعم، إلغاء', style: TextStyle(color: Brand.rose, fontWeight: FontWeight.w800))),
        ],
      ),
    );
    if (confirmed != true) return;
    try {
      await ref.read(apiProvider).post('merchant/shipments/$id/cancel');
      ref.invalidate(shipmentProvider(id));
      ref.invalidate(dashboardProvider);
      await ref.read(authProvider.notifier).refresh();
      if (context.mounted) showSnack(context, 'تم إلغاء الشحنة واسترداد المبلغ.');
    } on ApiError catch (error) {
      if (context.mounted) showSnack(context, error.message, error: true);
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(shipmentProvider(id));

    return Scaffold(
      appBar: AppBar(title: const Text('تفاصيل الشحنة')),
      body: async.when(
        loading: () => ListView(padding: const EdgeInsets.all(16), children: const [Skeleton(height: 130), SizedBox(height: 12), Skeleton(height: 260)]),
        error: (error, _) => ErrorState('$error', onRetry: () => ref.invalidate(shipmentProvider(id))),
        data: (shipment) => RefreshIndicator(
          color: Brand.green,
          onRefresh: () async => ref.invalidate(shipmentProvider(id)),
          child: ListView(padding: const EdgeInsets.fromLTRB(16, 4, 16, 40), children: [
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(color: Brand.navy, borderRadius: BorderRadius.circular(20)),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Row(children: [
                  if (shipment.carrier != null) CarrierMark(shipment.carrier!, size: 46),
                  const SizedBox(width: 12),
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(shipment.awb ?? '—', textDirection: TextDirection.ltr, style: const TextStyle(color: Colors.white, fontSize: 19, fontWeight: FontWeight.w900, letterSpacing: .6)),
                    Text('${shipment.carrier?.name ?? ''} · ${shipment.serviceName ?? ''}', style: const TextStyle(color: Colors.white60, fontSize: 13)),
                  ])),
                  IconButton(
                    icon: const Icon(Icons.copy_rounded, color: Colors.white70, size: 20),
                    tooltip: 'نسخ رقم التتبع',
                    onPressed: () {
                      Clipboard.setData(ClipboardData(text: shipment.awb ?? ''));
                      showSnack(context, 'تم نسخ رقم التتبع');
                    },
                  ),
                ]),
                const SizedBox(height: 14),
                Row(children: [
                  StatusBadge(shipment.status),
                  const SizedBox(width: 10),
                  Expanded(child: Text('${shipment.senderCity}  ←  ${shipment.recipientCity}', style: const TextStyle(color: Colors.white70, fontWeight: FontWeight.w600))),
                ]),
              ]),
            ),
            const SizedBox(height: 12),
            Row(children: [
              Expanded(child: OutlinedButton.icon(onPressed: () => launchUrl(Uri.parse(shipment.trackingUrl), mode: LaunchMode.externalApplication), icon: const Icon(Icons.open_in_new_rounded, size: 18), label: const Text('صفحة التتبع'))),
              if (shipment.isCancellable) ...[
                const SizedBox(width: 10),
                Expanded(child: OutlinedButton.icon(onPressed: () => _cancel(context, ref, shipment), style: OutlinedButton.styleFrom(foregroundColor: Brand.rose, side: const BorderSide(color: Color(0xFFFECDD3))), icon: const Icon(Icons.cancel_outlined, size: 18), label: const Text('إلغاء الشحنة'))),
              ],
            ]),
            if (shipment.isCod) ...[
              const SizedBox(height: 12),
              SectionCard(child: Row(children: [
                const Icon(Icons.payments_rounded, color: Brand.amber),
                const SizedBox(width: 10),
                const Text('الدفع عند الاستلام', style: TextStyle(fontWeight: FontWeight.w700)),
                const Spacer(),
                Text(shipment.cod.formatted, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 17)),
                const SizedBox(width: 8),
                StatusBadge(shipment.codStatus),
              ])),
            ],
            const SizedBox(height: 18),
            const Text('سجل التتبع', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 17)),
            const SizedBox(height: 10),
            SectionCard(child: Column(children: [for (var i = 0; i < shipment.events.length; i++) _TimelineRow(event: shipment.events[i], first: i == 0, last: i == shipment.events.length - 1)])),
            const SizedBox(height: 18),
            const Text('المستلم', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 17)),
            const SizedBox(height: 10),
            SectionCard(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(shipment.recipientName, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                const SizedBox(height: 4),
                Row(children: [
                  Text(formatPhone(shipment.recipientPhone), textDirection: TextDirection.ltr, style: const TextStyle(color: Brand.inkMuted)),
                  const Spacer(),
                  IconButton(visualDensity: VisualDensity.compact, onPressed: () => launchUrl(Uri.parse('tel:${shipment.recipientPhone}')), icon: const Icon(Icons.call_rounded, color: Brand.green700)),
                ]),
                Text(shipment.recipientCity, style: const TextStyle(color: Brand.inkMuted)),
              ]),
            ),
            const SizedBox(height: 18),
            const Text('التكلفة', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 17)),
            const SizedBox(height: 10),
            SectionCard(
              child: Column(children: [
                _line('الشحن', shipment.price.formatted),
                _line('ضريبة القيمة المضافة (15%)', shipment.vat.formatted),
                const Divider(height: 24),
                _line('الإجمالي المخصوم', shipment.total.formatted, bold: true),
                const SizedBox(height: 8),
                _line('الوزن المحتسب', '${shipment.chargeableKg} كجم'),
                _line('النطاق', shipment.zone),
              ]),
            ),
          ]),
        ),
      ),
    );
  }

  Widget _line(String label, String value, {bool bold = false}) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Row(children: [Text(label, style: TextStyle(color: bold ? Brand.navy : Brand.inkMuted, fontWeight: bold ? FontWeight.w800 : FontWeight.w500)), const Spacer(), Text(value, style: TextStyle(fontWeight: bold ? FontWeight.w900 : FontWeight.w700, fontSize: bold ? 17 : 14.5))]),
      );
}

class _TimelineRow extends StatelessWidget {
  const _TimelineRow({required this.event, required this.first, required this.last});
  final TrackingEvent event;
  final bool first;
  final bool last;

  @override
  Widget build(BuildContext context) => IntrinsicHeight(
        child: Row(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          SizedBox(
            width: 26,
            child: Column(children: [
              const SizedBox(height: 4),
              Container(width: 16, height: 16, decoration: BoxDecoration(color: first ? Brand.green : Brand.navy100, shape: BoxShape.circle, border: Border.all(color: first ? Brand.green50 : Colors.white, width: 3)), child: first ? null : null),
              if (!last) Expanded(child: Container(width: 2, color: Brand.mist)),
            ]),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Padding(
              padding: EdgeInsets.only(bottom: last ? 0 : 18),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(event.description, style: TextStyle(fontWeight: first ? FontWeight.w800 : FontWeight.w600)),
                if (event.location != null) Text(event.location!, style: const TextStyle(color: Brand.inkSubtle, fontSize: 13)),
                Text(formatDateTime(event.occurredAt), style: const TextStyle(color: Brand.inkSubtle, fontSize: 12)),
              ]),
            ),
          ),
        ]),
      );
}
