import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api.dart';
import '../../core/format.dart';
import '../../core/theme.dart';
import '../../core/widgets.dart';
import '../auth/auth_controller.dart';

class AccountScreen extends ConsumerWidget {
  const AccountScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authProvider);
    final merchant = auth.merchant;
    final plan = (merchant['plan'] as Map?)?['name'];

    return Scaffold(
      appBar: AppBar(title: const Text('حسابي')),
      body: ListView(padding: const EdgeInsets.fromLTRB(16, 4, 16, 110), children: [
        SectionCard(
          child: Row(children: [
            CircleAvatar(radius: 28, backgroundColor: Brand.green, child: Text('${auth.user['name'] ?? ' '}'.characters.first, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: Brand.navy))),
            const SizedBox(width: 14),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('${auth.user['name']}', style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 18)),
              Text(formatPhone('${auth.user['phone']}'), textDirection: TextDirection.ltr, style: const TextStyle(color: Brand.inkMuted)),
              if (auth.role != null) Padding(padding: const EdgeInsets.only(top: 6), child: StatusBadge(auth.role)),
            ])),
          ]),
        ),
        const SizedBox(height: 12),
        SectionCard(
          padding: EdgeInsets.zero,
          child: Column(children: [
            _row(Icons.storefront_rounded, 'المتجر', '${merchant['store_name'] ?? ''}'),
            const Divider(height: 1),
            _row(Icons.workspace_premium_rounded, 'الباقة', '${plan ?? '—'}'),
            const Divider(height: 1),
            _row(Icons.receipt_long_rounded, 'الرقم الضريبي', '${merchant['vat_number'] ?? '—'}'),
            const Divider(height: 1),
            _row(Icons.dns_rounded, 'الخادم', apiBaseUrl),
          ]),
        ),
        const SizedBox(height: 20),
        OutlinedButton.icon(
          onPressed: () async {
            final ok = await showDialog<bool>(
              context: context,
              builder: (context) => AlertDialog(title: const Text('تسجيل الخروج؟'), actions: [TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('تراجع')), TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('خروج', style: TextStyle(color: Brand.rose, fontWeight: FontWeight.w800)))]),
            );
            if (ok == true) await ref.read(authProvider.notifier).logout();
          },
          style: OutlinedButton.styleFrom(foregroundColor: Brand.rose, side: const BorderSide(color: Color(0xFFFECDD3))),
          icon: const Icon(Icons.logout_rounded),
          label: const Text('تسجيل الخروج'),
        ),
        const SizedBox(height: 16),
        const Center(child: Column(children: [MasariMark(height: 28), SizedBox(height: 6), Text('مساري · كل شحناتك في مكان واحد', style: TextStyle(color: Brand.inkSubtle, fontSize: 12))])),
      ]),
    );
  }

  Widget _row(IconData icon, String label, String value) => Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        child: Row(children: [Icon(icon, color: Brand.inkSubtle, size: 22), const SizedBox(width: 12), Text(label, style: const TextStyle(fontWeight: FontWeight.w600)), const Spacer(), Flexible(child: Text(value, textDirection: TextDirection.ltr, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Brand.inkMuted, fontWeight: FontWeight.w600)))]),
      );
}
