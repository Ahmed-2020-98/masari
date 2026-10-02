import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/format.dart';
import '../../core/models.dart';
import '../../core/theme.dart';
import '../../core/widgets.dart';

class ShipmentTile extends StatelessWidget {
  const ShipmentTile(this.shipment, {super.key});
  final Shipment shipment;

  @override
  Widget build(BuildContext context) {
    final carrier = shipment.carrier;
    return SectionCard(
      onTap: () => context.push('/shipments/${shipment.id}'),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          if (carrier != null) CarrierMark(carrier, size: 38),
          const SizedBox(width: 12),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(shipment.awb ?? shipment.reference, textDirection: TextDirection.ltr, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15, letterSpacing: .3)),
              Text('${carrier?.name ?? ''} · ${formatShort(shipment.createdAt)}', style: const TextStyle(color: Brand.inkSubtle, fontSize: 12.5)),
            ]),
          ),
          StatusBadge(shipment.status),
        ]),
        const SizedBox(height: 12),
        Row(children: [
          const Icon(Icons.person_outline_rounded, size: 18, color: Brand.inkSubtle),
          const SizedBox(width: 6),
          Expanded(child: Text('${shipment.recipientName} · ${shipment.recipientCity}', maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w600))),
          if (shipment.isCod) ...[const Icon(Icons.payments_outlined, size: 17, color: Brand.amber), const SizedBox(width: 4), Text(shipment.cod.formatted, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13, color: Brand.amber))],
        ]),
      ]),
    );
  }
}
