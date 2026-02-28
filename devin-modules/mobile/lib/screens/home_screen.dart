import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../config/theme.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';

final dashboardProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  return await ApiService().getDashboardOverview();
});

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authProvider).user;
    final dashboard = ref.watch(dashboardProvider);

    return Scaffold(
      appBar: AppBar(
        title: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('Hello, ${user?['name']?.split(' ').first ?? 'Farmer'} 👋', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
          const Text('Farm Overview', style: TextStyle(fontSize: 11, color: AgriVisionTheme.muted, fontWeight: FontWeight.normal)),
        ]),
        actions: [
          IconButton(icon: const Icon(Icons.qr_code_scanner_rounded), onPressed: () => context.push('/scan-camera'), tooltip: 'Add Camera'),
          Stack(children: [
            IconButton(icon: const Icon(Icons.notifications_outlined), onPressed: () => context.push('/notifications')),
            Positioned(right: 8, top: 8, child: Container(width: 8, height: 8, decoration: const BoxDecoration(color: AgriVisionTheme.danger, shape: BoxShape.circle))),
          ]),
          IconButton(icon: const Icon(Icons.settings_outlined), onPressed: () => context.push('/settings')),
        ],
      ),
      body: dashboard.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Error: $e')),
        data: (data) => RefreshIndicator(
          onRefresh: () async => ref.invalidate(dashboardProvider),
          child: ListView(padding: const EdgeInsets.all(16), children: [
            // Active alerts
            if ((data['active_alerts'] ?? 0) > 0) _AlertBanner(count: data['active_alerts']),
            const SizedBox(height: 16),

            // Stats grid
            _StatsGrid(data: data),
            const SizedBox(height: 16),

            // Recent detections
            _SectionHeader(title: '🔬 Recent Detections', onTap: () => context.go('/detections')),
            const SizedBox(height: 8),
            ...(data['recent_detections'] as List? ?? []).take(3).map((d) => _DetectionCard(detection: d)),

            const SizedBox(height: 16),

            // Camera status
            _SectionHeader(title: '📷 Camera Fleet', onTap: () => context.go('/cameras')),
            const SizedBox(height: 8),
            _CameraFleetCard(
              total: data['cameras_total'] ?? 0,
              online: data['cameras_online'] ?? 0,
            ),
            const SizedBox(height: 80), // Bottom nav space
          ]),
        ),
      ),
    );
  }
}

class _AlertBanner extends StatelessWidget {
  final int count;
  const _AlertBanner({required this.count});
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        gradient: const LinearGradient(colors: [Color(0xFFDC2626), Color(0xFFB91C1C)]),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(children: [
        const Text('🚨', style: TextStyle(fontSize: 24)),
        const SizedBox(width: 12),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('$count Active Alert${count > 1 ? 's' : ''}',
              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 14)),
          const Text('Tap to view disease detections', style: TextStyle(color: Colors.white70, fontSize: 11)),
        ])),
        const Icon(Icons.arrow_forward_ios, color: Colors.white, size: 16),
      ]),
    );
  }
}

class _StatsGrid extends StatelessWidget {
  final Map<String, dynamic> data;
  const _StatsGrid({required this.data});
  @override
  Widget build(BuildContext context) {
    final items = [
      {'icon': '🔬', 'label': 'Detections Today', 'value': '${data['detections_today'] ?? 0}', 'color': AgriVisionTheme.danger},
      {'icon': '📷', 'label': 'Images Captured', 'value': '${data['images_today'] ?? 0}', 'color': AgriVisionTheme.accent},
      {'icon': '🌡️', 'label': 'Temperature', 'value': '${data['avg_temp'] ?? '--'}°C', 'color': AgriVisionTheme.warning},
      {'icon': '💧', 'label': 'Soil Moisture', 'value': '${data['avg_soil'] ?? '--'}%', 'color': const Color(0xFF3B82F6)},
    ];
    return GridView.count(crossAxisCount: 2, shrinkWrap: true, physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: 10, crossAxisSpacing: 10, childAspectRatio: 1.8,
      children: items.map((item) => Card(
        child: Padding(padding: const EdgeInsets.all(14), child: Column(
          crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
          Text(item['icon'] as String, style: const TextStyle(fontSize: 20)),
          const Spacer(),
          Text(item['value'] as String, style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: item['color'] as Color)),
          Text(item['label'] as String, style: const TextStyle(fontSize: 10, color: AgriVisionTheme.muted)),
        ])),
      )).toList(),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final String title;
  final VoidCallback? onTap;
  const _SectionHeader({required this.title, this.onTap});
  @override
  Widget build(BuildContext context) {
    return Row(children: [
      Text(title, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: AgriVisionTheme.primary)),
      const Spacer(),
      if (onTap != null) GestureDetector(onTap: onTap,
        child: const Text('View All →', style: TextStyle(fontSize: 12, color: AgriVisionTheme.accent, fontWeight: FontWeight.w600)),
      ),
    ]);
  }
}

class _DetectionCard extends StatelessWidget {
  final Map<String, dynamic> detection;
  const _DetectionCard({required this.detection});
  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: Container(width: 42, height: 42, decoration: BoxDecoration(
          color: AgriVisionTheme.severityColor(detection['severity'] ?? 'low').withOpacity(0.15),
          borderRadius: BorderRadius.circular(10),
        ), child: const Center(child: Text('🔬', style: TextStyle(fontSize: 20)))),
        title: Text(detection['disease_name'] ?? 'Unknown', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
        subtitle: Text('Camera: ${detection['camera_serial'] ?? '?'} • ${detection['severity'] ?? ''}',
            style: const TextStyle(fontSize: 11, color: AgriVisionTheme.muted)),
        trailing: Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(
            color: AgriVisionTheme.severityColor(detection['severity'] ?? 'low'),
            borderRadius: BorderRadius.circular(6),
          ),
          child: Text('${((detection['confidence'] ?? 0) * 100).toInt()}%',
              style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w800)),
        ),
      ),
    );
  }
}

class _CameraFleetCard extends StatelessWidget {
  final int total;
  final int online;
  const _CameraFleetCard({required this.total, required this.online});
  @override
  Widget build(BuildContext context) {
    return Card(child: Padding(padding: const EdgeInsets.all(16), child: Row(children: [
      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('$online / $total Online', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: AgriVisionTheme.primary)),
        const SizedBox(height: 6),
        ClipRRect(borderRadius: BorderRadius.circular(4),
          child: LinearProgressIndicator(value: total > 0 ? online / total : 0,
            backgroundColor: AgriVisionTheme.border, color: AgriVisionTheme.accent, minHeight: 6)),
      ])),
      const SizedBox(width: 16),
      Container(width: 48, height: 48, decoration: BoxDecoration(
        color: online == total ? AgriVisionTheme.accentLight : const Color(0xFFFEF3C7),
        borderRadius: BorderRadius.circular(12),
      ), child: Center(child: Text(online == total ? '✅' : '⚠️', style: const TextStyle(fontSize: 22)))),
    ])));
  }
}
