import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../config/theme.dart';
import '../services/mock_data.dart';

class DetectionsScreen extends StatefulWidget {
  const DetectionsScreen({super.key});
  @override
  State<DetectionsScreen> createState() => _DetectionsState();
}

class _DetectionsState extends State<DetectionsScreen> {
  String _filter = 'all';

  List<Map<String, dynamic>> get _filtered {
    if (_filter == 'all') return MockData.detections;
    return MockData.detections.where((d) => d['severity'] == _filter).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('🔬 Disease Detections')),
      body: Column(children: [
        // Filter chips
        SizedBox(height: 44, child: ListView(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: 16),
          children: [
            _chip('all', 'All (${MockData.detections.length})'),
            _chip('critical', '🔴 Critical'),
            _chip('high', '🟠 High'),
            _chip('medium', '🟡 Medium'),
            _chip('low', '🟢 Low'),
          ],
        )),
        const SizedBox(height: 8),
        Expanded(child: _filtered.isEmpty
            ? const Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
                Text('🌿', style: TextStyle(fontSize: 48)),
                SizedBox(height: 12),
                Text('No detections in this category', style: TextStyle(color: AgriTheme.muted)),
              ]))
            : RefreshIndicator(
                onRefresh: () async { await Future.delayed(const Duration(milliseconds: 800)); setState(() {}); },
                color: AgriTheme.accent,
                child: ListView.builder(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                itemCount: _filtered.length,
                itemBuilder: (_, i) {
                  final d = _filtered[i];
                  final sev = d['severity'] as String;
                  return Card(
                    margin: const EdgeInsets.only(bottom: 10),
                    child: InkWell(
                      onTap: () => context.push('/detection/${d['id']}'),
                      borderRadius: BorderRadius.circular(14),
                      child: Padding(padding: const EdgeInsets.all(14), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Row(children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(color: AgriTheme.severityColor(sev), borderRadius: BorderRadius.circular(6)),
                            child: Text(sev.toUpperCase(), style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.w800)),
                          ),
                          const SizedBox(width: 8),
                          Expanded(child: Text(d['disease_name'] as String, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14))),
                          Text('${((d['confidence'] as double) * 100).toInt()}%', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16, color: AgriTheme.primary)),
                        ]),
                        const SizedBox(height: 8),
                        Row(children: [
                          const Icon(Icons.videocam, size: 14, color: AgriTheme.muted),
                          const SizedBox(width: 4),
                          Text(d['camera_serial'] as String, style: const TextStyle(fontSize: 11, color: AgriTheme.muted)),
                          const SizedBox(width: 12),
                          const Icon(Icons.grass, size: 14, color: AgriTheme.muted),
                          const SizedBox(width: 4),
                          Text(d['crop'] as String, style: const TextStyle(fontSize: 11, color: AgriTheme.muted)),
                          const Spacer(),
                          Text(d['detected_at'] as String, style: const TextStyle(fontSize: 10, color: AgriTheme.muted)),
                        ]),
                        const SizedBox(height: 10),
                        Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(color: AgriTheme.accentLight, borderRadius: BorderRadius.circular(8)),
                          child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            const Text('💊 ', style: TextStyle(fontSize: 14)),
                            Expanded(child: Text(d['treatment'] as String, style: const TextStyle(fontSize: 11, color: AgriTheme.primary, height: 1.4))),
                          ]),
                        ),
                      ])),
                    ),
                  );
                },
              ))),
      ]),
    );
  }

  Widget _chip(String value, String label) {
    final sel = _filter == value;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: ChoiceChip(
        label: Text(label, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: sel ? Colors.white : AgriTheme.primary)),
        selected: sel,
        selectedColor: AgriTheme.primary,
        onSelected: (_) => setState(() => _filter = value),
        side: BorderSide(color: sel ? AgriTheme.primary : AgriTheme.border),
        padding: const EdgeInsets.symmetric(horizontal: 4),
      ),
    );
  }
}
