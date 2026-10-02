import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'core/dev_config.dart';
import 'core/theme.dart';
import 'core/widgets.dart';
import 'features/account/account_screen.dart';
import 'features/auth/auth_controller.dart';
import 'features/auth/login_screen.dart';
import 'features/auth/register_screen.dart';
import 'features/home/home_screen.dart';
import 'features/notifications/notifications_screen.dart';
import 'features/shell/shell.dart';
import 'features/shipments/create_shipment_screen.dart';
import 'features/shipments/shipment_detail_screen.dart';
import 'features/shipments/shipments_screen.dart';
import 'features/wallet/wallet_screen.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final auth = ref.read(authProvider.notifier);

  return GoRouter(
    refreshListenable: auth.changes,
    redirect: (context, state) {
      final session = ref.read(authProvider);
      final path = state.uri.path;
      if (!session.ready) return path == '/splash' ? null : '/splash';
      final guest = path == '/login' || path == '/register';
      if (!session.authenticated) return guest ? null : '/login';
      if (guest || path == '/splash') return devConfig['route'] as String? ?? '/';
      return null;
    },
    initialLocation: '/splash',
    routes: [
      GoRoute(path: '/splash', builder: (_, _) => const _Splash()),
      GoRoute(path: '/login', builder: (_, _) => const LoginScreen()),
      GoRoute(path: '/register', builder: (_, _) => const RegisterScreen()),
      ShellRoute(
        builder: (_, _, child) => AppShell(child: child),
        routes: [
          GoRoute(path: '/', builder: (_, _) => const HomeScreen()),
          GoRoute(path: '/shipments', builder: (_, _) => const ShipmentsScreen()),
          GoRoute(path: '/wallet', builder: (_, _) => const WalletScreen()),
          GoRoute(path: '/account', builder: (_, _) => const AccountScreen()),
        ],
      ),
      GoRoute(path: '/shipments/new', builder: (_, _) => const CreateShipmentScreen()),
      GoRoute(path: '/shipments/:id', builder: (_, state) => ShipmentDetailScreen(id: state.pathParameters['id']!)),
      GoRoute(path: '/notifications', builder: (_, _) => const NotificationsScreen()),
    ],
  );
});

class _Splash extends StatelessWidget {
  const _Splash();

  @override
  Widget build(BuildContext context) => const Scaffold(backgroundColor: Brand.navy, body: Center(child: MasariMark(height: 72)));
}
