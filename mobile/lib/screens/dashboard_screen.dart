import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/device_provider.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});
  @override State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() => context.read<DeviceProvider>().loadDevices());
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final devices = context.watch<DeviceProvider>();
    return Scaffold(
      backgroundColor: const Color(0xFFF0FDF4),
      appBar: AppBar(
        title: Text('Welcome, ${auth.user?['name'] ?? 'Farmer'}'),
        backgroundColor: const Color(0xFF15803D), foregroundColor: Colors.white,
        actions: [
          IconButton(icon: const Icon(Icons.notifications), onPressed: () => Navigator.pushNamed(context, '/alerts')),
          IconButton(icon: const Icon(Icons.logout), onPressed: () { auth.logout(); Navigator.pushReplacementNamed(context, '/login'); }),
        ],
      ),
      body: devices.loading
        ? const Center(child: CircularProgressIndicator())
        : devices.devices.isEmpty
          ? Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
              Icon(Icons.devices, size: 64, color: Colors.grey[400]),
              const SizedBox(height: 16),
              Text('No devices yet', style: TextStyle(fontSize: 18, color: Colors.grey[600])),
              const SizedBox(height: 8),
              const Text('Add your first Agrivision module to start monitoring'),
            ]))
          : RefreshIndicator(
              onRefresh: () => devices.loadDevices(),
              child: ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: devices.devices.length,
                itemBuilder: (ctx, i) {
                  final d = devices.devices[i];
                  final online = d['status'] == 'online';
                  return Card(
                    margin: const EdgeInsets.only(bottom: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    child: ListTile(
                      contentPadding: const EdgeInsets.all(16),
                      leading: CircleAvatar(
                        backgroundColor: online ? Colors.green[100] : Colors.grey[200],
                        child: Icon(Icons.sensors, color: online ? Colors.green[700] : Colors.grey),
                      ),
                      title: Text(d['name'] ?? 'Device ${d['id']}', style: const TextStyle(fontWeight: FontWeight.w600)),
                      subtitle: Text('${d['crop_type'] ?? 'Unknown crop'} • ${online ? 'Online' : 'Offline'}'),
                      trailing: const Icon(Icons.chevron_right),
                      onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => DeviceDetailPlaceholder(device: d))),
                    ),
                  );
                },
              ),
            ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () { /* TODO: Add device via QR scan */ },
        icon: const Icon(Icons.add), label: const Text('Add Device'),
        backgroundColor: const Color(0xFF15803D), foregroundColor: Colors.white,
      ),
    );
  }
}

class DeviceDetailPlaceholder extends StatelessWidget {
  final Map<String, dynamic> device;
  const DeviceDetailPlaceholder({super.key, required this.device});
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(device['name'] ?? 'Device'), backgroundColor: const Color(0xFF15803D), foregroundColor: Colors.white),
      body: const Center(child: Text('Device detail with sensor charts — see device_detail_screen.dart')),
    );
  }
}
