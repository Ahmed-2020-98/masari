import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api.dart';
import '../../core/models.dart';
import '../../core/theme.dart';
import '../../core/widgets.dart';
import '../auth/auth_controller.dart';
import '../home/home_screen.dart';
import 'city_picker.dart';

final sendersProvider = FutureProvider.autoDispose<List<Address>>((ref) async {
  final response = await ref.read(apiProvider).get('merchant/addresses', query: {'type': 'sender'});
  return [for (final item in (response['data'] as List)) Address(item as Json)];
});

/// 4-step wizard: addresses → parcel → carrier comparison → review.
class CreateShipmentScreen extends ConsumerStatefulWidget {
  const CreateShipmentScreen({super.key});

  @override
  ConsumerState<CreateShipmentScreen> createState() => _CreateShipmentScreenState();
}

class _CreateShipmentScreenState extends ConsumerState<CreateShipmentScreen> {
  static const _titles = ['العناوين', 'تفاصيل الطرد', 'اختيار الشركة', 'المراجعة'];

  int _step = 0;
  int? _senderId;
  City? _city;
  final _name = TextEditingController();
  final _phone = TextEditingController();
  final _district = TextEditingController();
  final _weight = TextEditingController(text: '1');
  final _contents = TextEditingController();
  final _cod = TextEditingController();
  bool _isCod = false;
  Map<String, String> _errors = {};

  List<Quote> _quotes = [];
  Money? _wallet;
  int? _serviceId;
  bool _loading = false;
  Shipment? _created;

  ApiClient get _api => ref.read(apiProvider);

  @override
  void dispose() {
    for (final controller in [_name, _phone, _district, _weight, _contents, _cod]) {
      controller.dispose();
    }
    super.dispose();
  }

  Address? _sender(List<Address> senders) {
    final id = _senderId ?? (senders.isEmpty ? null : (senders.firstWhere((a) => a.isDefault, orElse: () => senders.first)).id);
    return senders.where((a) => a.id == id).firstOrNull;
  }

  bool _validate(List<Address> senders) {
    final errors = <String, String>{};
    if (_step == 0) {
      if (_sender(senders) == null) errors['sender'] = 'أضف عنوان المستودع من الموقع أولاً';
      if (_name.text.trim().isEmpty) errors['name'] = 'اسم المستلم مطلوب';
      if (!RegExp(r'^(\+?966|0)?5\d{8}$').hasMatch(_phone.text.replaceAll(' ', ''))) errors['phone'] = 'رقم جوال سعودي غير صحيح';
      if (_city == null) errors['city'] = 'اختر مدينة المستلم';
    }
    if (_step == 1) {
      final weight = double.tryParse(_weight.text) ?? 0;
      if (weight <= 0 || weight > 70) errors['weight'] = 'أدخل وزناً بين 0.1 و 70 كجم';
      if (_isCod && (double.tryParse(_cod.text) ?? 0) <= 0) errors['cod'] = 'أدخل مبلغ التحصيل';
    }
    if (_step == 2 && _serviceId == null) errors['service'] = 'اختر شركة الشحن';
    setState(() => _errors = errors);
    return errors.isEmpty;
  }

