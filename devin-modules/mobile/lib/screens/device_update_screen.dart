import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

/// Agrivision Device & Software Update Management Screen
/// Allows farmer to:
/// - View current device firmware version
/// - Check for OTA or SD2 updates
/// - Monitor update progress in real-time
/// - View update history
/// - Prepare SD2 update card (download package)
/// - Monitor hardware status (battery, camera, sensors)
class DeviceUpdateScreen extends StatefulWidget {
  final String farmId;
  final String deviceId;

  const DeviceUpdateScreen({
    super.key,
    required this.farmId,
    required this.deviceId,
  });

  @override
  State<DeviceUpdateScreen> createState() => _DeviceUpdateScreenState();
}

class _DeviceUpdateScreenState extends State<DeviceUpdateScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final DeviceService _service = DeviceService();

  DeviceStatus? _device;
  UpdateStatus? _updateStatus;
  List<UpdateHistoryEntry> _history = [];
  UpdateManifest? _available;
  bool _loading = true;
  bool _checking = false;
  bool _polling = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadAll();
  }

  Future<void> _loadAll() async {
    setState(() => _loading = true);
    await Future.wait([
      _loadDeviceStatus(),
      _loadUpdateStatus(),
      _loadHistory(),
    ]);
    setState(() => _loading = false);
  }

  Future<void> _loadDeviceStatus() async {
    try {
      final device = await _service.getDeviceStatus(widget.farmId);
      if (mounted) setState(() => _device = device);
    } catch (_) {}
  }

  Future<void> _loadUpdateStatus() async {
    try {
      final status = await _service.getUpdateStatus(widget.farmId);
      if (mounted) {
        setState(() => _updateStatus = status);
        if (status.status == 'installing' || status.status == 'verifying' || status.status == 'backing_up') {
          _startPolling();
        }
      }
    } catch (_) {}
  }

  Future<void> _loadHistory() async {
    try {
      final history = await _service.getUpdateHistory(widget.farmId);
      if (mounted) setState(() => _history = history);
    } catch (_) {}
  }

  void _startPolling() {
    if (_polling) return;
    _polling = true;
    _pollProgress();
  }

  Future<void> _pollProgress() async {
    while (_polling && mounted) {
      await Future.delayed(const Duration(seconds: 3));
      try {
        final status = await _service.getUpdateStatus(widget.farmId);
        if (mounted) setState(() => _updateStatus = status);
        if (status.status == 'completed' || status.status == 'failed' || status.status == 'idle') {
          _polling = false;
          _loadAll();
        }
      } catch (_) {}
    }
  }

  Future<void> _checkForUpdates() async {
    setState(() => _checking = true);
    try {
      final manifest = await _service.checkForUpdates(widget.farmId);
      if (mounted) {
        setState(() { _available = manifest; _checking = false; });
        if (manifest == null) {
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
            content: Text('Your device is up to date'),
            backgroundColor: Color(0xFF2E7D32),
          ));
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() => _checking = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Check failed: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Device & Updates'),
        backgroundColor: const Color(0xFF1B5E20),
        foregroundColor: Colors.white,
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: Colors.white,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white60,
          tabs: const [
            Tab(icon: Icon(Icons.developer_board), text: 'Device'),
            Tab(icon: Icon(Icons.system_update), text: 'Update'),
            Tab(icon: Icon(Icons.history), text: 'History'),
          ],
        ),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : TabBarView(
              controller: _tabController,
              children: [
                _buildDeviceTab(),
                _buildUpdateTab(),
                _buildHistoryTab(),
              ],
            ),
    );
  }

  // ============ TAB 1: Device Status ============
  Widget _buildDeviceTab() {
    if (_device == null) {
      return const Center(child: Text('Device not connected', style: TextStyle(color: Colors.grey)));
    }

    return RefreshIndicator(
      onRefresh: _loadDeviceStatus,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Device card
          _card('System', Icons.memory, const Color(0xFF1B5E20), [
            _row('Model', 'CM4 + Arducam 64MP'),
            _row('Firmware', 'v${_device!.firmwareVersion}'),
            _row('Uptime', _device!.uptime),
            _row('Last Boot', _formatDateTime(_device!.lastBoot)),
            _row('Device ID', widget.deviceId),
          ]),
          const SizedBox(height: 12),

          // Camera
          _card('Camera', Icons.camera_alt, const Color(0xFFE91E63), [
            _row('Module', 'Arducam 64MP Hawkeye'),
            _row('Sensor', 'Samsung IMX682'),
            _row('Mode', '24MP (6000×4000)'),
            _row('Photos Today', '${_device!.photosToday}'),
            _row('Total Stored', '${_device!.totalPhotos}'),
            _row('Last Capture', _formatDateTime(_device!.lastCapture)),
          ]),
          const SizedBox(height: 12),

          // Battery
          _card('Power', Icons.battery_charging_full, _batteryColor(_device!.batteryPercent), [
            _row('Internal Battery', '${_device!.batteryPercent}% (${_device!.batteryVoltage}V)'),
            _row('Type', 'LiFePO4 12V 6Ah'),
            _row('Status', _device!.chargingSource ?? 'Discharging'),
            _row('Est. Runtime', _device!.estimatedRuntime),
            _row('Solar', _device!.solarConnected ? 'Connected' : 'Not connected'),
            _row('DC Adapter', _device!.dcAdapterConnected ? 'Connected' : 'Not connected'),
            _row('Ext Battery', _device!.extBatteryConnected ? 'Connected' : 'Not connected'),
          ]),
          const SizedBox(height: 12),

          // Storage
          _card('Storage', Icons.sd_card, const Color(0xFF1565C0), [
            _row('SD1 (OS)', '${_device!.sd1UsedGb}/${_device!.sd1CapacityGb} GB'),
            _row('SD2 (Update/Cache)', _device!.sd2Detected
                ? '${_device!.sd2UsedGb}/${_device!.sd2CapacityGb} GB'
                : 'Not inserted'),
            _row('USB Drive (CCTV)', _device!.usbDriveDetected
                ? '${_device!.usbUsedGb}/${_device!.usbCapacityGb} GB'
                : 'Not connected'),
          ]),
          const SizedBox(height: 12),

          // Connectivity
          _card('Connectivity', Icons.wifi, const Color(0xFF00838F), [
            _row('WiFi', _device!.wifiConnected ? 'Connected (${_device!.wifiSsid})' : 'Not connected'),
            _row('4G LTE', _device!.lteConnected ? 'Connected (${_device!.lteCarrier})' : 'Not connected'),
            _row('LoRaWAN', _device!.loraConnected ? 'Active' : 'Inactive'),
            _row('Signal', '${_device!.signalStrength} dBm'),
          ]),
          const SizedBox(height: 12),

          // Sensors
          _card('Sensors', Icons.sensors, const Color(0xFFE65100), [
            _row('Temperature', '${_device!.temperature ?? "--"}°C'),
            _row('Humidity', '${_device!.humidity ?? "--"}%'),
            _row('Soil Moisture', '${_device!.soilMoisture ?? "--"}%'),
            _row('UV Index', '${_device!.uvIndex ?? "--"}'),
            _row('Light', '${_device!.lightLevel ?? "--"} lux'),
            _row('Rain Gauge', _device!.rainGaugeActive ? 'Active' : 'Inactive'),
          ]),
        ],
      ),
    );
  }

  // ============ TAB 2: Update Management ============
  Widget _buildUpdateTab() {
    return RefreshIndicator(
      onRefresh: _loadUpdateStatus,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Current version banner
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: const LinearGradient(colors: [Color(0xFF1B5E20), Color(0xFF2E7D32)]),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(children: [
              const Icon(Icons.verified, color: Colors.white, size: 36),
              const SizedBox(width: 14),
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('Current Version', style: TextStyle(color: Colors.white70, fontSize: 12)),
                Text('v${_device?.firmwareVersion ?? "—"}',
                    style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.bold)),
              ]),
              const Spacer(),
              ElevatedButton(
                onPressed: _checking ? null : _checkForUpdates,
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.white, foregroundColor: const Color(0xFF1B5E20),
                ),
                child: _checking
                    ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                    : const Text('Check'),
              ),
            ]),
          ),
          const SizedBox(height: 16),

          // Update progress (if active)
          if (_updateStatus != null && !['idle', 'completed'].contains(_updateStatus!.status)) ...[
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFFFFF3E0), borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.orange.shade200),
              ),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Row(children: [
                  const Icon(Icons.system_update, color: Colors.orange),
                  const SizedBox(width: 8),
                  Text('Update in Progress', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.orange.shade800)),
                ]),
                const SizedBox(height: 12),
                LinearProgressIndicator(
                  value: _updateStatus!.progress,
                  backgroundColor: Colors.orange.shade100,
                  valueColor: const AlwaysStoppedAnimation(Colors.orange),
                  minHeight: 8,
                  borderRadius: BorderRadius.circular(4),
                ),
                const SizedBox(height: 8),
                Text(_updateStatus!.message, style: const TextStyle(fontSize: 12, color: Colors.grey)),
                Text('${(_updateStatus!.progress * 100).toStringAsFixed(0)}%',
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              ]),
            ),
            const SizedBox(height: 16),
          ],

          // Failed update alert
          if (_updateStatus?.status == 'failed') ...[
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.red.shade50, borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.red.shade200),
              ),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Row(children: [
                  const Icon(Icons.error, color: Colors.red),
                  const SizedBox(width: 8),
                  const Text('Update Failed', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.red)),
                ]),
                const SizedBox(height: 8),
                Text(_updateStatus!.message, style: const TextStyle(fontSize: 12)),
              ]),
            ),
            const SizedBox(height: 16),
          ],

          // Available update
          if (_available != null) ...[
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFFE8F5E9), borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.green.shade200),
              ),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Row(children: [
                  const Icon(Icons.new_releases, color: Color(0xFF2E7D32)),
                  const SizedBox(width: 8),
                  Text('v${_available!.version} Available',
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Color(0xFF1B5E20))),
                ]),
                const SizedBox(height: 8),
                Text('Released: ${_available!.releaseDate}', style: const TextStyle(fontSize: 12, color: Colors.grey)),
                Text('Size: ${_available!.sizeMb} MB', style: const TextStyle(fontSize: 12, color: Colors.grey)),
                const SizedBox(height: 10),
                const Text('Changelog:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                const SizedBox(height: 4),
                Text(_available!.changelog, style: const TextStyle(fontSize: 12)),
                const SizedBox(height: 14),
                const Divider(),
                const SizedBox(height: 8),
                const Text('Update Methods', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                const SizedBox(height: 10),
                // Method 1: SD Card
                _updateMethod(
                  Icons.sd_card, 'SD Card Update', 'Download package → copy to SD2 → insert → reboot',
                  'Download for SD2', () => _downloadForSd2(),
                ),
                const SizedBox(height: 8),
                // Method 2: OTA (if connected)
                _updateMethod(
                  Icons.cloud_download, 'Over-the-Air (OTA)', 'Requires WiFi or 4G connection on device',
                  'Install OTA', _device?.wifiConnected == true || _device?.lteConnected == true
                      ? () => _installOta() : null,
                ),
              ]),
            ),
          ] else if (!_checking) ...[
            // Update methods info
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.grey.shade50, borderRadius: BorderRadius.circular(12),
              ),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('How to Update', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                const SizedBox(height: 12),
                _infoRow(Icons.sd_card, 'SD Card Method',
                    'Download update → copy to SD2 card → insert into device SD2 slot → device auto-installs on next boot'),
                const SizedBox(height: 10),
                _infoRow(Icons.cloud_download, 'OTA Method',
                    'Device downloads & installs automatically when connected to WiFi or 4G'),
                const SizedBox(height: 10),
                _infoRow(Icons.security, 'Safety',
                    'Every update creates a backup first. If installation fails, the device auto-rolls back to previous version'),
              ]),
            ),
          ],
          const SizedBox(height: 16),

          // Hardware Info
          _card('Hardware Specs', Icons.developer_board, const Color(0xFF37474F), [
            _row('Board', 'Custom CM4 IO Board v2.1'),
            _row('Processor', 'BCM2711 Quad A72 1.5GHz'),
            _row('RAM', '4GB LPDDR4'),
            _row('Camera', 'Arducam 64MP Hawkeye (IMX682)'),
            _row('Photo Mode', '24MP (6000×4000)'),
            _row('Battery', 'LiFePO4 12V 6Ah (400g)'),
            _row('Runtime', '~8.4 days (no solar)'),
            _row('Enclosure', '200×150×75mm IP66 ABS'),
          ]),
        ],
      ),
    );
  }

  // ============ TAB 3: Update History ============
  Widget _buildHistoryTab() {
    if (_history.isEmpty) {
      return Center(child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.history, size: 64, color: Colors.grey.shade300),
          const SizedBox(height: 12),
          const Text('No update history', style: TextStyle(color: Colors.grey)),
        ],
      ));
    }

    return RefreshIndicator(
      onRefresh: _loadHistory,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _history.length,
        itemBuilder: (ctx, i) {
          final entry = _history[_history.length - 1 - i]; // Newest first
          return Card(
            margin: const EdgeInsets.only(bottom: 8),
            child: ListTile(
              leading: Icon(
                entry.success ? Icons.check_circle : Icons.error,
                color: entry.success ? const Color(0xFF2E7D32) : Colors.red,
              ),
              title: Text('v${entry.version}', style: const TextStyle(fontWeight: FontWeight.bold)),
              subtitle: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(_formatDateTime(entry.installedAt), style: const TextStyle(fontSize: 11, color: Colors.grey)),
                if (entry.changelog.isNotEmpty)
                  Text(entry.changelog, style: const TextStyle(fontSize: 11), maxLines: 2, overflow: TextOverflow.ellipsis),
              ]),
              trailing: Text(
                entry.success ? 'Success' : 'Failed',
                style: TextStyle(
                  color: entry.success ? const Color(0xFF2E7D32) : Colors.red,
                  fontSize: 11, fontWeight: FontWeight.bold,
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  // ============ Actions ============

  Future<void> _downloadForSd2() async {
    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
      content: Text('Downloading update package for SD2...'),
      backgroundColor: Color(0xFF1B5E20),
    ));
    // Download manifest + firmware.tar.gz → save to phone → user copies to SD2
    await _service.downloadSd2Package(widget.farmId, _available!.version);
  }

  Future<void> _installOta() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Install OTA Update?'),
        content: Text('Install v${_available!.version}? Device will reboot during installation.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF1B5E20)),
            child: const Text('Install', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );

    if (confirm == true) {
      await _service.triggerOtaUpdate(widget.farmId, _available!.version);
      _startPolling();
    }
  }

  // ============ Helpers ============

  Color _batteryColor(int percent) {
    if (percent > 60) return const Color(0xFF2E7D32);
    if (percent > 30) return Colors.orange;
    return Colors.red;
  }

  String _formatDateTime(DateTime? dt) {
    if (dt == null) return '—';
    return '${dt.year}-${dt.month.toString().padLeft(2, '0')}-${dt.day.toString().padLeft(2, '0')} '
           '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
  }

  Widget _card(String title, IconData icon, Color color, List<Widget> children) {
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Icon(icon, color: color, size: 20),
            const SizedBox(width: 8),
            Text(title, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: color)),
          ]),
          const SizedBox(height: 10),
          ...children,
        ]),
      ),
    );
  }

  Widget _row(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
        Text(label, style: const TextStyle(fontSize: 12, color: Colors.grey)),
        Flexible(child: Text(value, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500), textAlign: TextAlign.end)),
      ]),
    );
  }

  Widget _updateMethod(IconData icon, String title, String desc, String btnText, VoidCallback? onPressed) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white, borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Row(children: [
        Icon(icon, color: const Color(0xFF2E7D32), size: 28),
        const SizedBox(width: 12),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
          Text(desc, style: const TextStyle(fontSize: 10, color: Colors.grey)),
        ])),
        ElevatedButton(
          onPressed: onPressed,
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFF1B5E20),
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            textStyle: const TextStyle(fontSize: 11),
          ),
          child: Text(btnText),
        ),
      ]),
    );
  }

  Widget _infoRow(IconData icon, String title, String desc) {
    return Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Icon(icon, color: const Color(0xFF2E7D32), size: 20),
      const SizedBox(width: 10),
      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
        Text(desc, style: const TextStyle(fontSize: 11, color: Colors.grey)),
      ])),
    ]);
  }

  @override
  void dispose() { _tabController.dispose(); _polling = false; super.dispose(); }
}

