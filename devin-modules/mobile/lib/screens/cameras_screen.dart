import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../config/theme.dart';
import '../services/api_service.dart';

final camerasProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final overview = await ApiService().getDashboardOverview();
  return overview;
});

class CamerasScreen extends ConsumerWidget {
  const CamerasScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final data = ref.watch(camerasProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('📷 Camera Fleet')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {},
        backgroundColor: AgriVisionTheme.primary,
        icon: const Icon(Icons.qr_code_scanner, color: Colors.white),
        label: const Text('Add Camera', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
      ),
      body: data.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Error: $e')),
        data: (overview) {
          final cameras = (overview['cameras'] as List?) ?? [];
          if (cameras.isEmpty) {
            return Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
              const Text('📷', style: TextStyle(fontSize: 48)),
              const SizedBox(height: 12),
              const Text('No cameras registered', style: TextStyle(color: AgriVisionTheme.muted, fontWeight: FontWeight.w600)),
              const SizedBox(height: 16),
              ElevatedButton.icon(onPressed: () {}, icon: const Icon(Icons.add), label: const Text('Add First Camera')),
            ]));
          }
          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(camerasProvider),
            child: GridView.builder(
              padding: const EdgeInsets.all(16),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 2, mainAxisSpacing: 10, crossAxisSpacing: 10, childAspectRatio: 0.85),
              itemCount: cameras.length,
              itemBuilder: (_, i) {
                final cam = cameras[i];
                final online = cam['online'] == true;
                final battery = (cam['battery'] ?? 0).toInt();
                return Card(child: Padding(padding: const EdgeInsets.all(12), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Row(children: [
                    Container(width: 10, height: 10, decoration: BoxDecoration(shape: BoxShape.circle, color: online ? AgriVisionTheme.accent : AgriVisionTheme.danger)),
                    const SizedBox(width: 6),
                    Expanded(child: Text(cam['serial'] ?? 'CAM-???', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12))),
                  ]),
                  const Spacer(),
                  Text(online ? 'Online' : 'Offline', style: TextStyle(fontSize: 11, color: online ? AgriVisionTheme.accent : AgriVisionTheme.danger, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 8),
                  Row(children: [
                    Icon(battery > 50 ? Icons.battery_full : battery > 20 ? Icons.battery_3_bar : Icons.battery_alert,
                        size: 16, color: battery > 20 ? AgriVisionTheme.accent : AgriVisionTheme.danger),
                    const SizedBox(width: 4),
                    Text('$battery%', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600)),
                    const Spacer(),
                    const Icon(Icons.wifi, size: 14, color: AgriVisionTheme.muted),
                    const SizedBox(width: 2),
                    Text('${cam['rssi'] ?? '--'}dBm', style: const TextStyle(fontSize: 10, color: AgriVisionTheme.muted)),
                  ]),
                  const SizedBox(height: 6),
                  Text('📸 ${cam['images_today'] ?? 0} today', style: const TextStyle(fontSize: 10, color: AgriVisionTheme.muted)),
                ])));
              },
            ),
          );
        },
      ),
    );
  }
}
