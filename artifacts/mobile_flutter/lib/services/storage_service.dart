import 'dart:convert';
import 'dart:math';
import 'package:shared_preferences/shared_preferences.dart';

class StorageService {
  static const String _keyMyCode = 'my_code';
  static const String _keyPartnerCode = 'partner_code';
  static const String _keyPartnerName = 'partner_name';
  static const String _keyMuted = 'is_muted';
  static const String _keySpeaker = 'is_speaker_on';
  static const String _keyLiveKitUrl = 'lk_url';
  static const String _keyLiveKitToken = 'lk_token';
  static const String _keyRoomName = 'lk_room_name';
  static const String _keyHistory = 'history';

  final SharedPreferences _prefs;

  StorageService(this._prefs);

  static Future<StorageService> init() async {
    final prefs = await SharedPreferences.getInstance();
    return StorageService(prefs);
  }

  // Device Code
  String getMyCode() {
    String? code = _prefs.getString(_keyMyCode);
    if (code == null) {
      code = (100000 + Random().nextInt(900000)).toString();
      _prefs.setString(_keyMyCode, code);
    }
    return code;
  }

  // Pairing State
  bool isPaired() {
    return _prefs.getString(_keyPartnerCode) != null;
  }

  Map<String, String>? getPartner() {
    final code = _prefs.getString(_keyPartnerCode);
    final name = _prefs.getString(_keyPartnerName);
    if (code == null || name == null) return null;
    return {'code': code, 'name': name};
  }

  Future<void> savePartner(String code, String name) async {
    await _prefs.setString(_keyPartnerCode, code);
    await _prefs.setString(_keyPartnerName, name);
  }

  Future<void> clearPartner() async {
    await _prefs.remove(_keyPartnerCode);
    await _prefs.remove(_keyPartnerName);
    await _prefs.remove(_keyLiveKitUrl);
    await _prefs.remove(_keyLiveKitToken);
    await _prefs.remove(_keyRoomName);
  }

  // Audio Settings
  bool isMuted() {
    return _prefs.getBool(_keyMuted) ?? false;
  }

  Future<void> setMuted(bool val) async {
    await _prefs.setBool(_keyMuted, val);
  }

  bool isSpeakerOn() {
    return _prefs.getBool(_keySpeaker) ?? true;
  }

  Future<void> setSpeakerOn(bool val) async {
    await _prefs.setBool(_keySpeaker, val);
  }

  // LiveKit Session
  Map<String, String>? getLiveKitSession() {
    final url = _prefs.getString(_keyLiveKitUrl);
    final token = _prefs.getString(_keyLiveKitToken);
    final room = _prefs.getString(_keyRoomName);
    if (url == null || token == null || room == null) return null;
    return {'url': url, 'token': token, 'room': room};
  }

  Future<void> saveLiveKitSession(String url, String token, String room) async {
    await _prefs.setString(_keyLiveKitUrl, url);
    await _prefs.setString(_keyLiveKitToken, token);
    await _prefs.setString(_keyRoomName, room);
  }

  // History (Missed Transmissions)
  List<Map<String, dynamic>> getHistory() {
    final list = _prefs.getStringList(_keyHistory) ?? [];
    return list.map((item) => Map<String, dynamic>.from(jsonDecode(item))).toList();
  }

  Future<void> addHistoryEntry(String fromCode, String senderName) async {
    final entries = getHistory();
    // Add new entry at beginning
    entries.insert(0, {
      'id': DateTime.now().microsecondsSinceEpoch.toString(),
      'from': fromCode,
      'name': senderName,
      'timestamp': DateTime.now().toIso8601String(),
    });
    
    // Cap history size to 100 entries
    if (entries.length > 100) {
      entries.removeRange(100, entries.length);
    }
    
    final list = entries.map((item) => jsonEncode(item)).toList();
    await _prefs.setStringList(_keyHistory, list);
  }

  Future<void> clearHistory() async {
    await _prefs.remove(_keyHistory);
  }
}
