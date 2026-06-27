import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:livekit_client/livekit_client.dart' as lk;

enum IntercomConnectionState {
  disconnected,
  connecting,
  connected,
  offline,
  poor,
}

class LiveKitService extends ChangeNotifier {
  lk.Room? _room;
  lk.EventsListener<lk.RoomEvent>? _listener;
  IntercomConnectionState _connectionState = IntercomConnectionState.disconnected;
  bool _isTransmitting = false;
  bool _partnerTransmitting = false;

  IntercomConnectionState get connectionState => _connectionState;
  bool get isTransmitting => _isTransmitting;
  bool get partnerTransmitting => _partnerTransmitting;
  bool get isConnected => _room?.connectionState == lk.ConnectionState.connected;

  void _updateConnectionState(IntercomConnectionState state) {
    _connectionState = state;
    notifyListeners();
  }

  Future<void> connect(String url, String token) async {
    await disconnect();
    
    _updateConnectionState(IntercomConnectionState.connecting);

    // Omit defaultAudioPublishOptions to avoid version parameter mismatch; defaults are safe.
    final room = lk.Room(
      roomOptions: const lk.RoomOptions(
        adaptiveStream: true,
        dynacast: true,
      ),
    );

    _room = room;

    // Listen to Room connection state changes via ChangeNotifier listener
    room.addListener(_onRoomStateChanged);

    // Listen to track publication events using EventsListener
    final listener = room.createListener();
    _listener = listener;

    listener
      ..on<lk.TrackPublishedEvent>((event) {
        if (event.participant != room.localParticipant && event.publication.kind == lk.TrackType.AUDIO) {
          _partnerTransmitting = true;
          notifyListeners();
        }
      })
      ..on<lk.TrackUnpublishedEvent>((event) {
        if (event.participant != room.localParticipant && event.publication.kind == lk.TrackType.AUDIO) {
          _partnerTransmitting = false;
          notifyListeners();
        }
      })
      ..on<lk.TrackMutedEvent>((event) {
        if (event.participant != room.localParticipant && event.publication.kind == lk.TrackType.AUDIO) {
          _partnerTransmitting = false;
          notifyListeners();
        }
      })
      ..on<lk.TrackUnmutedEvent>((event) {
        if (event.participant != room.localParticipant && event.publication.kind == lk.TrackType.AUDIO) {
          _partnerTransmitting = true;
          notifyListeners();
        }
      });

    try {
      await room.connect(url, token);
      // Explicitly disable microphone on start
      await room.localParticipant?.setMicrophoneEnabled(false);
      _updateConnectionState(IntercomConnectionState.connected);
    } catch (e) {
      _updateConnectionState(IntercomConnectionState.disconnected);
      rethrow;
    }
  }

  void _onRoomStateChanged() {
    final room = _room;
    if (room == null) return;

    final state = room.connectionState;
    if (state == lk.ConnectionState.connected) {
      _updateConnectionState(IntercomConnectionState.connected);
    } else if (state == lk.ConnectionState.disconnected) {
      _updateConnectionState(IntercomConnectionState.disconnected);
    } else if (state == lk.ConnectionState.connecting || state == lk.ConnectionState.reconnecting) {
      _updateConnectionState(IntercomConnectionState.connecting);
    }
  }

  Future<void> startTransmitting() async {
    if (_room == null || _connectionState != IntercomConnectionState.connected) return;
    _isTransmitting = true;
    notifyListeners();
    try {
      await _room!.localParticipant?.setMicrophoneEnabled(true);
    } catch (_) {
      _isTransmitting = false;
      notifyListeners();
      rethrow;
    }
  }

  Future<void> stopTransmitting() async {
    if (_room == null) return;
    _isTransmitting = false;
    notifyListeners();
    try {
      await _room!.localParticipant?.setMicrophoneEnabled(false);
    } catch (_) {
      // Ignore
    }
  }

  Future<void> disconnect() async {
    _room?.removeListener(_onRoomStateChanged);
    
    await _listener?.dispose();
    _listener = null;

    if (_room != null) {
      await _room!.disconnect();
      _room = null;
    }

    _isTransmitting = false;
    _partnerTransmitting = false;
    _updateConnectionState(IntercomConnectionState.disconnected);
  }

  @override
  void dispose() {
    disconnect();
    super.dispose();
  }
}
