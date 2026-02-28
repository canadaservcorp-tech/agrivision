import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../services/auth_service.dart';
import '../config/theme.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});
  @override ConsumerState<LoginScreen> createState() => _LoginState();
}

class _LoginState extends ConsumerState<LoginScreen> {
  bool _isLogin = true;
  bool _loading = false;
  String? _error;
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _name = TextEditingController();
  final _phone = TextEditingController();
  String _country = 'AE';

  Future<void> _submit() async {
    setState(() { _loading = true; _error = null; });
    try {
      if (_isLogin) {
        await ref.read(authProvider.notifier).login(_email.text, _password.text);
        if (mounted) context.go('/home');
      } else {
        await ref.read(authProvider.notifier).signup({
          'name': _name.text, 'email': _email.text,
          'password': _password.text, 'phone': _phone.text,
          'country': _country, 'language': 'en',
        });
        setState(() { _isLogin = true; _error = null; });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Account created! Please login.')),
        );
      }
    } catch (e) {
      setState(() { _error = e.toString(); });
    }
    setState(() { _loading = false; });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AgriVisionTheme.bg,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(28),
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              const Text('🌱', style: TextStyle(fontSize: 48)),
              const SizedBox(height: 8),
              const Text('AgriVision', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: AgriVisionTheme.primary)),
              const SizedBox(height: 4),
              Text(_isLogin ? 'Welcome back' : 'Create your farm account',
                  style: const TextStyle(color: AgriVisionTheme.muted, fontSize: 13)),
              const SizedBox(height: 24),

              // Toggle
              Container(
                decoration: BoxDecoration(color: const Color(0xFFF3F4F6), borderRadius: BorderRadius.circular(10)),
                padding: const EdgeInsets.all(3),
                child: Row(children: ['Login', 'Sign Up'].map((t) {
                  final selected = (t == 'Login') == _isLogin;
                  return Expanded(child: GestureDetector(
                    onTap: () => setState(() => _isLogin = t == 'Login'),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      decoration: BoxDecoration(
                        color: selected ? Colors.white : Colors.transparent,
                        borderRadius: BorderRadius.circular(8),
                        boxShadow: selected ? [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 4)] : [],
                      ),
                      child: Text(t, textAlign: TextAlign.center, style: TextStyle(
                        fontSize: 13, fontWeight: FontWeight.w700,
                        color: selected ? AgriVisionTheme.primary : AgriVisionTheme.muted,
                      )),
                    ),
                  ));
                }).toList()),
              ),
              const SizedBox(height: 20),

              if (_error != null) Container(
                padding: const EdgeInsets.all(12),
                margin: const EdgeInsets.only(bottom: 12),
                decoration: BoxDecoration(color: const Color(0xFFFEE2E2), borderRadius: BorderRadius.circular(8)),
                child: Text(_error!, style: const TextStyle(color: AgriVisionTheme.danger, fontSize: 12)),
              ),

              if (!_isLogin) ...[
                TextField(controller: _name, decoration: const InputDecoration(hintText: 'Full Name')),
                const SizedBox(height: 12),
                TextField(controller: _phone, decoration: const InputDecoration(hintText: 'Phone (WhatsApp)')),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  value: _country,
                  decoration: const InputDecoration(hintText: 'Country'),
                  items: {'AE': 'UAE', 'SA': 'Saudi Arabia', 'TR': 'Turkey', 'EG': 'Egypt',
                          'MA': 'Morocco', 'JO': 'Jordan', 'QA': 'Qatar', 'CA': 'Canada'}
                      .entries.map((e) => DropdownMenuItem(value: e.key, child: Text(e.value))).toList(),
                  onChanged: (v) => setState(() => _country = v ?? 'AE'),
                ),
                const SizedBox(height: 12),
              ],

              TextField(controller: _email, keyboardType: TextInputType.emailAddress,
                  decoration: const InputDecoration(hintText: 'Email')),
              const SizedBox(height: 12),
              TextField(controller: _password, obscureText: true,
                  decoration: const InputDecoration(hintText: 'Password')),
              const SizedBox(height: 20),

              SizedBox(width: double.infinity, child: ElevatedButton(
                onPressed: _loading ? null : _submit,
                child: _loading
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : Text(_isLogin ? 'Login' : 'Create Account'),
              )),

              if (_isLogin) TextButton(
                onPressed: () {},
                child: const Text('Forgot password?', style: TextStyle(fontSize: 12, color: AgriVisionTheme.accent)),
              ),
            ]),
          ),
        ),
      ),
    );
  }
}
