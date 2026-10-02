import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Masari brand tokens (mirrors brand/tokens.json).
class Brand {
  static const navy = Color(0xFF0F2741);
  static const navy800 = Color(0xFF122D4B);
  static const navy100 = Color(0xFFD6E1EC);
  static const navy50 = Color(0xFFEEF3F8);
  static const green = Color(0xFF00C48C);
  static const green50 = Color(0xFFE6FBF4);
  static const green600 = Color(0xFF00A576);
  static const green700 = Color(0xFF007F5C);
  static const teal = Color(0xFF0B6E7A);
  static const snow = Color(0xFFF5F8FA);
  static const mist = Color(0xFFE5E7EB);
  static const inkMuted = Color(0xFF475569);
  static const inkSubtle = Color(0xFF64748B);
  static const rose = Color(0xFFE11D48);
  static const amber = Color(0xFFD97706);
}

/// Background / foreground pair for a semantic tone returned by the API (`color` field of every enum).
(Color, Color) toneColors(String tone) => switch (tone) {
      'green' => (const Color(0xFFE6FBF4), const Color(0xFF006349)),
      'blue' => (const Color(0xFFEFF6FF), const Color(0xFF1D4ED8)),
      'indigo' => (const Color(0xFFEEF2FF), const Color(0xFF4338CA)),
      'sky' => (const Color(0xFFF0F9FF), const Color(0xFF0369A1)),
      'amber' => (const Color(0xFFFFFBEB), const Color(0xFF92400E)),
      'orange' => (const Color(0xFFFFF7ED), const Color(0xFFC2410C)),
      'red' => (const Color(0xFFFEF2F2), const Color(0xFFB91C1C)),
      'rose' => (const Color(0xFFFFF1F2), const Color(0xFFBE123C)),
      'navy' => (Brand.navy, Colors.white),
      _ => (const Color(0xFFF1F5F9), const Color(0xFF334155)),
    };

ThemeData buildTheme() {
  final scheme = ColorScheme.fromSeed(
    seedColor: Brand.green,
    primary: Brand.green,
    onPrimary: Brand.navy,
    secondary: Brand.navy,
    surface: Colors.white,
    error: Brand.rose,
    brightness: Brightness.light,
  );
  final TextTheme text = GoogleFonts.tajawalTextTheme(ThemeData.light().textTheme).apply(bodyColor: Brand.navy, displayColor: Brand.navy);
  const radius = BorderRadius.all(Radius.circular(12));

  return ThemeData(
    useMaterial3: true,
    colorScheme: scheme,
    scaffoldBackgroundColor: Brand.snow,
    textTheme: text,
    appBarTheme: AppBarTheme(
      backgroundColor: Brand.snow,
      foregroundColor: Brand.navy,
      elevation: 0,
      scrolledUnderElevation: 0,
      centerTitle: false,
      titleTextStyle: text.titleLarge?.copyWith(fontWeight: FontWeight.w800, color: Brand.navy),
    ),
    cardTheme: const CardThemeData(
      color: Colors.white,
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.all(Radius.circular(16)), side: BorderSide(color: Brand.mist)),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: Brand.green,
        foregroundColor: Brand.navy,
        minimumSize: const Size.fromHeight(52),
        shape: const RoundedRectangleBorder(borderRadius: radius),
        textStyle: text.titleMedium?.copyWith(fontWeight: FontWeight.w800),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: Brand.navy,
        minimumSize: const Size.fromHeight(52),
        side: const BorderSide(color: Color(0xFFCBD5E1)),
        shape: const RoundedRectangleBorder(borderRadius: radius),
        textStyle: text.titleMedium?.copyWith(fontWeight: FontWeight.w700),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.white,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      border: const OutlineInputBorder(borderRadius: radius, borderSide: BorderSide(color: Brand.mist)),
      enabledBorder: const OutlineInputBorder(borderRadius: radius, borderSide: BorderSide(color: Brand.mist)),
      focusedBorder: const OutlineInputBorder(borderRadius: radius, borderSide: BorderSide(color: Brand.green, width: 2)),
      errorBorder: const OutlineInputBorder(borderRadius: radius, borderSide: BorderSide(color: Brand.rose)),
      focusedErrorBorder: const OutlineInputBorder(borderRadius: radius, borderSide: BorderSide(color: Brand.rose, width: 2)),
      hintStyle: const TextStyle(color: Brand.inkSubtle),
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: Colors.white,
      indicatorColor: Brand.green50,
      height: 68,
      labelTextStyle: WidgetStatePropertyAll(text.labelMedium?.copyWith(fontWeight: FontWeight.w700)),
    ),
    dividerTheme: const DividerThemeData(color: Brand.mist, space: 1, thickness: 1),
    snackBarTheme: const SnackBarThemeData(behavior: SnackBarBehavior.floating),
  );
}