  Future<void> _loadQuotes(Address sender) async {
    setState(() {
      _loading = true;
      _quotes = [];
      _serviceId = null;
    });
    try {
      final response = await _api.post('merchant/quotes', body: {'origin_city_id': sender.cityId, 'destination_city_id': _city!.id, 'weight_kg': double.parse(_weight.text), 'cod_amount': _isCod ? double.parse(_cod.text) : 0});
      setState(() {
        _quotes = [for (final item in (response['data'] as List)) Quote(item as Json)];
        _wallet = Money.from(response['wallet']);
      });
    } on ApiError catch (error) {
      if (mounted) showSnack(context, error.message, error: true);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _next(List<Address> senders) async {
    FocusScope.of(context).unfocus();
    if (!_validate(senders)) return;
    final sender = _sender(senders)!;
    setState(() => _step++);
    if (_step == 2) await _loadQuotes(sender);
  }

  Future<void> _create(List<Address> senders) async {
    setState(() => _loading = true);
    try {
      final response = await _api.post('merchant/shipments', body: {
        'carrier_service_id': _serviceId,
        'sender_address_id': _sender(senders)!.id,
        'recipient': {'name': _name.text.trim(), 'phone': _phone.text.trim(), 'city_id': _city!.id, 'district': _district.text.trim()},
        'save_recipient': true,
        'weight_kg': double.parse(_weight.text),
        'contents': _contents.text.trim().isEmpty ? null : _contents.text.trim(),
        'cod_amount': _isCod ? double.parse(_cod.text) : 0,
      });
      ref.invalidate(dashboardProvider);
      await ref.read(authProvider.notifier).refresh();
      setState(() => _created = Shipment(response['data'] as Json));
    } on ApiError catch (error) {
      if (mounted) showSnack(context, error.message, error: true);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_created != null) return _Success(shipment: _created!, onAnother: () => context.pushReplacement('/shipments/new'));

    final sendersAsync = ref.watch(sendersProvider);
    final cities = ref.watch(citiesProvider);
    final senders = sendersAsync.value ?? const <Address>[];
    final quote = _quotes.where((q) => q.serviceId == _serviceId).firstOrNull;

    return Scaffold(
      appBar: AppBar(title: const Text('إنشاء شحنة')),
      body: Column(children: [
        _Progress(step: _step, titles: _titles),
        Expanded(
          child: sendersAsync.isLoading
              ? const Center(child: CircularProgressIndicator(color: Brand.green))
              : ListView(padding: const EdgeInsets.fromLTRB(16, 8, 16, 24), children: [
                  if (_step == 0) ..._stepAddresses(senders, cities),
                  if (_step == 1) ..._stepParcel(),
                  if (_step == 2) ..._stepQuotes(),
                  if (_step == 3 && quote != null) ..._stepReview(senders, quote),
                ]),
        ),
        SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
            child: Row(children: [
              if (_step > 0) SizedBox(width: 110, child: OutlinedButton(onPressed: _loading ? null : () => setState(() => _step--), child: const Text('السابق'))),
              if (_step > 0) const SizedBox(width: 10),
              Expanded(
                child: _step < 3
                    ? FilledButton(onPressed: _loading ? null : () => _next(senders), child: const Text('التالي'))
                    : FilledButton(
                        onPressed: _loading || quote == null ? null : () => _create(senders),
                        child: _loading ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2.5, color: Brand.navy)) : Text(quote == null ? 'تأكيد' : 'تأكيد ودفع ${quote.total.formatted}'),
                      ),
              ),
            ]),
          ),
        ),
      ]),
    );
  }

  List<Widget> _stepAddresses(List<Address> senders, AsyncValue<List<City>> cities) {
    final selected = _sender(senders);
    return [
      const Text('المرسل (المستودع)', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
      const SizedBox(height: 8),
      if (senders.isEmpty) SectionCard(child: Text(_errors['sender'] ?? 'لا يوجد عنوان مستودع. أضفه من الموقع ثم ارجع هنا.', style: const TextStyle(color: Brand.rose, fontWeight: FontWeight.w700))),
      for (final address in senders)
        Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: SectionCard(
            onTap: () => setState(() => _senderId = address.id),
            child: Row(children: [
              Icon(selected?.id == address.id ? Icons.radio_button_checked_rounded : Icons.radio_button_off_rounded, color: selected?.id == address.id ? Brand.green600 : Brand.inkSubtle),
              const SizedBox(width: 12),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(address.label, style: const TextStyle(fontWeight: FontWeight.w800)), Text('${address.cityName} · ${address.district}', style: const TextStyle(color: Brand.inkSubtle, fontSize: 13))])),
            ]),
          ),
        ),
      const SizedBox(height: 14),
      const Text('المستلم', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
      const SizedBox(height: 10),
      TextField(controller: _name, textInputAction: TextInputAction.next, decoration: InputDecoration(labelText: 'اسم المستلم', errorText: _errors['name'])),
      const SizedBox(height: 12),
      TextField(controller: _phone, keyboardType: TextInputType.phone, textDirection: TextDirection.ltr, textAlign: TextAlign.left, inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[0-9+ ]'))], decoration: InputDecoration(labelText: 'رقم الجوال', hintText: '05X XXX XXXX', errorText: _errors['phone'])),
      const SizedBox(height: 12),
      InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () async {
          final list = cities.value;
          if (list == null) return;
          final picked = await pickCity(context, list);
          if (picked != null) setState(() => _city = picked);
        },
        child: InputDecorator(
          decoration: InputDecoration(labelText: 'المدينة', errorText: _errors['city'], prefixIcon: const Icon(Icons.location_on_outlined), suffixIcon: const Icon(Icons.unfold_more_rounded)),
          child: Text(_city?.name ?? (cities.isLoading ? 'جارٍ التحميل…' : 'اختر المدينة'), style: TextStyle(color: _city == null ? Brand.inkSubtle : Brand.navy, fontWeight: FontWeight.w600)),
        ),
      ),
      const SizedBox(height: 12),
      TextField(controller: _district, decoration: const InputDecoration(labelText: 'الحي (اختياري)')),
    ];
  }

  List<Widget> _stepParcel() => [
        TextField(controller: _weight, keyboardType: const TextInputType.numberWithOptions(decimal: true), inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[0-9.]'))], decoration: InputDecoration(labelText: 'الوزن (كجم)', errorText: _errors['weight'])),
        const SizedBox(height: 12),
        TextField(controller: _contents, decoration: const InputDecoration(labelText: 'المحتوى (اختياري)', hintText: 'مثال: عطور')),
        const SizedBox(height: 16),
        SectionCard(
          padding: const EdgeInsets.fromLTRB(16, 6, 8, 12),
          child: Column(children: [
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              value: _isCod,
              activeThumbColor: Brand.navy,
              activeTrackColor: Brand.green,
              onChanged: (value) => setState(() => _isCod = value),
              title: const Text('الدفع عند الاستلام', style: TextStyle(fontWeight: FontWeight.w800)),
              subtitle: const Text('يحصّل المندوب المبلغ ويُضاف لمحفظتك.', style: TextStyle(fontSize: 12.5)),
            ),
            if (_isCod) Padding(padding: const EdgeInsets.only(left: 8, top: 4), child: TextField(controller: _cod, keyboardType: const TextInputType.numberWithOptions(decimal: true), inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[0-9.]'))], decoration: InputDecoration(labelText: 'مبلغ التحصيل (ر.س)', errorText: _errors['cod']))),
          ]),
        ),
      ];

  List<Widget> _stepQuotes() => [
        if (_loading) ...[for (var i = 0; i < 4; i++) const Padding(padding: EdgeInsets.only(bottom: 10), child: Skeleton(height: 84))],
        if (!_loading && _quotes.isEmpty) const SizedBox(height: 300, child: EmptyState(icon: Icons.local_shipping_outlined, title: 'لا توجد خدمات متاحة', subtitle: 'لا تغطي الشركات هذا المسار بهذا الوزن حالياً.')),
        for (final q in _quotes)
          Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: SectionCard(
              onTap: () => setState(() => _serviceId = q.serviceId),
              child: Row(children: [
                Icon(_serviceId == q.serviceId ? Icons.radio_button_checked_rounded : Icons.radio_button_off_rounded, color: _serviceId == q.serviceId ? Brand.green600 : Brand.inkSubtle),
                const SizedBox(width: 10),
                CarrierMark(q.carrier),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(q.carrier.name, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15.5)),
                    Text('${q.serviceName} · ${q.etaLabel}', style: const TextStyle(color: Brand.inkSubtle, fontSize: 12.5)),
                    if (q.cheapest || q.fastest) Wrap(spacing: 6, children: [if (q.cheapest) const Text('الأوفر', style: TextStyle(color: Brand.green700, fontWeight: FontWeight.w800, fontSize: 12)), if (q.fastest) const Text('الأسرع', style: TextStyle(color: Color(0xFF4F46E5), fontWeight: FontWeight.w800, fontSize: 12))]),
                  ]),
                ),
                Column(crossAxisAlignment: CrossAxisAlignment.end, children: [Text(q.total.formatted, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16)), const Text('شامل الضريبة', style: TextStyle(fontSize: 10.5, color: Brand.inkSubtle))]),
              ]),
            ),
          ),
        if (_errors['service'] != null) Text(_errors['service']!, style: const TextStyle(color: Brand.rose, fontWeight: FontWeight.w700)),
      ];

  List<Widget> _stepReview(List<Address> senders, Quote quote) {
    final sender = _sender(senders)!;
    final insufficient = _wallet != null && _wallet!.amount < quote.total.amount;
    return [
      SectionCard(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        _row('من', '${sender.label} · ${sender.cityName}'),
        const Divider(height: 22),
        _row('إلى', '${_name.text.trim()} · ${_city!.name}'),
        const Divider(height: 22),
        _row('الشركة', '${quote.carrier.name} · ${quote.serviceName}'),
        const Divider(height: 22),
        _row('الوزن', '${_weight.text} كجم'),
        if (_isCod) ...[const Divider(height: 22), _row('التحصيل', '${_cod.text} ر.س')],
      ])),
      const SizedBox(height: 12),
      SectionCard(child: Column(children: [
        _row('الشحن', quote.shipping.formatted, muted: true),
        if (quote.codFee.amount > 0) ...[const SizedBox(height: 8), _row('رسوم التحصيل', quote.codFee.formatted, muted: true)],
        const SizedBox(height: 8),
        _row('الضريبة (15%)', quote.vat.formatted, muted: true),
        const Divider(height: 22),
        _row('الإجمالي', quote.total.formatted, bold: true),
      ])),
      const SizedBox(height: 12),
      Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(color: insufficient ? const Color(0xFFFFF1F2) : Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: insufficient ? const Color(0xFFFECDD3) : Brand.mist)),
        child: Row(children: [
          Icon(Icons.account_balance_wallet_outlined, color: insufficient ? Brand.rose : Brand.inkSubtle),
          const SizedBox(width: 10),
          const Text('رصيد المحفظة', style: TextStyle(fontWeight: FontWeight.w600)),
          const Spacer(),
          Text(_wallet?.formatted ?? '', style: TextStyle(fontWeight: FontWeight.w900, color: insufficient ? Brand.rose : Brand.navy)),
        ]),
      ),
      if (insufficient) const Padding(padding: EdgeInsets.only(top: 8), child: Text('الرصيد غير كافٍ، اشحن محفظتك أولاً.', style: TextStyle(color: Brand.rose, fontWeight: FontWeight.w700))),
    ];
  }

  Widget _row(String label, String value, {bool bold = false, bool muted = false}) => Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(label, style: TextStyle(color: muted || !bold ? Brand.inkSubtle : Brand.navy, fontWeight: bold ? FontWeight.w800 : FontWeight.w600)),
        const SizedBox(width: 16),
        Expanded(child: Text(value, textAlign: TextAlign.end, style: TextStyle(fontWeight: bold ? FontWeight.w900 : FontWeight.w700, fontSize: bold ? 18 : 14.5))),
      ]);
}

