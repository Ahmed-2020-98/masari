import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme.dart';

/// Bottom navigation matching the brand mockup: home, shipments, (+) create, wallet, account.
class AppShell extends StatelessWidget {
  const AppShell({super.key, required this.child});
  final Widget child;

  static const _tabs = ['/', '/shipments', '/wallet', '/account'];

  int _index(BuildContext context) {
    final path = GoRouterState.of(context).uri.path;
    final index = _tabs.indexWhere((tab) => tab == '/' ? path == '/' : path.startsWith(tab));
    return index < 0 ? 0 : index;
  }

  @override
  Widget build(BuildContext context) {
    final index = _index(context);
    return Scaffold(
      body: child,
      floatingActionButtonLocation: FloatingActionButtonLocation.centerDocked,
      floatingActionButton: FloatingActionButton(
        onPressed: () => context.push('/shipments/new'),
        backgroundColor: Brand.green,
        foregroundColor: Brand.navy,
        elevation: 4,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        tooltip: 'شحنة جديدة',
        child: const Icon(Icons.add_box_rounded, size: 30),
      ),
      bottomNavigationBar: BottomAppBar(
        color: Colors.white,
        height: 68,
        padding: EdgeInsets.zero,
        notchMargin: 8,
        shape: const CircularNotchedRectangle(),
        child: Row(children: [
          _item(context, 0, index, Icons.dashboard_outlined, Icons.dashboard_rounded, 'الرئيسية'),
          _item(context, 1, index, Icons.local_shipping_outlined, Icons.local_shipping_rounded, 'الشحنات'),
          const SizedBox(width: 64),
          _item(context, 2, index, Icons.account_balance_wallet_outlined, Icons.account_balance_wallet_rounded, 'المحفظة'),
          _item(context, 3, index, Icons.person_outline_rounded, Icons.person_rounded, 'حسابي'),
        ]),
      ),
    );
  }

  Widget _item(BuildContext context, int tab, int current, IconData icon, IconData activeIcon, String label) {
    final active = tab == current;
    return Expanded(
      child: InkWell(
        onTap: () => context.go(_tabs[tab]),
        child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
          Icon(active ? activeIcon : icon, color: active ? Brand.green600 : Brand.inkSubtle, size: 25),
          const SizedBox(height: 3),
          Text(label, style: TextStyle(fontSize: 11.5, fontWeight: active ? FontWeight.w800 : FontWeight.w600, color: active ? Brand.navy : Brand.inkSubtle)),
        ]),
      ),
    );
  }
}
