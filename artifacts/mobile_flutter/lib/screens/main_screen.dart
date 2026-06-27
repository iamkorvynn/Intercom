import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/intercom_provider.dart';
import '../services/livekit_service.dart';
import '../widgets/push_to_talk_button.dart';
import '../widgets/waveform_visualizer.dart';
import 'history_screen.dart';
import 'settings_screen.dart';

class MainScreen extends ConsumerWidget {
  const MainScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(intercomProvider);
    final notifier = ref.read(intercomProvider.notifier);

    // Map ConnectionState to UI elements
    Color statusColor = Colors.red;
    String statusText = 'DISCONNECTED';

    switch (state.connectionState) {
      case IntercomConnectionState.connected:
        statusColor = const Color(0xFF00FF41);
        statusText = 'CONNECTED';
        break;
      case IntercomConnectionState.connecting:
        statusColor = Colors.orange;
        statusText = 'CONNECTING...';
        break;
      case IntercomConnectionState.offline:
        statusColor = Colors.grey;
        statusText = 'PARTNER OFFLINE';
        break;
      case IntercomConnectionState.disconnected:
      case IntercomConnectionState.poor:
        statusColor = Colors.red;
        statusText = 'DISCONNECTED';
        break;
    }

    final partnerName = state.partner?['name'] ?? 'Partner';

    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            // Top App Bar Area
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  // History button with unread count badge
                  Stack(
                    children: [
                      IconButton(
                        icon: const Icon(Icons.history, color: Colors.white, size: 28),
                        onPressed: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(builder: (_) => const HistoryScreen()),
                          );
                        },
                      ),
                      if (state.history.isNotEmpty)
                        Positioned(
                          right: 4,
                          top: 4,
                          child: Container(
                            padding: const EdgeInsets.all(4),
                            decoration: const BoxDecoration(
                              color: Color(0xFF00FF41),
                              shape: BoxShape.circle,
                            ),
                            constraints: const BoxConstraints(
                              minWidth: 16,
                              minHeight: 16,
                            ),
                            child: Text(
                              '${state.history.length}',
                              style: const TextStyle(
                                color: Colors.black,
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                              ),
                              textAlign: TextAlign.center,
                            ),
                          ),
                        ),
                    ],
                  ),
                  // App Title
                  const Text(
                    'INTERCOM',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 3.0,
                      color: Colors.white,
                    ),
                  ),
                  // Settings button
                  IconButton(
                    icon: const Icon(Icons.settings, color: Colors.white, size: 28),
                    onPressed: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const SettingsScreen()),
                      );
                    },
                  ),
                ],
              ),
            ),
            const Divider(color: Color(0xFF1E1E1E), height: 1),
            const Spacer(),

            // Connection Status & Partner Info
            Column(
              children: [
                Text(
                  partnerName.toUpperCase(),
                  style: const TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 2.0,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 8),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Container(
                      width: 8,
                      height: 8,
                      decoration: BoxDecoration(
                        color: statusColor,
                        shape: BoxShape.circle,
                        boxShadow: [
                          if (state.connectionState == IntercomConnectionState.connected ||
                              state.connectionState == IntercomConnectionState.connecting)
                            BoxShadow(
                              color: statusColor.withOpacity(0.5),
                              blurRadius: 6,
                              spreadRadius: 2,
                            ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      statusText,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: statusColor,
                        letterSpacing: 1.0,
                      ),
                    ),
                  ],
                ),
              ],
            ),
            const Spacer(),

            // Waveform Visualizer
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 48.0),
              child: WaveformVisualizer(
                isActive: state.isTransmitting || state.partnerTransmitting,
                color: state.partnerTransmitting
                    ? Colors.cyanAccent
                    : const Color(0xFF00FF41),
              ),
            ),
            
            // Subtitle speaker status
            if (state.partnerTransmitting)
              const Padding(
                padding: EdgeInsets.only(top: 8.0),
                child: Text(
                  'PARTNER IS SPEAKING...',
                  style: TextStyle(
                    color: Colors.cyanAccent,
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 1.0,
                  ),
                ),
              )
            else if (state.isTransmitting)
              const Padding(
                padding: EdgeInsets.only(top: 8.0),
                child: Text(
                  'SPEAK NOW',
                  style: TextStyle(
                    color: Color(0xFF00FF41),
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 1.0,
                  ),
                ),
              )
            else
              const SizedBox(height: 22),
            
            const Spacer(),

            // Large Push To Talk Button
            Center(
              child: PushToTalkButton(
                isTransmitting: state.isTransmitting,
                isMuted: state.isMuted,
                onPressStart: () {
                  notifier.startTransmitting();
                },
                onPressEnd: () {
                  notifier.stopTransmitting();
                },
              ),
            ),
            const Spacer(),

            // Quick toggles at the bottom
            Padding(
              padding: const EdgeInsets.only(bottom: 32.0, left: 24, right: 24),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  // Mute toggle
                  _buildToggleButton(
                    icon: state.isMuted ? Icons.mic_off : Icons.mic,
                    label: state.isMuted ? 'MUTED' : 'UNMUTED',
                    isActive: !state.isMuted,
                    onPressed: () {
                      notifier.toggleMute();
                    },
                  ),
                  
                  // Simulate missed transmission (extremely helpful for local verification!)
                  _buildToggleButton(
                    icon: Icons.notifications_active,
                    label: 'SIMULATE PUSH',
                    isActive: false,
                    onPressed: () {
                      notifier.addSimulatedMissedTransmission();
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Simulated missed transmission added to history'),
                          duration: Duration(seconds: 1),
                        ),
                      );
                    },
                  ),

                  // Speaker/Earpiece toggle
                  _buildToggleButton(
                    icon: state.isSpeakerOn ? Icons.volume_up : Icons.volume_down,
                    label: state.isSpeakerOn ? 'SPEAKER' : 'EARPIECE',
                    isActive: state.isSpeakerOn,
                    onPressed: () {
                      notifier.toggleSpeaker();
                    },
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildToggleButton({
    required IconData icon,
    required String label,
    required bool isActive,
    required VoidCallback onPressed,
  }) {
    final activeColor = const Color(0xFF00FF41);

    return InkWell(
      onTap: onPressed,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        width: 90,
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          color: const Color(0xFF121212),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isActive ? activeColor.withOpacity(0.3) : Colors.transparent,
            width: 1.0,
          ),
        ),
        child: Column(
          children: [
            Icon(
              icon,
              color: isActive ? activeColor : Colors.white,
              size: 24,
            ),
            const SizedBox(height: 6),
            Text(
              label,
              style: TextStyle(
                color: isActive ? activeColor : const Color(0xFF888888),
                fontSize: 9,
                fontWeight: FontWeight.bold,
                letterSpacing: 0.5,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
