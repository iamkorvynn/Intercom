import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'theme.dart';
import 'services/storage_service.dart';
import 'services/intercom_provider.dart';
import 'screens/pair_screen.dart';
import 'screens/main_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize storage service
  final storageService = await StorageService.init();

  runApp(
    ProviderScope(
      overrides: [
        storageProvider.overrideWithValue(storageService),
      ],
      child: const IntercomApp(),
    ),
  );
}

class IntercomApp extends ConsumerWidget {
  const IntercomApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(intercomProvider);

    Widget homeScreen;
    if (state.isLoading) {
      homeScreen = const Scaffold(
        body: Center(
          child: CircularProgressIndicator(
            valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF00FF41)),
          ),
        ),
      );
    } else if (state.partner != null) {
      homeScreen = const MainScreen();
    } else {
      homeScreen = const PairScreen();
    }

    return MaterialApp(
      title: 'Intercom',
      debugShowCheckedModeBanner: false,
      theme: IntercomTheme.darkTheme,
      home: homeScreen,
    );
  }
}
