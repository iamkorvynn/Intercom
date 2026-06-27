import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/intercom_provider.dart';

class PairScreen extends ConsumerStatefulWidget {
  const PairScreen({super.key});

  @override
  ConsumerState<PairScreen> createState() => _PairScreenState();
}

class _PairScreenState extends ConsumerState<PairScreen> {
  final _formKey = GlobalKey<FormState>();
  final _codeController = TextEditingController();
  final _nameController = TextEditingController();
  final _urlController = TextEditingController();
  bool _showSettings = false;

  @override
  void initState() {
    super.initState();
    // Pre-populate server URL
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _urlController.text = ref.read(intercomProvider.notifier).getServerUrl();
    });
  }

  @override
  void dispose() {
    _codeController.dispose();
    _nameController.dispose();
    _urlController.dispose();
    super.dispose();
  }

  Future<void> _handlePair() async {
    if (!_formKey.currentState!.validate()) return;
    
    // Save server URL first if settings are visible
    if (_showSettings) {
      ref.read(intercomProvider.notifier).setServerUrl(_urlController.text);
    }

    try {
      await ref.read(intercomProvider.notifier).pair(
        _codeController.text.trim(),
        _nameController.text.trim(),
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to pair: ${e.toString()}'),
            backgroundColor: Colors.red[900],
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final intercomState = ref.watch(intercomProvider);

    return Scaffold(
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            return SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 16.0),
              child: ConstrainedBox(
                constraints: BoxConstraints(
                  minHeight: constraints.maxHeight - 32,
                ),
                child: IntrinsicHeight(
                  child: Form(
                    key: _formKey,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        const SizedBox(height: 32),
                        // Logo / Header
                        const Center(
                          child: Icon(
                            Icons.contactless,
                            size: 64,
                            color: Color(0xFF00FF41),
                          ),
                        ),
                        const SizedBox(height: 16),
                        const Center(
                          child: Text(
                            'INTERCOM',
                            style: TextStyle(
                              fontSize: 28,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 4.0,
                              color: Color(0xFF00FF41),
                            ),
                          ),
                        ),
                        const Center(
                          child: Text(
                            'Always-connected push-to-talk private line.',
                            style: TextStyle(
                              fontSize: 14,
                              color: Color(0xFF888888),
                            ),
                          ),
                        ),
                        const SizedBox(height: 48),

                        // My Device Code Box
                        Container(
                          padding: const EdgeInsets.all(24),
                          decoration: BoxDecoration(
                            color: const Color(0xFF121212),
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(
                              color: const Color(0xFF00FF41).withOpacity(0.2),
                              width: 1.0,
                            ),
                          ),
                          child: Column(
                            children: [
                              const Text(
                                'YOUR PAIRING CODE',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: Color(0xFF888888),
                                  fontWeight: FontWeight.bold,
                                  letterSpacing: 1.5,
                                ),
                              ),
                              const SizedBox(height: 8),
                              GestureDetector(
                                onTap: () {
                                  Clipboard.setData(ClipboardData(text: intercomState.myCode));
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(
                                      content: Text('Code copied to clipboard'),
                                      duration: Duration(seconds: 2),
                                    ),
                                  );
                                },
                                child: Text(
                                  intercomState.myCode,
                                  style: const TextStyle(
                                    fontSize: 48,
                                    fontWeight: FontWeight.bold,
                                    letterSpacing: 6.0,
                                    color: Color(0xFF00FF41),
                                  ),
                                ),
                              ),
                              const SizedBox(height: 4),
                              const Text(
                                'Tap to copy and share with your partner',
                                style: TextStyle(
                                  fontSize: 11,
                                  color: Color(0xFF555555),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 32),

                        // Input fields
                        TextFormField(
                          controller: _codeController,
                          keyboardType: TextInputType.number,
                          decoration: const InputDecoration(
                            labelText: "Partner's Code",
                            hintText: "Enter 6-digit code",
                            prefixIcon: Icon(Icons.vpn_key),
                          ),
                          inputFormatters: [
                            FilteringTextInputFormatter.digitsOnly,
                            LengthLimitingTextInputFormatter(6),
                          ],
                          validator: (value) {
                            if (value == null || value.isEmpty) {
                              return "Partner's code is required";
                            }
                            if (value.length < 6) {
                              return "Must be a 6-digit code";
                            }
                            if (value == intercomState.myCode) {
                              return "Cannot pair with your own code";
                            }
                            return null;
                          },
                        ),
                        const SizedBox(height: 16),
                        TextFormField(
                          controller: _nameController,
                          textCapitalization: TextCapitalization.words,
                          decoration: const InputDecoration(
                            labelText: "Partner's Name",
                            hintText: "e.g. Alex",
                            prefixIcon: Icon(Icons.person),
                          ),
                          validator: (value) {
                            if (value == null || value.isEmpty) {
                              return "Partner's name is required";
                            }
                            return null;
                          },
                        ),
                        const SizedBox(height: 24),

                        // Action Button
                        if (intercomState.isLoading)
                          const Center(
                            child: CircularProgressIndicator(
                              valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF00FF41)),
                            ),
                          )
                        else
                          ElevatedButton(
                            onPressed: _handlePair,
                            child: const Text('CONNECT LINE'),
                          ),
                        
                        const Spacer(),

                        // Config settings toggler
                        TextButton(
                          onPressed: () {
                            setState(() {
                              _showSettings = !_showSettings;
                            });
                          },
                          child: Text(
                            _showSettings ? 'Hide Server Configuration' : 'Server Configuration',
                            style: const TextStyle(color: Color(0xFF888888), fontSize: 13),
                          ),
                        ),
                        if (_showSettings) ...[
                          const SizedBox(height: 8),
                          TextFormField(
                            controller: _urlController,
                            decoration: const InputDecoration(
                              labelText: "Server Endpoint URL",
                              hintText: "http://10.0.2.2:8080/api",
                              prefixIcon: Icon(Icons.dns),
                            ),
                            validator: (value) {
                              if (_showSettings && (value == null || value.isEmpty)) {
                                return "Server URL is required";
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 16),
                        ],
                      ],
                    ),
                  ),
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}
