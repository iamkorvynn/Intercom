import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:permission_handler/permission_handler.dart';
import 'storage_service.dart';
import 'api_service.dart';
import 'livekit_service.dart';

class IntercomState {
  final String myCode;
  final Map<String, String>? partner;
  final IntercomConnectionState connectionState;
  final bool isTransmitting;
  final bool partnerTransmitting;
  final bool isMuted;
  final bool isSpeakerOn;
  final bool isLoading;
  final List<Map<String, dynamic>> history;

  IntercomState({
    required this.myCode,
    this.partner,
    required this.connectionState,
    required this.isTransmitting,
    required this.partnerTransmitting,
    required this.isMuted,
    required this.isSpeakerOn,
    required this.isLoading,
    required this.history,
  });

  IntercomState copyWith({
    String? myCode,
    Map<String, String>? partner,
    bool nullPartner = false,
    IntercomConnectionState? connectionState,
    bool? isTransmitting,
    bool? partnerTransmitting,
    bool? isMuted,
    bool? isSpeakerOn,
    bool? isLoading,
    List<Map<String, dynamic>>? history,
  }) {
    return IntercomState(
      myCode: myCode ?? this.myCode,
      partner: nullPartner ? null : (partner ?? this.partner),
      connectionState: connectionState ?? this.connectionState,
      isTransmitting: isTransmitting ?? this.isTransmitting,
      partnerTransmitting: partnerTransmitting ?? this.partnerTransmitting,
      isMuted: isMuted ?? this.isMuted,
      isSpeakerOn: isSpeakerOn ?? this.isSpeakerOn,
      isLoading: isLoading ?? this.isLoading,
      history: history ?? this.history,
    );
  }
}

class IntercomNotifier extends StateNotifier<IntercomState> {
  final StorageService _storage;
  final ApiService _api = ApiService();
  final LiveKitService _lk = LiveKitService();

  Timer? _heartbeatTimer;
  Timer? _statusTimer;
  Timer? _pairingCheckTimer;

  IntercomNotifier(this._storage)
      : super(IntercomState(
          myCode: '',
          partner: null,
          connectionState: IntercomConnectionState.disconnected,
          isTransmitting: false,
          partnerTransmitting: false,
          isMuted: false,
          isSpeakerOn: true,
          isLoading: true,
          history: [],
        )) {
    _init();
  }

  Future<void> _init() async {
    final myCode = _storage.getMyCode();
    final partner = _storage.getPartner();
    final isMuted = _storage.isMuted();
    final isSpeakerOn = _storage.isSpeakerOn();
    final history = _storage.getHistory();

    state = state.copyWith(
      myCode: myCode,
      partner: partner,
      isMuted: isMuted,
      isSpeakerOn: isSpeakerOn,
      history: history,
      isLoading: false,
    );

    // Listen to LiveKit changes
    _lk.addListener(_onLiveKitChanged);

    if (partner != null) {
      final session = _storage.getLiveKitSession();
      if (session != null) {
        _connectLiveKit(session['url']!, session['token']!, session['room']!);
      }
    } else {
      _startPairingCheck();
    }
  }

  void _onLiveKitChanged() {
    state = state.copyWith(
      connectionState: _lk.connectionState,
      isTransmitting: _lk.isTransmitting,
      partnerTransmitting: _lk.partnerTransmitting,
    );
  }

  // Setup/TearDown connection timers
  void _startTimers() {
    _stopTimers();
    // Heartbeat every 15s to let partner know we're online
    _heartbeatTimer = Timer.periodic(const Duration(seconds: 15), (_) {
      _api.sendHeartbeat(state.myCode);
    });
    // Send immediate heartbeat on connect
    _api.sendHeartbeat(state.myCode);

    // Check partner online status every 5s if we are connected to LiveKit
    _statusTimer = Timer.periodic(const Duration(seconds: 5), (_) async {
      if (state.partner != null) {
        final online = await _api.checkPartnerOnline(state.partner!['code']!);
        if (!online && state.connectionState == IntercomConnectionState.connected) {
          state = state.copyWith(connectionState: IntercomConnectionState.offline);
        } else if (online && state.connectionState == IntercomConnectionState.offline) {
          state = state.copyWith(connectionState: IntercomConnectionState.connected);
        }
      }
    });
  }

  void _stopTimers() {
    _heartbeatTimer?.cancel();
    _heartbeatTimer = null;
    _statusTimer?.cancel();
    _statusTimer = null;
  }

