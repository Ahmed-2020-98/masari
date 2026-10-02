import 'dart:convert';
import 'dart:io';

import 'package:flutter/foundation.dart';

/// Debug-only launch options read from `<app tmp>/masari_dev.json`, e.g.
/// `{"phone":"0500000000","password":"password123","route":"/shipments"}`.
/// Lets screens be opened headlessly (simulator automation); ignored in release builds.
Map<String, dynamic> get devConfig {
  if (!kDebugMode) return const {};
  try {
    return jsonDecode(File('${Directory.systemTemp.path}/masari_dev.json').readAsStringSync()) as Map<String, dynamic>;
  } on Object {
    return const {};
  }
}