// ============ Service ============

class DeviceService {
  final String baseUrl;
  final String? authToken;

  DeviceService({this.baseUrl = 'https://api.agrivision.ca/api/v1', this.authToken});

  Map<String, String> get _headers => {
    'Content-Type': 'application/json',
    if (authToken != null) 'Authorization': 'Bearer $authToken',
  };

  Future<DeviceStatus> getDeviceStatus(String farmId) async {
    final res = await http.get(Uri.parse('$baseUrl/devices/$farmId/status'), headers: _headers);
    if (res.statusCode != 200) throw Exception('Failed');
    return DeviceStatus.fromJson(jsonDecode(res.body)['data']);
  }

  Future<UpdateStatus> getUpdateStatus(String farmId) async {
    final res = await http.get(Uri.parse('$baseUrl/devices/$farmId/update/status'), headers: _headers);
    if (res.statusCode != 200) throw Exception('Failed');
    return UpdateStatus.fromJson(jsonDecode(res.body)['data']);
  }

  Future<UpdateManifest?> checkForUpdates(String farmId) async {
    final res = await http.get(Uri.parse('$baseUrl/devices/$farmId/update/check'), headers: _headers);
    if (res.statusCode == 204) return null;
    if (res.statusCode != 200) throw Exception('Failed');
    return UpdateManifest.fromJson(jsonDecode(res.body)['data']);
  }

