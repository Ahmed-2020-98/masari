import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api.dart';
import '../../core/theme.dart';
import 'auth_controller.dart';
import 'auth_widgets.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  /// Dev convenience: `--dart-define=DEV_PHONE=05… --dart-define=DEV_PASSWORD=…` prefills the form.
  static const _devPhone = String.fromEnvironment('DEV_PHONE');
  static const _devPassword = String.fromEnvironment('DEV_PASSWORD');

  final _phone = TextEditingController(text: _devPhone);
  final _password = TextEditingController(text: _devPassword);
  bool _hide = true;
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _phone.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    FocusScope.of(context).unfocus();
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await ref.read(authProvider.notifier).login(_phone.text.trim(), _password.text);
    } on ApiError catch (error) {
      if (mounted) setState(() => _error = error.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) => AuthScaffold(
        title: 'أهلاً بعودتك',
        subtitle: 'سجّل دخولك لإدارة شحناتك.',
        child: AutofillGroup(
          child: Column(children: [
            if (_error != null)
              Container(
                width: double.infinity,
                margin: const EdgeInsets.only(bottom: 16),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(color: const Color(0xFFFFF1F2), borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFFFECDD3))),
                child: Text(_error!, style: const TextStyle(color: Color(0xFFBE123C), fontWeight: FontWeight.w700)),
              ),
            PhoneField(controller: _phone),
            const SizedBox(height: 16),
            TextField(
              controller: _password,
              obscureText: _hide,
              autofillHints: const [AutofillHints.password],
              onSubmitted: (_) => _submit(),
              decoration: InputDecoration(labelText: 'كلمة المرور', prefixIcon: const Icon(Icons.lock_outline_rounded), suffixIcon: IconButton(onPressed: () => setState(() => _hide = !_hide), icon: Icon(_hide ? Icons.visibility_outlined : Icons.visibility_off_outlined))),
            ),
            const SizedBox(height: 24),
            FilledButton(onPressed: _loading ? null : _submit, child: _loading ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2.5, color: Brand.navy)) : const Text('تسجيل الدخول')),
            const SizedBox(height: 20),
            Row(mainAxisAlignment: MainAxisAlignment.center, children: [
              const Text('ليس لديك حساب؟', style: TextStyle(color: Brand.inkMuted)),
              TextButton(onPressed: () => context.push('/register'), child: const Text('أنشئ حسابك مجاناً', style: TextStyle(fontWeight: FontWeight.w800, color: Brand.green700))),
            ]),
          ]),
        ),
      );
}
