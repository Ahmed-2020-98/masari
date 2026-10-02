import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api.dart';
import '../../core/models.dart';
import '../../core/theme.dart';
import '../../core/widgets.dart';
import 'shipment_tile.dart';

const _tabs = [
  ('', 'الكل', <String, dynamic>{}),
  ('created', 'بانتظار الاستلام', {'filter[status]': 'created'}),
  ('transit', 'في الطريق', {'filter[in_transit]': 1}),
  ('delivered', 'تم التوصيل', {'filter[status]': 'delivered'}),
  ('failed', 'محاولة فاشلة', {'filter[status]': 'failed_attempt'}),
  ('returned', 'مرتجع', {'filter[status]': 'returned'}),
  ('cancelled', 'ملغاة', {'filter[status]': 'cancelled'}),
];

class ShipmentsScreen extends ConsumerStatefulWidget {
  const ShipmentsScreen({super.key});

  @override
  ConsumerState<ShipmentsScreen> createState() => _ShipmentsScreenState();
}

class _ShipmentsScreenState extends ConsumerState<ShipmentsScreen> {
  final _scroll = ScrollController();
  final _search = TextEditingController();
  final List<Shipment> _items = [];
  int _tab = 0;
  int _page = 0;
  int _last = 1;
  bool _loading = false;
  String? _error;
  String _term = '';

  @override
  void initState() {
    super.initState();
    _scroll.addListener(() {
      if (_scroll.position.pixels > _scroll.position.maxScrollExtent - 300) _load();
    });
    _load(reset: true);
  }

  @override
  void dispose() {
    _scroll.dispose();
    _search.dispose();
    super.dispose();
  }

  Future<void> _load({bool reset = false}) async {
    if (_loading || (!reset && _page >= _last)) return;
    setState(() {
      _loading = true;
      _error = null;
      if (reset) {
        _page = 0;
        _last = 1;
        _items.clear();
      }
    });
    try {
      final response = await ref.read(apiProvider).get('merchant/shipments', query: {..._tabs[_tab].$3, if (_term.isNotEmpty) 'filter[search]': _term, 'page': _page + 1, 'per_page': 15});
      final meta = response['meta'] as Json;
      setState(() {
        _items.addAll([for (final item in (response['data'] as List)) Shipment(item as Json)]);
        _page = (meta['current_page'] as num).toInt();
        _last = (meta['last_page'] as num).toInt();
      });
    } on ApiError catch (error) {
      setState(() => _error = error.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('الشحنات')),
        body: Column(children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
            child: TextField(
              controller: _search,
              textInputAction: TextInputAction.search,
              onSubmitted: (value) {
                _term = value.trim();
                _load(reset: true);
              },
              decoration: InputDecoration(
                hintText: 'رقم التتبع، الجوال أو رقم الطلب',
                prefixIcon: const Icon(Icons.search_rounded),
                suffixIcon: _term.isEmpty ? null : IconButton(icon: const Icon(Icons.close_rounded), onPressed: () { _search.clear(); _term = ''; _load(reset: true); }),
              ),
            ),
          ),
          SizedBox(
            height: 44,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: _tabs.length,
              separatorBuilder: (_, _) => const SizedBox(width: 8),
              itemBuilder: (context, index) => ChoiceChip(
                label: Text(_tabs[index].$2),
                selected: _tab == index,
                showCheckmark: false,
                selectedColor: Brand.navy,
                labelStyle: TextStyle(fontWeight: FontWeight.w700, color: _tab == index ? Colors.white : Brand.navy),
                side: const BorderSide(color: Brand.mist),
                backgroundColor: Colors.white,
                onSelected: (_) {
                  setState(() => _tab = index);
                  _load(reset: true);
                },
              ),
            ),
          ),
          const SizedBox(height: 8),
          Expanded(
            child: RefreshIndicator(
              color: Brand.green,
              onRefresh: () => _load(reset: true),
              child: _items.isEmpty && !_loading
                  ? ListView(children: [SizedBox(height: 380, child: _error != null ? ErrorState(_error!, onRetry: () => _load(reset: true)) : const EmptyState(icon: Icons.search_off_rounded, title: 'لا توجد شحنات', subtitle: 'جرّب تغيير الفلتر أو البحث.'))])
                  : ListView.separated(
                      controller: _scroll,
                      physics: const AlwaysScrollableScrollPhysics(),
                      padding: const EdgeInsets.fromLTRB(16, 4, 16, 110),
                      itemCount: _items.length + (_loading || _page < _last ? 1 : 0),
                      separatorBuilder: (_, _) => const SizedBox(height: 10),
                      itemBuilder: (context, index) => index < _items.length ? ShipmentTile(_items[index]) : const Padding(padding: EdgeInsets.all(16), child: Center(child: CircularProgressIndicator(color: Brand.green))),
                    ),
            ),
          ),
        ]),
      );
}