  Future<List<UpdateHistoryEntry>> getUpdateHistory(String farmId) async {
    final res = await http.get(Uri.parse('$baseUrl/devices/$farmId/update/history'), headers: _headers);
    if (res.statusCode != 200) throw Exception('Failed');
    return (jsonDecode(res.body)['data'] as List).map((e) => UpdateHistoryEntry.fromJson(e)).toList();
  }

  Future<void> triggerOtaUpdate(String farmId, String version) async {
    await http.post(
      Uri.parse('$baseUrl/devices/$farmId/update/ota'),
      headers: _headers,
      body: jsonEncode({'version': version}),
    );
  }

  Future<void> downloadSd2Package(String farmId, String version) async {
    // Triggers download of update package to phone storage
    await http.get(Uri.parse('$baseUrl/devices/$farmId/update/download?version=$version'), headers: _headers);
  }
}

// ============ Models ============

class DeviceStatus {
  final String firmwareVersion;
  final String uptime;
  final DateTime? lastBoot;
  final DateTime? lastCapture;
  final int photosToday;
  final int totalPhotos;
  final int batteryPercent;
  final String batteryVoltage;
  final String? chargingSource;
  final String estimatedRuntime;
  final bool solarConnected;
  final bool dcAdapterConnected;
  final bool extBatteryConnected;
  final int sd1UsedGb, sd1CapacityGb;
  final bool sd2Detected;
  final int sd2UsedGb, sd2CapacityGb;
  final bool usbDriveDetected;
  final int usbUsedGb, usbCapacityGb;
  final bool wifiConnected;
  final String? wifiSsid;
  final bool lteConnected;
  final String? lteCarrier;
  final bool loraConnected;
  final int signalStrength;
  final double? temperature, humidity, soilMoisture, uvIndex, lightLevel;
  final bool rainGaugeActive;

