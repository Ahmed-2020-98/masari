import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api.dart';
import '../../core/format.dart';
import '../../core/theme.dart';
import '../../core/widgets.dart';
import '../auth/auth_controller.dart';

final notificationsProvider = FutureProvider.autoDispose<List<Json>>((ref) async {
  final response = await ref.read(apiProvider).get('me/notifications');
  return [for (final item in (response['data'] as List)) item as Json];
});

class NotificationsScreen extends ConsumerWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(notificationsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('الإشعارات'), actions: [
        TextButton(
          onPressed: () async {
            await ref.read(apiProvider).post('me/notifications/read-all');
            ref.invalidate(notificationsProvider);
            await ref.read(authProvider.notifier).refresh();
          },
          child: const Text('قراءة الكل', style: TextStyle(fontWeight: FontWeight.w800, color: Brand.green700)),
        ),
      ]),
      body: async.when(
        loading: () => ListView(padding: const EdgeInsets.all(16), children: [for (var i = 0; i < 5; i++) const Padding(padding: EdgeInsets.only(bottom: 10), child: Skeleton(height: 76))]),
        error: (error, _) => ErrorState('$error', onRetry: () => ref.invalidate(notificationsProvider)),
        data: (items) => items.isEmpty
            ? const EmptyState(icon: Icons.notifications_none_rounded, title: 'لا توجد إشعارات')
            : RefreshIndicator(
                color: Brand.green,
                onRefresh: () async => ref.invalidate(notificationsProvider),
                child: ListView.separated(
                  padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
                  itemCount: items.length,
                  separatorBuilder: (_, _) => const SizedBox(height: 8),
                  itemBuilder: (context, index) {
                    final item = items[index];
                    final unread = item['read_at'] == null;
                    final data = (item['data'] as Map?) ?? const {};
                    return SectionCard(
                      onTap: () async {
                        if (unread) {
                          await ref.read(apiProvider).post('me/notifications/${item['id']}/read');
                          ref.invalidate(notificationsProvider);
                          await ref.read(authProvider.notifier).refresh();
                        }
                        if (data['shipment_id'] != null && context.mounted) context.push('/shipments/${data['shipment_id']}');
                      },
                      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Container(margin: const EdgeInsets.only(top: 6), width: 9, height: 9, decoration: BoxDecoration(color: unread ? Brand.green : Brand.mist, shape: BoxShape.circle)),
                        const SizedBox(width: 12),
                        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Text('${item['title']}', style: const TextStyle(fontWeight: FontWeight.w800)),
                          const SizedBox(height: 2),
                          Text('${item['body']}', style: const TextStyle(color: Brand.inkMuted)),
                          const SizedBox(height: 4),
                          Text(formatRelative(DateTime.parse('${item['created_at']}').toLocal()), style: const TextStyle(color: Brand.inkSubtle, fontSize: 12)),
                        ])),
                      ]),
                    );
                  },
                ),
              ),
      ),
    );
  }
}
