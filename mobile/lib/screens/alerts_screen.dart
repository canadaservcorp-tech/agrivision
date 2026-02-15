import 'package:flutter/material.dart';
import '../services/api_service.dart';

class AlertsScreen extends StatefulWidget {
  const AlertsScreen({super.key});
  @override State<AlertsScreen> createState() => _AlertsScreenState();
}

class _AlertsScreenState extends State<AlertsScreen> {
  List _alerts = [];
  bool _loading = true;

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    try { _alerts = await ApiService.getAlerts(); } catch (e) { print(e); }
    setState(() => _loading = false);
  }

  Color _severityColor(String s) => switch(s) { 'critical' => Colors.red, 'warning' => Colors.orange, 'info' => Colors.blue, _ => Colors.grey };
  IconData _typeIcon(String t) => switch(t) { 'temperature' => Icons.thermostat, 'soil_moisture' => Icons.water_drop, 'disease' => Icons.bug_report, _ => Icons.warning };

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Alerts'), backgroundColor: const Color(0xFF15803D), foregroundColor: Colors.white),
      body: _loading ? const Center(child: CircularProgressIndicator())
        : _alerts.isEmpty ? const Center(child: Text('No alerts'))
        : ListView.builder(
            padding: const EdgeInsets.all(16), itemCount: _alerts.length,
            itemBuilder: (ctx, i) {
              final a = _alerts[i];
              return Card(
                margin: const EdgeInsets.only(bottom: 8),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                child: ListTile(
                  leading: CircleAvatar(backgroundColor: _severityColor(a['severity'] ?? '').withOpacity(0.15), child: Icon(_typeIcon(a['type'] ?? ''), color: _severityColor(a['severity'] ?? ''))),
                  title: Text(a['title'] ?? '', style: const TextStyle(fontWeight: FontWeight.w600)),
                  subtitle: Text(a['message'] ?? ''),
                  trailing: a['read'] == true ? null : Container(width: 8, height: 8, decoration: const BoxDecoration(color: Colors.red, shape: BoxShape.circle)),
                ),
              );
            },
          ),
    );
  }
}