  DeviceStatus({
    required this.firmwareVersion, required this.uptime, this.lastBoot,
    this.lastCapture, this.photosToday = 0, this.totalPhotos = 0,
    this.batteryPercent = 0, this.batteryVoltage = '0',
    this.chargingSource, this.estimatedRuntime = '—',
    this.solarConnected = false, this.dcAdapterConnected = false,
    this.extBatteryConnected = false,
    this.sd1UsedGb = 0, this.sd1CapacityGb = 32,
    this.sd2Detected = false, this.sd2UsedGb = 0, this.sd2CapacityGb = 0,
    this.usbDriveDetected = false, this.usbUsedGb = 0, this.usbCapacityGb = 0,
    this.wifiConnected = false, this.wifiSsid,
    this.lteConnected = false, this.lteCarrier,
    this.loraConnected = false, this.signalStrength = 0,
    this.temperature, this.humidity, this.soilMoisture,
    this.uvIndex, this.lightLevel, this.rainGaugeActive = false,
  });

  factory DeviceStatus.fromJson(Map<String, dynamic> j) => DeviceStatus(
    firmwareVersion: j['firmware_version'] ?? '0.0.0',
    uptime: j['uptime'] ?? '—',
    lastBoot: j['last_boot'] != null ? DateTime.parse(j['last_boot']) : null,
    lastCapture: j['last_capture'] != null ? DateTime.parse(j['last_capture']) : null,
    photosToday: j['photos_today'] ?? 0,
    totalPhotos: j['total_photos'] ?? 0,
    batteryPercent: j['battery_percent'] ?? 0,
    batteryVoltage: j['battery_voltage']?.toString() ?? '0',
    chargingSource: j['charging_source'],
    estimatedRuntime: j['estimated_runtime'] ?? '—',
    solarConnected: j['solar_connected'] ?? false,
    dcAdapterConnected: j['dc_adapter_connected'] ?? false,
    extBatteryConnected: j['ext_battery_connected'] ?? false,
    sd1UsedGb: j['sd1_used_gb'] ?? 0, sd1CapacityGb: j['sd1_capacity_gb'] ?? 32,
    sd2Detected: j['sd2_detected'] ?? false,
    sd2UsedGb: j['sd2_used_gb'] ?? 0, sd2CapacityGb: j['sd2_capacity_gb'] ?? 0,
    usbDriveDetected: j['usb_drive_detected'] ?? false,
    usbUsedGb: j['usb_used_gb'] ?? 0, usbCapacityGb: j['usb_capacity_gb'] ?? 0,
    wifiConnected: j['wifi_connected'] ?? false, wifiSsid: j['wifi_ssid'],
    lteConnected: j['lte_connected'] ?? false, lteCarrier: j['lte_carrier'],
    loraConnected: j['lora_connected'] ?? false,
    signalStrength: j['signal_strength'] ?? 0,
    temperature: (j['temperature'] as num?)?.toDouble(),
    humidity: (j['humidity'] as num?)?.toDouble(),
    soilMoisture: (j['soil_moisture'] as num?)?.toDouble(),
    uvIndex: (j['uv_index'] as num?)?.toDouble(),
    lightLevel: (j['light_level'] as num?)?.toDouble(),
    rainGaugeActive: j['rain_gauge_active'] ?? false,
  );
}

