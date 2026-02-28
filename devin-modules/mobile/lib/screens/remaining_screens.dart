import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../config/theme.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';

// ============================================================
// SENSORS SCREEN
// ============================================================
class SensorsScreen extends ConsumerWidget {
  const SensorsScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(title: const Text('🌡️ Sensors')),
      body: FutureBuilder(
        future: ApiService().getSensors(1),
        builder: (ctx, snap) {
          if (snap.connectionState == ConnectionState.waiting) return const Center(child: CircularProgressIndicator());
          if (snap.hasError) return Center(child: Text('Error: ${snap.error}'));
          final data = snap.data ?? {};
          final readings = (data['readings'] as List?) ?? [];
          final latest = readings.isNotEmpty ? readings.last : {};
          return ListView(padding: const EdgeInsets.all(16), children: [
            // Current readings
            ...[
              {'icon': '🌡️', 'label': 'Temperature', 'value': '${latest['temperature'] ?? '--'}°C', 'unit': ''},
              {'icon': '💧', 'label': 'Humidity', 'value': '${latest['humidity'] ?? '--'}%', 'unit': ''},
              {'icon': '🌱', 'label': 'Soil Moisture', 'value': '${latest['soil_moisture'] ?? '--'}%', 'unit': ''},
              {'icon': '☀️', 'label': 'Light', 'value': '${latest['light_lux'] ?? '--'}', 'unit': ' lux'},
            ].map((s) => Card(
              margin: const EdgeInsets.only(bottom: 10),
              child: ListTile(
                leading: Text(s['icon']!, style: const TextStyle(fontSize: 28)),
                title: Text(s['label']!, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                trailing: Text('${s['value']}${s['unit']}', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: AgriTheme.primary)),
              ),
            )),
            const SizedBox(height: 16),
            Text('Last ${readings.length} readings', style: const TextStyle(color: AgriTheme.muted, fontSize: 12)),
          ]);
        },
      ),
    );
  }
}

// ============================================================
// FARM MAP SCREEN
// ============================================================
class FarmMapScreen extends StatelessWidget {
  const FarmMapScreen({super.key});
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('🗺️ Farm Map')),
      body: const Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
        Text('🗺️', style: TextStyle(fontSize: 64)),
        SizedBox(height: 12),
        Text('Interactive Farm Map', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: AgriTheme.primary)),
        SizedBox(height: 8),
        Padding(padding: EdgeInsets.symmetric(horizontal: 40),
          child: Text('Google Maps integration showing camera positions, coverage zones, and detection hotspots.',
              textAlign: TextAlign.center, style: TextStyle(color: AgriTheme.muted, fontSize: 13))),
      ])),
    );
  }
}

// ============================================================
// NOTIFICATIONS SCREEN
// ============================================================
class NotificationsScreen extends ConsumerWidget {
  const NotificationsScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(title: const Text('🔔 Notifications'), actions: [
        TextButton(onPressed: () {}, child: const Text('Mark all read', style: TextStyle(fontSize: 12))),
      ]),
      body: FutureBuilder(
        future: ApiService().getNotifications(),
        builder: (ctx, snap) {
          if (snap.connectionState == ConnectionState.waiting) return const Center(child: CircularProgressIndicator());
          final notifs = (snap.data as List?) ?? [];
          if (notifs.isEmpty) return const Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
            Text('🔔', style: TextStyle(fontSize: 48)),
            SizedBox(height: 12),
            Text('No notifications', style: TextStyle(color: AgriTheme.muted)),
          ]));
          return ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: notifs.length,
            separatorBuilder: (_, __) => const Divider(height: 1),
            itemBuilder: (_, i) {
              final n = notifs[i];
              final unread = n['read'] != true;
              return ListTile(
                contentPadding: const EdgeInsets.symmetric(vertical: 4),
                leading: Container(
                  width: 40, height: 40,
                  decoration: BoxDecoration(
                    color: unread ? AgriTheme.accentLight : const Color(0xFFF3F4F6),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Center(child: Text(n['type'] == 'alert' ? '🚨' : '📢', style: const TextStyle(fontSize: 18))),
                ),
                title: Text(n['title'] ?? '', style: TextStyle(fontWeight: unread ? FontWeight.w700 : FontWeight.w400, fontSize: 13)),
                subtitle: Text(n['message'] ?? '', maxLines: 2, overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 11, color: AgriTheme.muted)),
                trailing: unread ? Container(width: 8, height: 8, decoration: const BoxDecoration(color: AgriTheme.accent, shape: BoxShape.circle)) : null,
                onTap: () => ApiService().markNotificationRead(n['id']),
              );
            },
          );
        },
      ),
    );
  }
}

