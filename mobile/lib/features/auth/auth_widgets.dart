import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../core/theme.dart';
import '../../core/widgets.dart';

/// Navy header with the brand mark used by every auth screen.
class AuthScaffold extends StatelessWidget {
  const AuthScaffold({super.key, required this.title, required this.subtitle, required this.child, this.showBack = false});
  final String title;
  final String subtitle;
  final Widget child;
  final bool showBack;

  @override
  Widget build(BuildContext context) => Scaffold(
        backgroundColor: Brand.navy,
        body: Column(children: [
          SafeArea(
            bottom: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(24, 12, 24, 28),
              child: Row(children: [
                if (showBack) IconButton(onPressed: () => Navigator.of(context).maybePop(), icon: const Icon(Icons.arrow_forward_rounded, color: Colors.white)),
                const MasariMark(height: 40),
                const SizedBox(width: 12),
                const Text('مساري', style: TextStyle(color: Colors.white, fontSize: 26, fontWeight: FontWeight.w900)),
              ]),
            ),
          ),
          Expanded(
            child: Container(
              width: double.infinity,
              decoration: const BoxDecoration(color: Brand.snow, borderRadius: BorderRadius.vertical(top: Radius.circular(28))),
              child: SingleChildScrollView(
                keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
                padding: EdgeInsets.fromLTRB(24, 28, 24, 24 + MediaQuery.of(context).viewInsets.bottom),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(title, style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w900)),
                  const SizedBox(height: 6),
                  Text(subtitle, style: const TextStyle(color: Brand.inkMuted, fontSize: 15)),
                  const SizedBox(height: 28),
                  child,
                ]),
              ),
            ),
          ),
        ]),
      );
}

class PhoneField extends StatelessWidget {
  const PhoneField({super.key, required this.controller, this.errorText, this.autofocus = false});
  final TextEditingController controller;
  final String? errorText;
  final bool autofocus;

  @override
  Widget build(BuildContext context) => TextField(
        controller: controller,
        autofocus: autofocus,
        keyboardType: TextInputType.phone,
        textDirection: TextDirection.ltr,
        textAlign: TextAlign.left,
        inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[0-9+]'))],
        autofillHints: const [AutofillHints.telephoneNumberNational],
        decoration: InputDecoration(labelText: 'رقم الجوال', hintText: '05X XXX XXXX', errorText: errorText, prefixIcon: const Padding(padding: EdgeInsets.only(left: 16, right: 8), child: Center(widthFactor: 1, child: Text('+966', textDirection: TextDirection.ltr, style: TextStyle(fontWeight: FontWeight.w700, color: Brand.inkMuted))))),
      );
}

class OtpField extends StatelessWidget {
  const OtpField({super.key, required this.controller, this.errorText, this.onCompleted});
  final TextEditingController controller;
  final String? errorText;
  final ValueChanged<String>? onCompleted;

  @override
  Widget build(BuildContext context) => TextField(
        controller: controller,
        autofocus: true,
        maxLength: 4,
        keyboardType: TextInputType.number,
        textAlign: TextAlign.center,
        textDirection: TextDirection.ltr,
        style: const TextStyle(fontSize: 32, fontWeight: FontWeight.w800, letterSpacing: 18),
        inputFormatters: [FilteringTextInputFormatter.digitsOnly],
        autofillHints: const [AutofillHints.oneTimeCode],
        onChanged: (value) {
          if (value.length == 4) onCompleted?.call(value);
        },
        decoration: InputDecoration(counterText: '', errorText: errorText, hintText: '••••'),
      );
}
