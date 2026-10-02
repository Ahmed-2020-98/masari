import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api.dart';
import '../../core/dev_config.dart';
import '../../core/models.dart';

class AuthState {
  const AuthState({this.ready = false, this.bootstrap});
  final bool ready;
  final Json? bootstrap;

  bool get authenticated => bootstrap != null;
  Json get merchant => (bootstrap?['merchant'] as Map?)?.cast<String, dynamic>() ?? {};
  Json get user => (bootstrap?['user'] as Map?)?.cast<String, dynamic>() ?? {};
  Money get wallet => Money.from(bootstrap?['wallet']);
  int get unread => (bootstrap?['unread_notifications'] as num?)?.toInt() ?? 0;
  Enm? get role => Enm.maybe(bootstrap?['role']);
}

/// Owns the session: token in the Keychain/Keystore, `/me/bootstrap` payload in memory.
class AuthController extends Notifier<AuthState> {
  /// Lets go_router re-evaluate redirects when the session changes.
  final ValueNotifier<int> changes = ValueNotifier(0);

  ApiClient get _api => ref.read(apiProvider);

  @override
  AuthState build() {
    _api.onUnauthorized = () => _clear();
    return const AuthState();
  }

  void _set(AuthState next) {
    state = next;
    changes.value++;
  }

  Future<void> restore() async {
    final stored = await secureStorage.read(key: tokenKey);
    if (stored == null) {
      // Debug-only auto-login (see dev_config.dart).
      final phone = devConfig['phone'] as String?;
      final password = devConfig['password'] as String?;
      if (phone != null && password != null) {
        try {
          return await login(phone, password);
        } on ApiError catch (_) {}
      }
      return _set(const AuthState(ready: true));
    }
    _api.token = stored;
    try {
      _set(AuthState(ready: true, bootstrap: await _api.get('me/bootstrap')));
    } on ApiError catch (error) {
      if (error.status == 401) {
        await _clear();
      } else {
        // Offline/server error: keep the token, show login so the user can retry.
        _set(const AuthState(ready: true));
      }
    }
  }

  Future<void> _adopt(Json response) async {
    final token = response['token'] as String;
    _api.token = token;
    await secureStorage.write(key: tokenKey, value: token);
    _set(AuthState(ready: true, bootstrap: await _api.get('me/bootstrap')));
  }

  Future<void> login(String phone, String password) async =>
      _adopt(await _api.post('auth/login', body: {'phone': phone, 'password': password, 'device_name': 'Masari mobile', 'platform': defaultTargetPlatform == TargetPlatform.android ? 'android' : 'ios'}));

  Future<void> register(Json body) async =>
      _adopt(await _api.post('auth/register', body: {...body, 'device_name': 'Masari mobile', 'platform': defaultTargetPlatform == TargetPlatform.android ? 'android' : 'ios'}));

  /// Refresh wallet balance / unread counter after mutations.
  Future<void> refresh() async {
    try {
      _set(AuthState(ready: true, bootstrap: await _api.get('me/bootstrap')));
    } on ApiError catch (_) {}
  }

  Future<void> logout() async {
    try {
      await _api.post('auth/logout');
    } on ApiError catch (_) {}
    await _clear();
  }

  Future<void> _clear() async {
    _api.token = null;
    await secureStorage.delete(key: tokenKey);
    _set(const AuthState(ready: true));
  }
}

final authProvider = NotifierProvider<AuthController, AuthState>(AuthController.new);
