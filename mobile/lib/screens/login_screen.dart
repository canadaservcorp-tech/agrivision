import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});
  @override State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailCtrl = TextEditingController();
  final _passCtrl = TextEditingController();

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    return Scaffold(
      backgroundColor: const Color(0xFFF0FDF4),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text('Agrivision', style: TextStyle(fontSize: 32, fontWeight: FontWeight.w800, color: Color(0xFF166534))),
                const SizedBox(height: 8),
                Text('Sign in to your account', style: TextStyle(color: Colors.grey[600])),
                const SizedBox(height: 40),
                TextField(controller: _emailCtrl, decoration: InputDecoration(labelText: 'Email', border: OutlineInputBorder(borderRadius: BorderRadius.circular(12))), keyboardType: TextInputType.emailAddress),
                const SizedBox(height: 16),
                TextField(controller: _passCtrl, decoration: InputDecoration(labelText: 'Password', border: OutlineInputBorder(borderRadius: BorderRadius.circular(12))), obscureText: true),
                if (auth.error != null) Padding(padding: const EdgeInsets.only(top: 12), child: Text(auth.error!, style: const TextStyle(color: Colors.red))),
                const SizedBox(height: 24),
                SizedBox(
                  width: double.infinity, height: 50,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF15803D), foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
                    onPressed: auth.loading ? null : () async {
                      final ok = await auth.login(_emailCtrl.text.trim(), _passCtrl.text);
                      if (ok && mounted) Navigator.pushReplacementNamed(context, '/dashboard');
                    },
                    child: auth.loading ? const CircularProgressIndicator(color: Colors.white) : const Text('Sign In', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                  ),
                ),
                const SizedBox(height: 16),
                TextButton(onPressed: () => Navigator.pushNamed(context, '/register'), child: const Text("Don't have an account? Sign Up")),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
