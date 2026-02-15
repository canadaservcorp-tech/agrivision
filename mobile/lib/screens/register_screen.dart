import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});
  @override State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _nameCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  String _role = 'farmer';

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    return Scaffold(
      backgroundColor: const Color(0xFFF0FDF4),
      appBar: AppBar(title: const Text('Create Account'), backgroundColor: Colors.transparent, elevation: 0),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(32),
        child: Column(children: [
          TextField(controller: _nameCtrl, decoration: InputDecoration(labelText: 'Full Name', border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)))),
          const SizedBox(height: 16),
          TextField(controller: _emailCtrl, decoration: InputDecoration(labelText: 'Email', border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)))),
          const SizedBox(height: 16),
          TextField(controller: _passCtrl, decoration: InputDecoration(labelText: 'Password', border: OutlineInputBorder(borderRadius: BorderRadius.circular(12))), obscureText: true),
          const SizedBox(height: 16),
          DropdownButtonFormField<String>(
            value: _role,
            items: const [
              DropdownMenuItem(value: 'farmer', child: Text('Farmer')),
              DropdownMenuItem(value: 'student', child: Text('Student / Researcher')),
              DropdownMenuItem(value: 'company', child: Text('Company')),
            ],
            onChanged: (v) => setState(() => _role = v!),
            decoration: InputDecoration(labelText: 'I am a', border: OutlineInputBorder(borderRadius: BorderRadius.circular(12))),
          ),
          if (auth.error != null) Padding(padding: const EdgeInsets.only(top: 12), child: Text(auth.error!, style: const TextStyle(color: Colors.red))),
          const SizedBox(height: 24),
          SizedBox(width: double.infinity, height: 50,
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF15803D), foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
              onPressed: auth.loading ? null : () async {
                final ok = await auth.register(_nameCtrl.text.trim(), _emailCtrl.text.trim(), _passCtrl.text, _role);
                if (ok && mounted) Navigator.pushReplacementNamed(context, '/dashboard');
              },
              child: auth.loading ? const CircularProgressIndicator(color: Colors.white) : const Text('Sign Up Free'),
            ),
          ),
        ]),
      ),
    );
  }
}
