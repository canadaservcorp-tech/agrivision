import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:firebase_core/firebase_core.dart';
import 'providers/auth_provider.dart';
import 'providers/device_provider.dart';
import 'screens/login_screen.dart';
import 'screens/register_screen.dart';
import 'screens/dashboard_screen.dart';
import 'screens/device_detail_screen.dart';
import 'screens/alerts_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();
  runApp(const AgrivisionApp());
}

class AgrivisionApp extends StatelessWidget {
  const AgrivisionApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => DeviceProvider()),
      ],
      child: MaterialApp(
        title: 'Agrivision',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          colorScheme: ColorScheme.fromSeed(
            seedColor: const Color(0xFF15803D),
            primary: const Color(0xFF15803D),
          ),
          useMaterial3: true,
          fontFamily: 'DM Sans',
        ),
        initialRoute: '/login',
        routes: {
          '/login': (ctx) => const LoginScreen(),
          '/register': (ctx) => const RegisterScreen(),
          '/dashboard': (ctx) => const DashboardScreen(),
          '/alerts': (ctx) => const AlertsScreen(),
        },
      ),
    );
  }
}
