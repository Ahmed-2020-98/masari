import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api.dart';
import '../../core/format.dart';
import '../../core/theme.dart';
import 'auth_controller.dart';
import 'auth_widgets.dart';

/// Phone → OTP → store details, mirroring the web signup.
class RegisterScreen extends ConsumerStatefulWidget {
  const RegisterScreen({super.key});

  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen> {
  int _step = 0;
  bool _loading = false;
  ApiError? _error;
  String _phone = '';
  String _token = '';
  final _phoneCtl = TextEditingController();
  final _otpCtl = TextEditingController();
  final _name = TextEditingController();
  final _store = TextEditingController();
  final _password = TextEditingController();
  final _confirm = TextEditingController();

  Future<void> _run(Future<void> Function() action) async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await action();
    } on ApiError catch (error) {
      if (mounted) setState(() => _error = error);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _sendOtp() => _run(() async {
        final result = await ref.read(apiProvider).post('auth/otp/send', body: {'phone': _phoneCtl.text.trim(), 'purpose': 'register'});
        setState(() {
          _phone = result['phone'] as String;
          _step = 1;
        });
      });

  Future<void> _verify(String code) => _run(() async {
        final result = await ref.read(apiProvider).post('auth/otp/verify', body: {'phone': _phone, 'purpose': 'register', 'code': code});
        setState(() {
          _token = result['verification_token'] as String;
          _step = 2;
        });
      });

  Future<void> _register() => _run(() async {
        await ref.read(authProvider.notifier).register({
          'verification_token': _token,
          'phone': _phone,
          'name': _name.text.trim(),
          'store_name': _store.text.trim(),
          'password': _password.text,
          'password_confirmation': _confirm.text,
        });
        if (mounted) Navigator.of(context).popUntil((route) => route.isFirst);
      });

  @override
  Widget build(BuildContext context) {
    final titles = ['أنشئ حسابك في مساري', 'تحقق من رقمك', 'بيانات المتجر'];
    final general = _error != null && _error!.errors.isEmpty ? _error!.message : null;

    return AuthScaffold(
      showBack: true,
      title: titles[_step],
      subtitle: 'الخطوة ${_step + 1} من 3',
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        if (_step == 0) ...[
          PhoneField(controller: _phoneCtl, errorText: general, autofocus: true),
          const SizedBox(height: 8),
          const Text('سنرسل لك رمز تحقق عبر رسالة نصية.', style: TextStyle(color: Brand.inkSubtle)),
          const SizedBox(height: 24),
          FilledButton(onPressed: _loading ? null : _sendOtp, child: const Text('إرسال رمز التحقق')),
        ],
        if (_step == 1) ...[
          Text('أرسلنا رمزاً من 4 أرقام إلى ${formatPhone(_phone)}', style: const TextStyle(color: Brand.inkMuted)),
          const SizedBox(height: 20),
          OtpField(controller: _otpCtl, errorText: general, onCompleted: _verify),
          const SizedBox(height: 12),
          const Center(child: Text('بيئة التطوير: الرمز 1111', style: TextStyle(color: Brand.inkSubtle, fontSize: 12))),
          const SizedBox(height: 16),
          FilledButton(onPressed: _loading ? null : () => _verify(_otpCtl.text), child: const Text('تحقق')),
        ],
        if (_step == 2) ...[
          if (general != null) Padding(padding: const EdgeInsets.only(bottom: 12), child: Text(general, style: const TextStyle(color: Brand.rose, fontWeight: FontWeight.w700))),
          TextField(controller: _name, decoration: InputDecoration(labelText: 'الاسم الكامل', errorText: _error?.field('name'))),
          const SizedBox(height: 14),
          TextField(controller: _store, decoration: InputDecoration(labelText: 'اسم المتجر', errorText: _error?.field('store_name'))),
          const SizedBox(height: 14),
          TextField(controller: _password, obscureText: true, decoration: InputDecoration(labelText: 'كلمة المرور', helperText: '8 أحرف على الأقل تتضمن حروفاً وأرقاماً', errorText: _error?.field('password'))),
          const SizedBox(height: 14),
          TextField(controller: _confirm, obscureText: true, decoration: const InputDecoration(labelText: 'تأكيد كلمة المرور')),
          const SizedBox(height: 24),
          FilledButton(onPressed: _loading ? null : _register, child: const Text('إنشاء الحساب')),
        ],
        if (_loading) const Padding(padding: EdgeInsets.only(top: 16), child: Center(child: CircularProgressIndicator(color: Brand.green))),
      ]),
    );
  }
}
