import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/intercom_provider.dart';

class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key});

  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  final _urlController = TextEditingController();
  bool _isEditingUrl = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _urlController.text = ref.read(intercomProvider.notifier).getServerUrl();
    });
  }

  @override
  void dispose() {
    _urlController.dispose();
    super.dispose();
  }

  void _saveUrl() {
    ref.read(intercomProvider.notifier).setServerUrl(_urlController.text);
    setState(() {
      _isEditingUrl = false;
    });
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Server endpoint URL updated successfully'),
        duration: Duration(seconds: 1),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(intercomProvider);
    final notifier = ref.read(intercomProvider.notifier);

    final partnerName = state.partner?['name'] ?? 'None';
    final partnerCode = state.partner?['code'] ?? 'N/A';

    return Scaffold(
      appBar: AppBar(
        title: const Text('SETTINGS'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Connection Info Card
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: const Color(0xFF121212),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.grey[900]!),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'CONNECTION DETAILS',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 1.5,
                      color: Color(0xFF888888),
                    ),
                  ),
                  const SizedBox(height: 16),
                  _buildDetailRow('My Device Code', state.myCode),
                  const Divider(color: Colors.grey, height: 24, thickness: 0.1),
                  _buildDetailRow('Paired Partner', partnerName),
                  const Divider(color: Colors.grey, height: 24, thickness: 0.1),
                  _buildDetailRow('Partner Code', partnerCode),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Server Config Section
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: const Color(0xFF121212),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.grey[900]!),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'SERVER ENDPOINT',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          letterSpacing: 1.5,
                          color: Color(0xFF888888),
                        ),
                      ),
                      if (!_isEditingUrl)
                        IconButton(
                          icon: const Icon(Icons.edit, color: Color(0xFF00FF41), size: 18),
                          onPressed: () {
                            setState(() {
                              _isEditingUrl = true;
                            });
                          },
                        ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  if (_isEditingUrl) ...[
                    TextField(
                      controller: _urlController,
                      decoration: const InputDecoration(
                        hintText: 'http://10.0.2.2:8080/api',
                        contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        TextButton(
                          onPressed: () {
                            setState(() {
                              _isEditingUrl = false;
                              _urlController.text = notifier.getServerUrl();
                            });
                          },
                          child: const Text('CANCEL'),
                        ),
                        const SizedBox(width: 8),
                        ElevatedButton(
                          onPressed: _saveUrl,
                          style: ElevatedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                          ),
                          child: const Text('SAVE'),
                        ),
                      ],
                    ),
                  ] else ...[
                    Text(
                      notifier.getServerUrl(),
                      style: const TextStyle(
                        fontFamily: 'monospace',
                        color: Colors.white,
                        fontSize: 14,
                      ),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 48),

            // Danger Zone Unpair Button
            ElevatedButton(
              onPressed: () {
                showDialog(
                  context: context,
                  builder: (context) => AlertDialog(
                    title: const Text('Unpair Device?'),
                    content: const Text(
                      'This will disconnect the active session, clear the partner pairing, and reset the app. You will need to pair again to talk.',
                    ),
                    actions: [
                      TextButton(
                        onPressed: () => Navigator.pop(context),
                        child: const Text('CANCEL'),
                      ),
                      TextButton(
                        onPressed: () async {
                          Navigator.pop(context); // Close dialog
                          await notifier.unpair();
                          if (mounted) {
                            Navigator.pop(context); // Go back to pair screen
                          }
                        },
                        child: const Text('UNPAIR', style: TextStyle(color: Color(0xFFFF3333))),
                      ),
                    ],
                  ),
                );
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFFF3333).withOpacity(0.1),
                foregroundColor: const Color(0xFFFF3333),
                side: const BorderSide(color: Color(0xFFFF3333), width: 1.0),
              ),
              child: const Text('UNPAIR PARTNER DEVICE'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: const TextStyle(
            color: Color(0xFF888888),
            fontSize: 14,
          ),
        ),
        Text(
          value,
          style: const TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.bold,
            fontSize: 14,
          ),
        ),
      ],
    );
  }
}
