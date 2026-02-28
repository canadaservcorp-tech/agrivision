import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../config/theme.dart';
import '../services/auth_service.dart';
import '../services/mock_data.dart';

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authProvider).user ?? MockData.user;
    final themeMode = ref.watch(themeModeProvider);
    final isDark = themeMode == ThemeMode.dark;

    return Scaffold(
      appBar: AppBar(title: const Text('⚙️ Settings')),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        // Profile card
        Card(child: Padding(padding: const EdgeInsets.all(16), child: Row(children: [
          CircleAvatar(radius: 28, backgroundColor: AgriTheme.accentLight,
            child: Text((user['name'] as String)[0], style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: AgriTheme.primary))),
          const SizedBox(width: 14),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(user['name'] as String, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
            Text(user['email'] as String, style: TextStyle(color: Theme.of(context).textTheme.bodySmall?.color?.withOpacity(0.6), fontSize: 12)),
            const SizedBox(height: 2),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(color: AgriTheme.accentLight, borderRadius: BorderRadius.circular(4)),
              child: Text('${user['farm_count']} farms', style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: AgriTheme.accent)),
            ),
          ])),
          const Icon(Icons.edit_outlined, size: 20),
        ]))),
        const SizedBox(height: 12),

        // Dark mode toggle
        Card(
          margin: const EdgeInsets.only(bottom: 12),
          child: SwitchListTile(
            secondary: Icon(isDark ? Icons.dark_mode : Icons.light_mode, color: AgriTheme.accent, size: 22),
            title: const Text('Dark Mode', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
            subtitle: Text(isDark ? 'Dark theme active' : 'Light theme active', style: TextStyle(fontSize: 11, color: Theme.of(context).textTheme.bodySmall?.color?.withOpacity(0.6))),
            value: isDark,
            activeColor: AgriTheme.accent,
            onChanged: (_) => ref.read(themeModeProvider.notifier).toggle(),
          ),
        ),

        // System mode (A/B)
        Card(
          margin: const EdgeInsets.only(bottom: 12),
          child: ListTile(
            leading: Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: AgriTheme.accent.withOpacity(0.12),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(Icons.tune_rounded, color: AgriTheme.accent, size: 20),
            ),
            title: const Text('System Mode (A/B)', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
            subtitle: Text(
              'CCTV vs Monitoring • Time-lapse • Schedule',
              style: TextStyle(fontSize: 11, color: Theme.of(context).textTheme.bodySmall?.color?.withOpacity(0.6)),
            ),
            trailing: Icon(Icons.chevron_right, size: 18, color: Theme.of(context).iconTheme.color?.withOpacity(0.4)),
            onTap: () => context.push('/mode'),
          ),
        ),

        // Farm selector
        Text('Your Farms', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Theme.of(context).textTheme.bodyLarge?.color)),
        const SizedBox(height: 6),
        ...MockData.farms.map((f) => Card(
          margin: const EdgeInsets.only(bottom: 6),
          child: ListTile(
            leading: const Text('🌾', style: TextStyle(fontSize: 24)),
            title: Text(f['name'] as String, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
            subtitle: Text('${f['area_hectares']} ha • ${f['cameras']} cameras', style: TextStyle(fontSize: 11, color: Theme.of(context).textTheme.bodySmall?.color?.withOpacity(0.6))),
            trailing: Icon(Icons.chevron_right, color: Theme.of(context).iconTheme.color?.withOpacity(0.4)),
          ),
        )),
        const SizedBox(height: 12),

        // Settings items
        ...[
          (Icons.notifications_outlined, 'Notification Preferences', 'Alerts, reports, WhatsApp'),
          (Icons.language, 'Language', 'English'),
          (Icons.shield_outlined, 'Privacy & Data Consent', 'GDPR, data sharing'),
          (Icons.credit_card_outlined, 'Billing & Orders', 'View orders, payments'),
          (Icons.update_outlined, 'Firmware Updates', '2 cameras need update'),
          (Icons.help_outline, 'Help & Support', 'FAQ, contact, WhatsApp'),
          (Icons.info_outline, 'About', 'AgriVision v3.0 • PCTA S.A.'),
        ].map((item) => Card(
          margin: const EdgeInsets.only(bottom: 4),
          child: ListTile(
            leading: Icon(item.$1, color: AgriTheme.accent, size: 22),
            title: Text(item.$2, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
            subtitle: Text(item.$3, style: TextStyle(fontSize: 11, color: Theme.of(context).textTheme.bodySmall?.color?.withOpacity(0.6))),
            trailing: Icon(Icons.chevron_right, size: 18, color: Theme.of(context).iconTheme.color?.withOpacity(0.4)),
          ),
        )),
        const SizedBox(height: 20),

        // Logout
        SizedBox(width: double.infinity, child: OutlinedButton.icon(
          onPressed: () {
            ref.read(authProvider.notifier).logout();
            context.go('/login');
          },
          icon: const Icon(Icons.logout, color: AgriTheme.danger, size: 18),
          label: const Text('Logout', style: TextStyle(color: AgriTheme.danger, fontWeight: FontWeight.w700)),
          style: OutlinedButton.styleFrom(side: const BorderSide(color: AgriTheme.danger), padding: const EdgeInsets.symmetric(vertical: 14)),
        )),
        const SizedBox(height: 20),
      ]),
    );
  }
}
