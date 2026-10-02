import 'package:flutter/material.dart';

import 'models.dart';
import 'theme.dart';

class MasariMark extends StatelessWidget {
  const MasariMark({super.key, this.height = 36});
  final double height;

  @override
  Widget build(BuildContext context) => Image.asset('assets/brand/mark.png', height: height, semanticLabel: 'مساري');
}

class StatusBadge extends StatelessWidget {
  const StatusBadge(this.value, {super.key});
  final Enm? value;

  @override
  Widget build(BuildContext context) {
    final item = value;
    if (item == null) return const SizedBox.shrink();
    final (bg, fg) = toneColors(item.color);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(99)),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        Container(width: 6, height: 6, decoration: BoxDecoration(color: fg, shape: BoxShape.circle)),
        const SizedBox(width: 6),
        Text(item.label, style: TextStyle(color: fg, fontSize: 12, fontWeight: FontWeight.w800)),
      ]),
    );
  }
}

/// Carrier identity chip — branded monogram (no logo files yet).
class CarrierMark extends StatelessWidget {
  const CarrierMark(this.carrier, {super.key, this.size = 40});
  final Carrier carrier;
  final double size;

  static const _mono = {'smsa': 'SMSA', 'aramex': 'ARX', 'spl': 'SPL', 'jt': 'J&T', 'dhl': 'DHL', 'naqel': 'NQL', 'imile': 'iM', 'redbox': 'RBX'};

  @override
  Widget build(BuildContext context) {
    final hex = (carrier.brandColor ?? '#0F2741').replaceFirst('#', '');
    final color = Color(int.parse('FF$hex', radix: 16));
    return Container(
      width: size,
      height: size,
      alignment: Alignment.center,
      decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(10)),
      child: Text(_mono[carrier.code] ?? carrier.code.toUpperCase(), style: TextStyle(color: carrier.code == 'dhl' ? const Color(0xFFD40511) : Colors.white, fontSize: size * .27, fontWeight: FontWeight.w900)),
    );
  }
}

class SectionCard extends StatelessWidget {
  const SectionCard({super.key, required this.child, this.padding = const EdgeInsets.all(16), this.onTap});
  final Widget child;
  final EdgeInsets padding;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) => Card(
        clipBehavior: Clip.antiAlias,
        child: InkWell(onTap: onTap, child: Padding(padding: padding, child: child)),
      );
}

class KpiTile extends StatelessWidget {
  const KpiTile({super.key, required this.label, required this.value, required this.icon, this.tone = 'green'});
  final String label;
  final String value;
  final IconData icon;
  final String tone;

  @override
  Widget build(BuildContext context) {
    final (bg, fg) = toneColors(tone);
    return SectionCard(
      padding: const EdgeInsets.all(14),
      child: Row(children: [
        Container(width: 40, height: 40, decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(10)), child: Icon(icon, color: fg, size: 20)),
        const SizedBox(width: 12),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(label, style: const TextStyle(color: Brand.inkSubtle, fontSize: 12.5, fontWeight: FontWeight.w600)),
            Text(value, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800, height: 1.2)),
          ]),
        ),
      ]),
    );
  }
}

class ErrorState extends StatelessWidget {
  const ErrorState(this.message, {super.key, this.onRetry});
  final String message;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) => Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            const Icon(Icons.cloud_off_rounded, size: 48, color: Brand.inkSubtle),
            const SizedBox(height: 12),
            Text(message, textAlign: TextAlign.center, style: const TextStyle(fontWeight: FontWeight.w600)),
            if (onRetry != null) ...[const SizedBox(height: 16), SizedBox(width: 180, child: OutlinedButton(onPressed: onRetry, child: const Text('إعادة المحاولة')))],
          ]),
        ),
      );
}

class EmptyState extends StatelessWidget {
  const EmptyState({super.key, required this.icon, required this.title, this.subtitle});
  final IconData icon;
  final String title;
  final String? subtitle;

  @override
  Widget build(BuildContext context) => Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            Container(width: 64, height: 64, decoration: BoxDecoration(color: Brand.green50, borderRadius: BorderRadius.circular(20)), child: Icon(icon, color: Brand.green700, size: 30)),
            const SizedBox(height: 16),
            Text(title, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800)),
            if (subtitle != null) ...[const SizedBox(height: 6), Text(subtitle!, textAlign: TextAlign.center, style: const TextStyle(color: Brand.inkSubtle))],
          ]),
        ),
      );
}

class Skeleton extends StatelessWidget {
  const Skeleton({super.key, this.height = 80, this.radius = 16});
  final double height;
  final double radius;

  @override
  Widget build(BuildContext context) => Container(height: height, decoration: BoxDecoration(color: Brand.navy100.withValues(alpha: .5), borderRadius: BorderRadius.circular(radius)));
}

void showSnack(BuildContext context, String message, {bool error = false}) {
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(content: Text(message), backgroundColor: error ? Brand.rose : Brand.navy));
}