  void _startPairingCheck() {
    _stopPairingCheck();
    if (state.partner != null) return;

    _pairingCheckTimer = Timer.periodic(const Duration(seconds: 3), (_) async {
      if (state.myCode.isEmpty || state.partner != null) return;

      final pairingData = await _api.checkPairing(state.myCode);
      if (pairingData != null && state.partner == null) {
        final partnerCode = pairingData['partnerCode'] as String;
        final partnerName = pairingData['partnerName'] as String;
        await pair(partnerCode, partnerName);
      }
    });
  }

  void _stopPairingCheck() {
    _pairingCheckTimer?.cancel();
    _pairingCheckTimer = null;
  }

  Future<void> _connectLiveKit(String url, String token, String roomName) async {
    try {
      await _lk.connect(url, token);
      _startTimers();
    } catch (_) {
      state = state.copyWith(connectionState: IntercomConnectionState.disconnected);
    }
  }

  // Configure server URL
  void setServerUrl(String url) {
    _api.setBaseUrl(url);
  }

  String getServerUrl() {
    return _api.baseUrl;
  }

  // Pair partner
  Future<void> pair(String partnerCode, String partnerName) async {
    _stopPairingCheck();
    state = state.copyWith(isLoading: true);
    try {
      // 1. Fetch Session from Express Backend
      final session = await _api.fetchSession(
        myCode: state.myCode,
        partnerCode: partnerCode,
        partnerName: partnerName,
        pushToken: null, // Push token configuration placeholder
      );

      final url = session['livekitUrl'] as String;
      final token = session['token'] as String;
      final room = session['roomName'] as String;

      // 2. Persist pairing details
      await _storage.savePartner(partnerCode, partnerName);
      await _storage.saveLiveKitSession(url, token, room);

      state = state.copyWith(
        partner: {'code': partnerCode, 'name': partnerName},
        isLoading: false,
      );

      // 3. Connect LiveKit
      await _connectLiveKit(url, token, room);
    } catch (e) {
      state = state.copyWith(isLoading: false);
      _startPairingCheck();
      rethrow;
    }
  }

  // Unpair
  Future<void> unpair() async {
    _stopTimers();
    await _api.sendUnpair(state.myCode);
    await _lk.disconnect();
    await _storage.clearPartner();
    state = state.copyWith(
      nullPartner: true,
      connectionState: IntercomConnectionState.disconnected,
    );
    _startPairingCheck();
  }


  // PTT Actions
  Future<void> startTransmitting() async {
    if (state.isMuted || state.connectionState == IntercomConnectionState.disconnected) return;
    
    // Request permission dynamically
    final status = await Permission.microphone.request();
    if (status != PermissionStatus.granted) return;

    try {
      await _lk.startTransmitting();
      
      // Fire-and-forget: Notify partner they have incoming audio if they're offline
      if (state.partner != null) {
        _api.notifyTransmit(
          myCode: state.myCode,
          partnerCode: state.partner!['code']!,
          senderName: state.partner!['name']!,
        );
      }
    } catch (_) {
      // Failed to start mic track
    }
  }

  Future<void> stopTransmitting() async {
    await _lk.stopTransmitting();
  }

  void toggleMute() {
    final next = !state.isMuted;
    _storage.setMuted(next);
    if (next && state.isTransmitting) {
      stopTransmitting();
    }
    state = state.copyWith(isMuted: next);
  }

  void toggleSpeaker() {
    final next = !state.isSpeakerOn;
    _storage.setSpeakerOn(next);
    state = state.copyWith(isSpeakerOn: next);
  }

  // Inject a simulated missed transmission (history logs)
  Future<void> addSimulatedMissedTransmission() async {
    if (state.partner != null) {
      await _storage.addHistoryEntry(state.partner!['code']!, state.partner!['name']!);
      state = state.copyWith(history: _storage.getHistory());
    }
  }

  Future<void> clearHistory() async {
    await _storage.clearHistory();
    state = state.copyWith(history: []);
  }

  @override
  void dispose() {
    _stopTimers();
    _stopPairingCheck();
    _lk.removeListener(_onLiveKitChanged);
    _lk.dispose();
    super.dispose();
  }

}

// Global Providers
final storageProvider = Provider<StorageService>((ref) {
  throw UnimplementedError('Initialize storageProvider in main');
});

final intercomProvider = StateNotifierProvider<IntercomNotifier, IntercomState>((ref) {
  final storage = ref.watch(storageProvider);
  return IntercomNotifier(storage);
});
