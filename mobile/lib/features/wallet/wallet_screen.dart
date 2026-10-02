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

final walletSummaryProvider = FutureProvider.autoDispose<Json>((ref) => ref.read(apiProvider).get('merchant/wallet'));

class WalletScreen extends ConsumerStatefulWidget {
  const WalletScreen({super.key});

  @override
  ConsumerState<WalletScreen> createState() => _WalletScreenState();
}

class _WalletScreenState extends ConsumerState<WalletScreen> with WidgetsBindingObserver {
  final _scroll = ScrollController();
  final List<WalletTx> _items = [];
  int _page = 0;
  int _last = 1;
  bool _loading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _scroll.addListener(() {
      if (_scroll.position.pixels > _scroll.position.maxScrollExtent - 300) _load();
    });
    _load(reset: true);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _scroll.dispose();
    super.dispose();
  }

  /// Returning from the payment page: refresh balance and ledger.
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) _refresh();
  }

  Future<void> _refresh() async {
    ref.invalidate(walletSummaryProvider);
    await ref.read(authProvider.notifier).refresh();
    await _load(reset: true);
  }

  Future<void> _load({bool reset = false}) async {
    if (_loading || (!reset && _page >= _last)) return;
    setState(() {
      _loading = true;
      _error = null;
      if (reset) {
        _page = 0;
        _last = 1;
      }
    });
    try {
      final response = await ref.read(apiProvider).get('merchant/wallet/transactions', query: {'page': _page + 1});
      final meta = response['meta'] as Json;
      setState(() {
        if (reset) _items.clear();
        _items.addAll([for (final item in (response['data'] as List)) WalletTx(item as Json)]);
        _page = (meta['current_page'] as num).toInt();
        _last = (meta['last_page'] as num).toInt();
      });
    } on ApiError catch (error) {
      setState(() => _error = error.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _topUp() async {
    final amount = await showModalBottomSheet<double>(context: context, isScrollControlled: true, backgroundColor: Colors.white, shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))), builder: (_) => const _TopUpSheet());
    if (amount == null || !mounted) return;
    try {
      final response = await ref.read(apiProvider).post('merchant/topups/card', body: {'amount': amount, 'redirect_url': 'https://masari-web-three.vercel.app/dashboard/wallet'});
      await launchUrl(Uri.parse(response['payment_url'] as String), mode: LaunchMode.externalApplication);
    } on ApiError catch (error) {
      if (mounted) showSnack(context, error.message, error: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final summary = ref.watch(walletSummaryProvider);
    final balance = ref.watch(authProvider).wallet;

    return Scaffold(
      appBar: AppBar(title: const Text('المحفظة')),
      body: RefreshIndicator(
        color: Brand.green,
        onRefresh: _refresh,
        child: ListView(controller: _scroll, physics: const AlwaysScrollableScrollPhysics(), padding: const EdgeInsets.fromLTRB(16, 4, 16, 110), children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(color: Brand.navy, borderRadius: BorderRadius.circular(22)),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Text('الرصيد المتاح', style: TextStyle(color: Colors.white70, fontWeight: FontWeight.w600)),
              const SizedBox(height: 6),
              Text(balance.formatted, style: TextStyle(color: balance.amount < 0 ? const Color(0xFFFDA4AF) : Colors.white, fontSize: 36, fontWeight: FontWeight.w900)),
              const SizedBox(height: 16),
              FilledButton.icon(onPressed: _topUp, icon: const Icon(Icons.add_rounded), label: const Text('شحن الرصيد'), style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(46))),
            ]),
          ),
          const SizedBox(height: 12),
          summary.maybeWhen(
            data: (data) {
              final last = data['last_30_days'] as Json;
              return Row(children: [
                Expanded(child: _flow('إيداعات 30 يوماً', Money.from(last['credits']).formatted, Icons.south_west_rounded, Brand.green700)),
                const SizedBox(width: 10),
                Expanded(child: _flow('مصروفات 30 يوماً', Money.from(last['debits']).formatted, Icons.north_east_rounded, Brand.rose)),
              ]);
            },
            orElse: () => const Skeleton(height: 72),
          ),
          const SizedBox(height: 20),
          const Text('كشف الحساب', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
          const SizedBox(height: 10),
          if (_error != null && _items.isEmpty) SizedBox(height: 260, child: ErrorState(_error!, onRetry: () => _load(reset: true))),
          if (_items.isEmpty && !_loading && _error == null) const SizedBox(height: 260, child: EmptyState(icon: Icons.receipt_long_outlined, title: 'لا توجد عمليات')),
          for (final tx in _items) _TxTile(tx),
          if (_loading) const Padding(padding: EdgeInsets.all(20), child: Center(child: CircularProgressIndicator(color: Brand.green))),
        ]),
      ),
    );
  }

  Widget _flow(String label, String value, IconData icon, Color color) => SectionCard(
        padding: const EdgeInsets.all(14),
        child: Row(children: [
          Container(width: 36, height: 36, decoration: BoxDecoration(color: color.withValues(alpha: .1), borderRadius: BorderRadius.circular(10)), child: Icon(icon, color: color, size: 19)),
          const SizedBox(width: 10),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(label, style: const TextStyle(color: Brand.inkSubtle, fontSize: 11.5)), Text(value, style: TextStyle(fontWeight: FontWeight.w900, color: color, fontSize: 14.5))])),
        ]),
      );
}

