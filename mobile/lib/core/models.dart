import 'api.dart';

class Money {
  const Money(this.amount, this.value, this.formatted);

  factory Money.from(dynamic json) {
    if (json is! Map) return const Money(0, 0, '0.00 ر.س');
    return Money((json['amount'] as num).toInt(), (json['value'] as num).toDouble(), json['formatted'] as String);
  }

  final int amount;
  final double value;
  final String formatted;
}

/// `{ value, label, color }` — every enum the API returns, so labels and colors are never duplicated client-side.
class Enm {
  const Enm(this.value, this.label, this.color);

  static Enm? maybe(dynamic json) => json is Map ? Enm('${json['value']}', '${json['label']}', '${json['color']}') : null;
  factory Enm.from(dynamic json) => maybe(json) ?? const Enm('', '—', 'gray');

  final String value;
  final String label;
  final String color;
}

class Carrier {
  const Carrier({required this.id, required this.code, required this.name, this.brandColor});

  factory Carrier.from(dynamic json) => Carrier(id: (json['id'] as num).toInt(), code: '${json['code']}', name: '${json['name']}', brandColor: json['brand_color'] as String?);

  final int id;
  final String code;
  final String name;
  final String? brandColor;
}

class TrackingEvent {
  const TrackingEvent(this.status, this.description, this.location, this.occurredAt);

  factory TrackingEvent.from(Json json) => TrackingEvent(Enm.from(json['status']), '${json['description']}', json['location'] as String?, DateTime.parse('${json['occurred_at']}').toLocal());

  final Enm status;
  final String description;
  final String? location;
  final DateTime occurredAt;
}

class Shipment {
  Shipment(this.json)
      : id = '${json['id']}',
        awb = json['awb'] as String?,
        reference = '${json['reference']}',
        status = Enm.from(json['status']),
        carrier = json['carrier'] is Map ? Carrier.from(json['carrier']) : null,
        recipientName = '${(json['recipient'] as Map)['name']}',
        recipientPhone = '${(json['recipient'] as Map)['phone']}',
        recipientCity = '${(json['recipient'] as Map)['city'] ?? ''}',
        senderCity = '${(json['sender'] as Map)['city'] ?? ''}',
        cod = Money.from((json['cod'] as Map)['amount']),
        codStatus = Enm.maybe((json['cod'] as Map)['status']),
        total = Money.from(json['total']),
        price = Money.from(json['price']),
        vat = Money.from(json['vat']),
        isCancellable = json['is_cancellable'] == true,
        trackingUrl = '${json['tracking_url']}',
        createdAt = DateTime.parse('${json['created_at']}').toLocal(),
        events = [for (final event in (json['events'] as List? ?? const [])) TrackingEvent.from(event as Json)];

  final Json json;
  final String id;
  final String? awb;
  final String reference;
  final Enm status;
  final Carrier? carrier;
  final String recipientName;
  final String recipientPhone;
  final String recipientCity;
  final String senderCity;
  final Money cod;
  final Enm? codStatus;
  final Money total;
  final Money price;
  final Money vat;
  final bool isCancellable;
  final String trackingUrl;
  final DateTime createdAt;
  final List<TrackingEvent> events;

  bool get isCod => cod.amount > 0;
  double get weightKg => (json['weight_kg'] as num).toDouble();
  double get chargeableKg => (json['chargeable_weight_kg'] as num).toDouble();
  String? get contents => json['contents'] as String?;
  String? get serviceName => (json['service'] as Map?)?['name'] as String?;
  String get zone => '${(json['zone'] as Map)['label']}';
}

class City {
  const City(this.id, this.name, this.nameEn, this.regionName, this.isRemote);

  final int id;
  final String name;
  final String nameEn;
  final String regionName;
  final bool isRemote;
}

class Quote {
  Quote(this.json)
      : serviceId = (json['carrier_service_id'] as num).toInt(),
        carrier = Carrier.from(json['carrier']),
        serviceName = '${(json['service'] as Map)['name']}',
        etaLabel = '${(json['eta'] as Map)['label']}',
        total = Money.from(json['total']),
        shipping = Money.from(json['shipping']),
        codFee = Money.from(json['cod_fee']),
        vat = Money.from(json['vat']),
        cheapest = json['is_cheapest'] == true,
        fastest = json['is_fastest'] == true;

  final Json json;
  final int serviceId;
  final Carrier carrier;
  final String serviceName;
  final String etaLabel;
  final Money total;
  final Money shipping;
  final Money codFee;
  final Money vat;
  final bool cheapest;
  final bool fastest;
}

class Address {
  Address(this.json)
      : id = (json['id'] as num).toInt(),
        label = (json['label'] ?? json['name']) as String,
        cityId = (json['city_id'] as num).toInt(),
        cityName = (json['city'] as Map?)?['name'] as String? ?? '',
        district = json['district'] as String? ?? '',
        isDefault = json['is_default'] == true;

  final Json json;
  final int id;
  final String label;
  final int cityId;
  final String cityName;
  final String district;
  final bool isDefault;
}

class WalletTx {
  WalletTx(Json json)
      : type = Enm.from(json['type']),
        amount = Money.from(json['amount']),
        balanceAfter = Money.from(json['balance_after']),
        description = '${json['description']}',
        createdAt = DateTime.parse('${json['created_at']}').toLocal();

  final Enm type;
  final Money amount;
  final Money balanceAfter;
  final String description;
  final DateTime createdAt;
}