class UpdateStatus {
  final String status;
  final double progress;
  final String message;
  final String? version;
  final String currentVersion;

  UpdateStatus({required this.status, this.progress = 0, this.message = '', this.version, this.currentVersion = ''});

  factory UpdateStatus.fromJson(Map<String, dynamic> j) => UpdateStatus(
    status: j['status'] ?? 'idle',
    progress: (j['progress'] as num?)?.toDouble() ?? 0,
    message: j['message'] ?? '',
    version: j['version'],
    currentVersion: j['current_version'] ?? '',
  );
}

class UpdateManifest {
  final String version;
  final String releaseDate;
  final String changelog;
  final String sizeMb;
  final String minVersion;

  UpdateManifest({required this.version, this.releaseDate = '', this.changelog = '', this.sizeMb = '', this.minVersion = ''});

  factory UpdateManifest.fromJson(Map<String, dynamic> j) => UpdateManifest(
    version: j['version'] ?? '',
    releaseDate: j['release_date'] ?? '',
    changelog: j['changelog'] ?? '',
    sizeMb: j['size_mb']?.toString() ?? '',
    minVersion: j['min_version'] ?? '',
  );
}

class UpdateHistoryEntry {
  final String version;
  final DateTime installedAt;
  final bool success;
  final String changelog;

  UpdateHistoryEntry({required this.version, required this.installedAt, this.success = true, this.changelog = ''});

  factory UpdateHistoryEntry.fromJson(Map<String, dynamic> j) => UpdateHistoryEntry(
    version: j['version'] ?? '',
    installedAt: DateTime.parse(j['installed_at']),
    success: j['success'] ?? true,
    changelog: j['changelog'] ?? '',
  );
}
