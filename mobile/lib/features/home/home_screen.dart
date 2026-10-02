import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api.dart';
import '../../core/models.dart';
import '../../core/theme.dart';
import '../../core/widgets.dart';
import '../auth/auth_controller.dart';
import '../shipments/shipment_tile.dart';

final dashboardProvider = FutureProvider.autoDispose<Json>((ref) => ref.read(apiProvider).get('merchant/dashboard'));

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authProvider);
    final dashboard = ref.watch(dashboardProvider);
    final name = '${auth.user['name'] ?? ''}'.split(' ').first;

    return Scaffold(
      appBar: AppBar(
        toolbarHeight: 68,
        title: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('${auth.merchant['store_name'] ?? ''}', style: const TextStyle(fontSize: 12.5, color: Brand.green700, fontWeight: FontWeight.w800)),
          Text('مرحباً، $name', style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900)),
        ]),
        actions: [
          Stack(alignment: Alignment.topLeft, children: [
            IconButton(onPressed: () => context.push('/notifications'), icon: const Icon(Icons.notifications_none_rounded, size: 28), tooltip: 'الإشعارات'),
            if (auth.unread > 0)
              Positioned(top: 6, left: 6, child: Container(padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1), decoration: BoxDecoration(color: Brand.rose, borderRadius: BorderRadius.circular(99)), child: Text(auth.unread > 9 ? '9+' : '${auth.unread}', textDirection: TextDirection.ltr, style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w800)))),
          ]),
          const SizedBox(width: 4),
        ],
      ),
      body: RefreshIndicator(
        color: Brand.green,
        onRefresh: () async {
          ref.invalidate(dashboardProvider);
          await ref.read(authProvider.notifier).refresh();
        },
        child: dashboard.when(
          loading: () => ListView(padding: const EdgeInsets.all(16), children: const [Skeleton(height: 150), SizedBox(height: 12), Skeleton(height: 70), SizedBox(height: 12), Skeleton(height: 70), SizedBox(height: 12), Skeleton(height: 200)]),
          error: (error, _) => ListView(children: [SizedBox(height: 400, child: ErrorState('$error', onRetry: () => ref.invalidate(dashboardProvider)))]),
          data: (data) => _Content(data: data),
        ),
      ),
    );
  }
}

class _Content extends ConsumerWidget {
  const _Content({required this.data});
  final Json data;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final kpis = data['kpis'] as Json;
    final chart = [for (final point in (data['chart'] as List)) (point as Json)];
    final latestRaw = data['latest'];
    final latest = [for (final item in (latestRaw is Map ? latestRaw['data'] : latestRaw) as List) Shipment(item as Json)];
    final maxY = chart.fold<double>(1, (max, point) => (point['total'] as num) > max ? (point['total'] as num).toDouble() : max);

    return ListView(padding: const EdgeInsets.fromLTRB(16, 4, 16, 110), children: [
      // Wallet card
      Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(color: Brand.navy, borderRadius: BorderRadius.circular(22), boxShadow: [BoxShadow(color: Brand.navy.withValues(alpha: .25), blurRadius: 24, offset: const Offset(0, 10))]),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            const Icon(Icons.account_balance_wallet_rounded, color: Brand.green, size: 20),
            const SizedBox(width: 8),
            const Text('رصيد المحفظة', style: TextStyle(color: Colors.white70, fontWeight: FontWeight.w600)),
            const Spacer(),
            InkWell(onTap: () => context.go('/wallet'), child: const Text('شحن الرصيد', style: TextStyle(color: Brand.green, fontWeight: FontWeight.w800))),
          ]),
          const SizedBox(height: 8),
          Text(Money.from(kpis['wallet']).formatted, style: const TextStyle(color: Colors.white, fontSize: 34, fontWeight: FontWeight.w900)),
          const SizedBox(height: 14),
          Row(children: [
            Expanded(child: _mini('تحصيل قيد التوريد', Money.from(kpis['cod_pending']).formatted)),
            Expanded(child: _mini('الإنفاق (30 يوم)', Money.from(kpis['spent_30d']).formatted)),
          ]),
        ]),
      ),
      const SizedBox(height: 14),
      GridView.count(
        crossAxisCount: 2,
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        mainAxisSpacing: 10,
        crossAxisSpacing: 10,
        childAspectRatio: 2.15,
        children: [
          KpiTile(label: 'إجمالي الشحنات', value: '${kpis['total']}', icon: Icons.local_shipping_rounded, tone: 'navy'),
          KpiTile(label: 'تم التوصيل', value: '${kpis['delivered']}', icon: Icons.check_circle_rounded),
          KpiTile(label: 'في الطريق', value: '${kpis['in_transit']}', icon: Icons.schedule_rounded, tone: 'amber'),
          KpiTile(label: 'مرتجعات', value: '${kpis['returned']}', icon: Icons.undo_rounded, tone: 'rose'),
        ],
      ),
      const SizedBox(height: 14),
      SectionCard(
        padding: const EdgeInsets.fromLTRB(8, 16, 16, 10),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Padding(padding: const EdgeInsets.only(right: 8, bottom: 14), child: Row(children: [const Text('حركة الشحنات', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)), const Spacer(), Text('آخر 30 يوماً', style: TextStyle(color: Brand.inkSubtle, fontSize: 12.5))])),
          SizedBox(
            height: 150,
            child: Directionality(
              textDirection: TextDirection.ltr,
              child: LineChart(LineChartData(
                minY: 0,
                maxY: maxY + 1,
                gridData: const FlGridData(drawVerticalLine: false),
                borderData: FlBorderData(show: false),
                titlesData: const FlTitlesData(show: false),
                lineTouchData: const LineTouchData(enabled: true),
                lineBarsData: [
                  LineChartBarData(spots: [for (var i = 0; i < chart.length; i++) FlSpot(i.toDouble(), (chart[i]['total'] as num).toDouble())], isCurved: true, preventCurveOverShooting: true, color: Brand.navy, barWidth: 2.5, dotData: const FlDotData(show: false), belowBarData: BarAreaData(show: true, color: Brand.navy.withValues(alpha: .08))),
                  LineChartBarData(spots: [for (var i = 0; i < chart.length; i++) FlSpot(i.toDouble(), (chart[i]['delivered'] as num).toDouble())], isCurved: true, preventCurveOverShooting: true, color: Brand.green, barWidth: 2.5, dotData: const FlDotData(show: false), belowBarData: BarAreaData(show: true, color: Brand.green.withValues(alpha: .12))),
                ],
              )),
            ),
          ),
        ]),
      ),
      const SizedBox(height: 18),
      Row(children: [
        const Text('أحدث الشحنات', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
        const Spacer(),
        TextButton(onPressed: () => context.go('/shipments'), child: const Text('عرض الكل', style: TextStyle(fontWeight: FontWeight.w800, color: Brand.green700))),
      ]),
      const SizedBox(height: 4),
      if (latest.isEmpty) const SizedBox(height: 220, child: EmptyState(icon: Icons.inventory_2_outlined, title: 'لا توجد شحنات بعد', subtitle: 'أنشئ أول شحنة وقارن أسعار جميع الشركات.')),
      for (final shipment in latest) Padding(padding: const EdgeInsets.only(bottom: 10), child: ShipmentTile(shipment)),
    ]);
  }

  Widget _mini(String label, String value) => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(label, style: const TextStyle(color: Colors.white54, fontSize: 12)), const SizedBox(height: 2), Text(value, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800))]);
}
