import 'dart:io' show Platform;

import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Laravel API base URL. Override with `--dart-define=API_URL=https://api.example.com/api/v1`.
/// Android emulators reach the host machine through 10.0.2.2.
String get apiBaseUrl => const String.fromEnvironment('API_URL').isNotEmpty
    ? const String.fromEnvironment('API_URL')
    : (Platform.isAndroid ? 'http://10.0.2.2:8010/api/v1' : 'http://127.0.0.1:8010/api/v1');

class ApiError implements Exception {
  ApiError(this.message, {this.status = 0, this.code = 'error', this.errors = const {}});

  final String message;
  final int status;
  final String code;
  final Map<String, List<String>> errors;

  /// First validation message for a field (dot notation), if any.
  String? field(String name) => errors[name]?.firstOrNull;

  @override
  String toString() => message;
}

typedef Json = Map<String, dynamic>;

/// Thin Dio wrapper that attaches the per-device Sanctum token and maps the API error envelope
/// `{message, code, errors}` into [ApiError].
class ApiClient {
  ApiClient() : _dio = Dio(BaseOptions(baseUrl: '$apiBaseUrl/', connectTimeout: const Duration(seconds: 15), receiveTimeout: const Duration(seconds: 30), headers: {'Accept': 'application/json'})) {
    _dio.interceptors.add(InterceptorsWrapper(onRequest: (options, handler) {
      final value = token;
      if (value != null) options.headers['Authorization'] = 'Bearer $value';
      handler.next(options);
    }));
  }

  final Dio _dio;
  String? token;
  void Function()? onUnauthorized;

  Future<Json> get(String path, {Map<String, dynamic>? query}) => _send('GET', path, query: query);
  Future<Json> post(String path, {Object? body}) => _send('POST', path, body: body);
  Future<Json> put(String path, {Object? body}) => _send('PUT', path, body: body);
  Future<Json> patch(String path, {Object? body}) => _send('PATCH', path, body: body);
  Future<Json> delete(String path, {Object? body}) => _send('DELETE', path, body: body);

  Future<Json> _send(String method, String path, {Map<String, dynamic>? query, Object? body}) async {
    try {
      final response = await _dio.request<dynamic>(path, data: body, queryParameters: query, options: Options(method: method));
      final data = response.data;
      return data is Map<String, dynamic> ? data : <String, dynamic>{};
    } on DioException catch (error) {
      final data = error.response?.data;
      final status = error.response?.statusCode ?? 0;
      if (status == 401 && token != null) onUnauthorized?.call();
      if (data is Map) {
        final errors = <String, List<String>>{};
        (data['errors'] as Map?)?.forEach((key, value) => errors['$key'] = [for (final item in (value as List)) '$item']);
        throw ApiError(data['message']?.toString() ?? 'حدث خطأ غير متوقع.', status: status, code: data['code']?.toString() ?? 'error', errors: errors);
      }
      throw ApiError(error.type == DioExceptionType.connectionError || error.type == DioExceptionType.connectionTimeout ? 'تعذر الاتصال بالخادم، تحقق من الإنترنت.' : 'حدث خطأ غير متوقع.', status: status);
    }
  }
}

final apiProvider = Provider<ApiClient>((ref) => ApiClient());

const secureStorage = FlutterSecureStorage();
const tokenKey = 'masari_token';