class _Progress extends StatelessWidget {
  const _Progress({required this.step, required this.titles});
  final int step;
  final List<String> titles;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [for (var i = 0; i < titles.length; i++) Expanded(child: Container(height: 5, margin: const EdgeInsets.symmetric(horizontal: 2), decoration: BoxDecoration(color: i <= step ? Brand.green : Brand.mist, borderRadius: BorderRadius.circular(9))))]),
          const SizedBox(height: 10),
          Text('${step + 1} / ${titles.length}  ·  ${titles[step]}', style: const TextStyle(fontWeight: FontWeight.w800, color: Brand.inkMuted)),
        ]),
      );
}

class _Success extends StatelessWidget {
  const _Success({required this.shipment, required this.onAnother});
  final Shipment shipment;
  final VoidCallback onAnother;

  @override
  Widget build(BuildContext context) => Scaffold(
        body: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
              Container(width: 84, height: 84, decoration: const BoxDecoration(color: Brand.green, shape: BoxShape.circle), child: const Icon(Icons.check_rounded, size: 48, color: Brand.navy)),
              const SizedBox(height: 22),
              const Text('تم إنشاء الشحنة بنجاح', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w900)),
              const SizedBox(height: 6),
              Text('رقم التتبع لدى ${shipment.carrier?.name ?? ''}', style: const TextStyle(color: Brand.inkMuted)),
              const SizedBox(height: 6),
              Text(shipment.awb ?? '', textDirection: TextDirection.ltr, style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w900, letterSpacing: 1.5)),
              const SizedBox(height: 8),
              Text('تم خصم ${shipment.total.formatted} من محفظتك', style: const TextStyle(color: Brand.inkSubtle)),
              const SizedBox(height: 32),
              FilledButton(onPressed: () => context.pushReplacement('/shipments/${shipment.id}'), child: const Text('تفاصيل الشحنة')),
              const SizedBox(height: 10),
              OutlinedButton(onPressed: onAnother, child: const Text('إنشاء شحنة أخرى')),
              TextButton(onPressed: () => context.go('/'), child: const Text('العودة للرئيسية')),
            ]),
          ),
        ),
      );
}