// ============================================================
// SETTINGS SCREEN
// ============================================================
class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authProvider).user;
    return Scaffold(
      appBar: AppBar(title: const Text('⚙️ Settings')),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        // Profile card
        Card(child: Padding(padding: const EdgeInsets.all(16), child: Row(children: [
          CircleAvatar(radius: 28, backgroundColor: AgriTheme.accentLight,
              child: Text((user?['name'] ?? 'U')[0], style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: AgriTheme.primary))),
          const SizedBox(width: 14),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(user?['name'] ?? 'Farmer', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
            Text(user?['email'] ?? '', style: const TextStyle(color: AgriTheme.muted, fontSize: 12)),
          ])),
          const Icon(Icons.edit_outlined, color: AgriTheme.muted, size: 20),
        ]))),
        const SizedBox(height: 16),

        // Settings items
        ...[
          {'icon': Icons.notifications_outlined, 'title': 'Notification Preferences', 'subtitle': 'Alerts, reports, updates'},
          {'icon': Icons.language, 'title': 'Language', 'subtitle': 'English'},
          {'icon': Icons.shield_outlined, 'title': 'Privacy & Data', 'subtitle': 'Consent, data sharing'},
          {'icon': Icons.credit_card_outlined, 'title': 'Billing & Orders', 'subtitle': 'View orders, payments'},
          {'icon': Icons.help_outline, 'title': 'Help & Support', 'subtitle': 'FAQ, contact us'},
          {'icon': Icons.info_outline, 'title': 'About', 'subtitle': 'AgriVision v3.0 • PCTA S.A.'},
        ].map((item) => Card(
          margin: const EdgeInsets.only(bottom: 6),
          child: ListTile(
            leading: Icon(item['icon'] as IconData, color: AgriTheme.primary),
            title: Text(item['title'] as String, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
            subtitle: Text(item['subtitle'] as String, style: const TextStyle(fontSize: 11, color: AgriTheme.muted)),
            trailing: const Icon(Icons.chevron_right, color: AgriTheme.muted),
          ),
        )),

        const SizedBox(height: 24),
        OutlinedButton.icon(
          onPressed: () {
            ref.read(authProvider.notifier).logout();
          },
          icon: const Icon(Icons.logout, color: AgriTheme.danger),
          label: const Text('Logout', style: TextStyle(color: AgriTheme.danger)),
          style: OutlinedButton.styleFrom(side: const BorderSide(color: AgriTheme.danger)),
        ),
      ]),
    );
  }
}

// ============================================================
// CAMERA SCANNER SCREEN (QR code provisioning)
// ============================================================
class CameraScannerScreen extends StatelessWidget {
  const CameraScannerScreen({super.key});
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('📷 Add Camera')),
      body: Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
        Container(
          width: 250, height: 250,
          decoration: BoxDecoration(border: Border.all(color: AgriTheme.accent, width: 3), borderRadius: BorderRadius.circular(20)),
          child: const Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
            Icon(Icons.qr_code_scanner, size: 80, color: AgriTheme.accent),
            SizedBox(height: 12),
            Text('Point at camera QR code', style: TextStyle(color: AgriTheme.muted, fontSize: 13)),
          ])),
        ),
        const SizedBox(height: 24),
        const Text('Scan the QR label on your\ncamera node to register it',
            textAlign: TextAlign.center, style: TextStyle(color: AgriTheme.muted, fontSize: 13)),
        const SizedBox(height: 24),
        OutlinedButton.icon(
          onPressed: () {},
          icon: const Icon(Icons.keyboard),
          label: const Text('Enter serial manually'),
        ),
      ])),
    );
  }
}
