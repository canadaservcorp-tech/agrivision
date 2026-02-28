// ============================================================
// detections_screen.dart
// ============================================================
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../config/theme.dart';
import '../services/api_service.dart';

final detectionsProvider = FutureProvider<List>((ref) => ApiService().getDetections(limit: 50));

class DetectionsScreen extends ConsumerWidget {
  const DetectionsScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final detections = ref.watch(detectionsProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('🔬 Detections')),
      body: detections.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Error: $e')),
        data: (list) => list.isEmpty
            ? const Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
                Text('🌿', style: TextStyle(fontSize: 48)),
                SizedBox(height: 12),
                Text('No detections yet', style: TextStyle(color: AgriVisionTheme.muted)),
                Text('Your crops are looking healthy!', style: TextStyle(color: AgriVisionTheme.muted, fontSize: 12)),
              ]))
            : RefreshIndicator(
                onRefresh: () async => ref.invalidate(detectionsProvider),
                child: ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: list.length,
                  itemBuilder: (_, i) {
                    final d = list[i];
                    return Card(
                      margin: const EdgeInsets.only(bottom: 10),
                      child: Padding(padding: const EdgeInsets.all(14), child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Row(children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: AgriVisionTheme.severityColor(d['severity'] ?? 'low'),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text((d['severity'] ?? '').toUpperCase(),
                                style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.w800)),
                          ),
                          const SizedBox(width: 8),
                          Expanded(child: Text(d['disease_name'] ?? '', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14))),
                          Text('${((d['confidence'] ?? 0) * 100).toInt()}%', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16, color: AgriVisionTheme.primary)),
                        ]),
                        const SizedBox(height: 8),
                        Text('📷 ${d['camera_serial'] ?? ''} • ${d['detected_at'] ?? ''}',
                            style: const TextStyle(fontSize: 11, color: AgriVisionTheme.muted)),
                        if (d['treatment'] != null) ...[
                          const SizedBox(height: 8),
                          Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(color: AgriVisionTheme.accentLight, borderRadius: BorderRadius.circular(8)),
                            child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                              const Text('💊 ', style: TextStyle(fontSize: 14)),
                              Expanded(child: Text(d['treatment'], style: const TextStyle(fontSize: 11, color: AgriVisionTheme.primary))),
                            ]),
                          ),
                        ],
                      ])),
                    );
                  },
                ),
              ),
      ),
    );
  }
}
