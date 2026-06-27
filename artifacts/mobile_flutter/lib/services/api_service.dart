import 'dart:convert';
import 'package:http/http.dart' as http;

class ApiService {
  String _baseUrl = 'http://10.0.2.2:8080/api'; // Default emulator API address

  String get baseUrl => _baseUrl;

  void setBaseUrl(String url) {
    // Standardize URL format
    String sanitized = url.trim();
    if (sanitized.endsWith('/')) {
      sanitized = sanitized.substring(0, sanitized.length - 1);
    }
    if (!sanitized.endsWith('/api') && !sanitized.contains('/api/')) {
      sanitized = '$sanitized/api';
    }
    _baseUrl = sanitized;
  }

  Future<Map<String, dynamic>> fetchSession({
    required String myCode,
    required String partnerCode,
    required String partnerName,
    String? pushToken,
  }) async {
    final response = await http.post(
      Uri.parse('$baseUrl/intercom/session'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'myCode': myCode,
        'partnerCode': partnerCode,
        'partnerName': partnerName,
        'pushToken': pushToken,
      }),
    );

    if (response.statusCode != 200) {
      final err = jsonDecode(response.body);
      throw Exception(err['error'] ?? 'Session registration failed');
    }

    return jsonDecode(response.body) as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>?> checkPairing(String myCode) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/intercom/check-pairing?myCode=$myCode'),
      );
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['paired'] == true) {
          return data;
        }
      }
    } catch (_) {
      // Ignore background checks network errors
    }
    return null;
  }

  Future<void> sendUnpair(String myCode) async {
    try {
      await http.post(
        Uri.parse('$baseUrl/intercom/unpair'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'myCode': myCode}),
      );
    } catch (_) {
      // Ignore background unpair failures
    }
  }


  Future<bool> notifyTransmit({
    required String myCode,
    required String partnerCode,
    required String senderName,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/intercom/transmit'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'myCode': myCode,
          'partnerCode': partnerCode,
          'senderName': senderName,
        }),
      );
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['notified'] ?? false;
      }
    } catch (_) {
      // Ignore network failures for notification
    }
    return false;
  }

  Future<void> sendHeartbeat(String myCode) async {
    try {
      await http.post(
        Uri.parse('$baseUrl/intercom/heartbeat'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'myCode': myCode}),
      );
    } catch (_) {
      // Ignore background heartbeat failures
    }
  }

  Future<bool> checkPartnerOnline(String partnerCode) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/intercom/status?partnerCode=$partnerCode'),
      );
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['online'] ?? false;
      }
    } catch (_) {
      // Fallback on network error
    }
    return false;
  }
}
