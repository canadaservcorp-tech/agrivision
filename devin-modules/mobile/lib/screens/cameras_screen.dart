import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../config/theme.dart';
import '../services/mock_data.dart';

class CamerasScreen extends StatefulWidget {
  const CamerasScreen({super.key});

  @override
  State<CamerasScreen> createState() => _CamerasScreenState();
}

class _CamerasScreenState extends State<CamerasScreen> {
  String _search = '';
  String _statusFilter = 'all'; // all, online, offline

  List<Map<String, dynamic>> get _filtered {
    var cameras = MockData.cameras;
    if (_statusFilter == 'online') cameras = cameras.where((c) => c['online'] == true).toList();
    if (_statusFilter == 'offline') cameras = cameras.where((c) => c['online'] != true).toList();
    if (_search.isNotEmpty) {
      cameras = cameras.where((c) =>
        (c['serial'] as String).toLowerCase().contains(_search.toLowerCase()) ||
        (c['zone'] as String).toLowerCase().contains(_search.toLowerCase())
      ).toList();
    }
    return cameras;
  }

  @override
  Widget build(BuildContext context) {
    final allCameras = MockData.cameras;
    final online = allCameras.where((c) => c['online'] == true).length;
    final cameras = _filtered;

    return Scaffold(
      appBar: AppBar(
        title: const Text('📷 Camera Fleet'),
        actions: [
          Padding(padding: const EdgeInsets.only(right: 16), child: Center(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(color: AgriTheme.accentLight, borderRadius: BorderRadius.circular(8)),
              child: Text('$online/${allCameras.length} Online', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AgriTheme.accent)),
            ),
          )),
        ],
      ),
      body: Column(children: [
        // Search bar
        Padding(
          padding: const EdgeInsets.fromLTRB(12, 8, 12, 4),
          child: TextField(
            onChanged: (v) => setState(() => _search = v),
            decoration: InputDecoration(
              hintText: 'Search cameras or zones...',
              prefixIcon: const Icon(Icons.search, size: 20),
              suffixIcon: _search.isNotEmpty ? IconButton(icon: const Icon(Icons.clear, size: 18), onPressed: () => setState(() => _search = '')) : null,
              isDense: true,
              contentPadding: const EdgeInsets.symmetric(vertical: 10),
            ),
          ),
        ),
        // Filter chips
        SizedBox(height: 40, child: ListView(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: 12),
          children: [
            _filterChip('all', 'All (${allCameras.length})'),
            _filterChip('online', 'Online ($online)'),
            _filterChip('offline', 'Offline (${allCameras.length - online})'),
          ],
        )),
        const SizedBox(height: 4),
        // Camera grid
        Expanded(child: cameras.isEmpty
          ? Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
              const Text('📷', style: TextStyle(fontSize: 48)),
              const SizedBox(height: 12),
              Text('No cameras found', style: TextStyle(color: Theme.of(context).textTheme.bodySmall?.color?.withOpacity(0.5))),
            ]))
          : GridView.builder(
            padding: const EdgeInsets.all(12),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 2, mainAxisSpacing: 8, crossAxisSpacing: 8, childAspectRatio: 0.78),
            itemCount: cameras.length,
            itemBuilder: (_, i) {
          final cam = cameras[i];
          final isOnline = cam['online'] == true;
          final battery = cam['battery'] as int;
          final rssi = cam['rssi'] as int;
          final sdBuf = cam['sd_buffered'] as int;

          return Card(
            child: InkWell(
              onTap: () => context.push('/camera/${cam['serial']}'),
              borderRadius: BorderRadius.circular(14),
              child: Padding(padding: const EdgeInsets.all(12), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                // Status dot + serial
                Row(children: [
                  Container(width: 10, height: 10, decoration: BoxDecoration(
                    shape: BoxShape.circle, color: isOnline ? AgriTheme.accent : AgriTheme.danger)),
                  const SizedBox(width: 6),
                  Expanded(child: Text(cam['serial'] as String, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 11), overflow: TextOverflow.ellipsis)),
                ]),
                const SizedBox(height: 4),
                Text(cam['zone'] as String, style: const TextStyle(fontSize: 10, color: AgriTheme.muted)),
                const Spacer(),

                // Status text
                Text(isOnline ? 'Online' : 'Offline', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700,
                    color: isOnline ? AgriTheme.accent : AgriTheme.danger)),
                const SizedBox(height: 6),

                // Battery
                Row(children: [
                  Icon(battery > 50 ? Icons.battery_full : battery > 20 ? Icons.battery_3_bar : Icons.battery_alert,
                      size: 16, color: battery > 20 ? AgriTheme.accent : AgriTheme.danger),
                  const SizedBox(width: 4),
                  Text('$battery%', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600,
                      color: battery > 20 ? AgriTheme.textColor : AgriTheme.danger)),
                  const Spacer(),
                  Icon(Icons.wifi, size: 14, color: rssi > -65 ? AgriTheme.accent : rssi > -80 ? AgriTheme.warning : AgriTheme.danger),
                  const SizedBox(width: 2),
                  Text('${rssi}dBm', style: const TextStyle(fontSize: 10, color: AgriTheme.muted)),
                ]),
                const SizedBox(height: 6),

                // Images + SD buffer
                Row(children: [
                  Text('📸 ${cam['images_today']}', style: const TextStyle(fontSize: 10, color: AgriTheme.muted)),
                  if (sdBuf > 0) ...[
                    const Spacer(),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                      decoration: BoxDecoration(color: const Color(0xFFFEF3C7), borderRadius: BorderRadius.circular(4)),
                      child: Text('💾 $sdBuf', style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: Color(0xFF92400E))),
                    ),
                  ],
                ]),
                const SizedBox(height: 4),
                Text('Last: ${cam['last_image_ago']} ago', style: const TextStyle(fontSize: 9, color: AgriTheme.muted)),
              ])),
            ),
          );
        },
      )),
      ]),
    );
  }

  Widget _filterChip(String value, String label) {
    final sel = _statusFilter == value;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: ChoiceChip(
        label: Text(label, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: sel ? Colors.white : AgriTheme.primary)),
        selected: sel,
        selectedColor: AgriTheme.primary,
        onSelected: (_) => setState(() => _statusFilter = value),
        side: BorderSide(color: sel ? AgriTheme.primary : AgriTheme.border),
        padding: const EdgeInsets.symmetric(horizontal: 4),
      ),
    );
  }
}
