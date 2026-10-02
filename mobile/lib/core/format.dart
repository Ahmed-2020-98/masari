import 'package:intl/intl.dart';

final _date = DateFormat('d/M/yyyy', 'en');
final _time = DateFormat('h:mm', 'en');
final _short = DateFormat('d/M', 'en');

/// 12/9/2026 · 3:45 م  (Latin digits with Arabic AM/PM, matching the dashboards).
String formatDateTime(DateTime value) => '${_date.format(value)} · ${_time.format(value)} ${value.hour >= 12 ? 'م' : 'ص'}';
String formatDate(DateTime value) => _date.format(value);
String formatShort(DateTime value) => _short.format(value);

String formatRelative(DateTime value) {
  final diff = DateTime.now().difference(value);
  if (diff.inMinutes < 1) return 'الآن';
  if (diff.inMinutes < 60) return 'منذ ${diff.inMinutes} دقيقة';
  if (diff.inHours < 24) return 'منذ ${diff.inHours} ساعة';
  if (diff.inDays < 7) return 'منذ ${diff.inDays} يوم';
  return formatDate(value);
}

/// +966551234567 → 055 123 4567
String formatPhone(String phone) {
  final local = phone.replaceFirst('+966', '0');
  final match = RegExp(r'^(\d{3})(\d{3})(\d{4})$').firstMatch(local);
  return match == null ? local : '${match[1]} ${match[2]} ${match[3]}';
}

/// Arabic-insensitive text normalization used by the city picker (جده == جدة).
String normalizeArabic(String value) => value
    .toLowerCase()
    .replaceAll(RegExp('[أإآ]'), 'ا')
    .replaceAll('ة', 'ه')
    .replaceAll('ى', 'ي')
    .replaceFirst(RegExp('^ال'), '')
    .trim();