class _TxTile extends StatelessWidget {
  const _TxTile(this.tx);
  final WalletTx tx;

  @override
  Widget build(BuildContext context) {
    final positive = tx.amount.amount > 0;
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: Brand.mist)),
      child: Row(children: [
        Container(width: 38, height: 38, decoration: BoxDecoration(color: (positive ? Brand.green : Brand.rose).withValues(alpha: .1), borderRadius: BorderRadius.circular(11)), child: Icon(positive ? Icons.add_rounded : Icons.remove_rounded, color: positive ? Brand.green700 : Brand.rose)),
        const SizedBox(width: 12),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(tx.type.label, style: const TextStyle(fontWeight: FontWeight.w800)),
          Text(tx.description, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Brand.inkSubtle, fontSize: 12.5)),
          Text(formatDateTime(tx.createdAt), style: const TextStyle(color: Brand.inkSubtle, fontSize: 11.5)),
        ])),
        Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
          Text('${positive ? '+' : ''}${tx.amount.formatted}', textDirection: TextDirection.ltr, style: TextStyle(fontWeight: FontWeight.w900, color: positive ? Brand.green700 : Brand.rose)),
          Text(tx.balanceAfter.formatted, style: const TextStyle(color: Brand.inkSubtle, fontSize: 11.5)),
        ]),
      ]),
    );
  }
}

class _TopUpSheet extends StatefulWidget {
  const _TopUpSheet();

  @override
  State<_TopUpSheet> createState() => _TopUpSheetState();
}

class _TopUpSheetState extends State<_TopUpSheet> {
  final _amount = TextEditingController(text: '500');

  @override
  void dispose() {
    _amount.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Padding(
        padding: EdgeInsets.fromLTRB(20, 20, 20, 20 + MediaQuery.of(context).viewInsets.bottom),
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('شحن رصيد المحفظة', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 20)),
          const SizedBox(height: 4),
          const Text('الدفع بمدى أو البطاقة أو Apple Pay', style: TextStyle(color: Brand.inkMuted)),
          const SizedBox(height: 16),
          TextField(controller: _amount, autofocus: true, keyboardType: const TextInputType.numberWithOptions(decimal: true), inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[0-9.]'))], style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w900), decoration: const InputDecoration(labelText: 'المبلغ', suffixText: 'ر.س')),
          const SizedBox(height: 10),
          Wrap(spacing: 8, children: [for (final preset in [200, 500, 1000, 2500]) ActionChip(label: Text('$preset', style: const TextStyle(fontWeight: FontWeight.w800)), onPressed: () => setState(() => _amount.text = '$preset'))]),
          const SizedBox(height: 18),
          FilledButton(onPressed: () => Navigator.pop(context, double.tryParse(_amount.text)), child: const Text('الدفع الآن')),
        ]),
      );
}
