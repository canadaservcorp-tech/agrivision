import 'package:flutter/material.dart';
import '../config/theme.dart';
import '../services/mock_data.dart';
import '../services/hub_service.dart';

/// ═══════════════════════════════════════════════════════════
/// MODE CONTROL SCREEN
/// Mode A: CCTV (live surveillance, motion detect, recording)
/// Mode B: Monitoring (AI crop detection, time-lapse, scheduled)
/// ═══════════════════════════════════════════════════════════

enum SystemMode { cctv, monitoring }

class ModeControlScreen extends StatefulWidget {
  const ModeControlScreen({super.key});
  @override
  State<ModeControlScreen> createState() => _ModeControlState();
}

class _ModeControlState extends State<ModeControlScreen> with SingleTickerProviderStateMixin {
  late TabController _tabCtrl;
  final HubService _hub = HubService();

  // Global farm mode
  SystemMode _farmMode = SystemMode.monitoring;
  bool _hddConnected = false;
  bool _hubOnline = false;
  Map<String, dynamic> _hubDisk = {};

  // Per-camera mode overrides (null = follow farm mode)
  final Map<String, SystemMode?> _cameraOverrides = {};

  // CCTV settings
  bool _motionDetection = true;
  bool _continuousRecord = false;
  bool _nightVision = true;
  bool _audioAlert = false;
  double _motionSensitivity = 0.7;
  int _recordQuality = 2; // 0=Low, 1=Med, 2=High, 3=Ultra
  int _retentionDays = 7;
  String _streamProtocol = 'RTSP';

  // Monitoring settings
  int _captureIntervalMin = 10;
  bool _aiEnabled = true;
  bool _timelapse = true;
  int _timelapseIntervalSec = 60;
  bool _nightCapture = false;
  double _confidenceThreshold = 0.65;
  bool _autoTreatmentAlert = true;
  int _captureResolution = 2;

  // Schedule
  TimeOfDay _scheduleStart = const TimeOfDay(hour: 6, minute: 0);
  TimeOfDay _scheduleEnd = const TimeOfDay(hour: 20, minute: 0);
  bool _scheduleEnabled = true;
  bool _autoSwitch = false;

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: 3, vsync: this);
    _hub.addListener(_onHubUpdate);
    _hub.init();
  }

  void _onHubUpdate() {
    if (!mounted) return;
    setState(() {
      _hubOnline = _hub.online;
      _hddConnected = _hub.hddMounted;
      _hubDisk = _hub.disk;
      if (_hub.online) {
        _farmMode = _hub.mode == 'cctv' ? SystemMode.cctv : SystemMode.monitoring;
      }
    });
  }

  @override
  void dispose() {
    _hub.removeListener(_onHubUpdate);
    _tabCtrl.dispose();
    super.dispose();
  }

  SystemMode _effectiveMode(String serial) => _cameraOverrides[serial] ?? _farmMode;

  Color get _modeColor => _farmMode == SystemMode.cctv
      ? const Color(0xFFEF4444) : AgriTheme.accent;

  IconData get _modeIcon => _farmMode == SystemMode.cctv
      ? Icons.videocam_rounded : Icons.eco_rounded;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AgriTheme.bg,
      appBar: AppBar(
        title: const Text('System Mode'),
        actions: [
          Container(
            margin: const EdgeInsets.only(right: 12),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: _modeColor.withOpacity(0.12),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: _modeColor.withOpacity(0.3)),
            ),
            child: Row(mainAxisSize: MainAxisSize.min, children: [
              Icon(_modeIcon, size: 16, color: _modeColor),
              const SizedBox(width: 6),
              Text(
                _farmMode == SystemMode.cctv ? 'CCTV' : 'MONITOR',
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800,
                    color: _modeColor, letterSpacing: 0.5),
              ),
            ]),
          ),
        ],
        bottom: TabBar(
          controller: _tabCtrl,
          labelColor: AgriTheme.primary,
          unselectedLabelColor: AgriTheme.muted,
          indicatorColor: AgriTheme.accent,
          labelStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
          tabs: const [
            Tab(text: '⚡ Mode Switch'),
            Tab(text: '📷 Per Camera'),
            Tab(text: '⏱ Schedule'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabCtrl,
        children: [
          _buildModeSwitch(),
          _buildPerCamera(),
          _buildSchedule(),
        ],
      ),
    );
  }

  // ═══════════════════════════════════════
  // TAB 1: MODE SWITCH
  // ═══════════════════════════════════════
  Widget _buildModeSwitch() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(children: [
        _buildModeSelector(),
        const SizedBox(height: 20),
        AnimatedSwitcher(
          duration: const Duration(milliseconds: 300),
          child: _farmMode == SystemMode.cctv
              ? _buildCCTVSettings() : _buildMonitoringSettings(),
        ),
        const SizedBox(height: 16),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton.icon(
            onPressed: () {
              setState(() => _cameraOverrides.clear());
              ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                content: Text('All cameras → ${_farmMode == SystemMode.cctv ? "CCTV" : "Monitoring"} mode'),
                backgroundColor: _modeColor, behavior: SnackBarBehavior.floating,
              ));
            },
            icon: const Icon(Icons.broadcast_on_personal_rounded, size: 18),
            label: const Text('Apply to All Cameras'),
            style: ElevatedButton.styleFrom(
              backgroundColor: _modeColor, foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 14),
            ),
          ),
        ),
      ]),
    );
  }

  Widget _buildModeSelector() {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white, borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AgriTheme.border),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 8, offset: const Offset(0, 2))],
      ),
      child: Column(children: [
        // Header
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: _modeColor.withOpacity(0.06),
            borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
          ),
          child: Row(children: [
            Icon(_modeIcon, color: _modeColor, size: 28),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(
                _farmMode == SystemMode.cctv
                    ? 'Mode A — CCTV Surveillance'
                    : 'Mode B — AI Crop Monitoring',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: _modeColor),
              ),
              const SizedBox(height: 2),
              Text(
                _farmMode == SystemMode.cctv
                    ? 'Live streaming • Motion detection • Security recording'
                    : 'Disease detection • Time-lapse • Scheduled capture',
                style: TextStyle(fontSize: 11, color: _modeColor.withOpacity(0.7)),
              ),
            ])),
          ]),
        ),
        // Toggle cards
        Padding(
          padding: const EdgeInsets.all(12),
          child: Row(children: [
            Expanded(child: _modeCard(
              mode: SystemMode.cctv, icon: Icons.videocam_rounded,
              label: 'MODE A', title: 'CCTV',
              desc: 'Live surveillance\nMotion alerts\nContinuous recording',
              color: const Color(0xFFEF4444),
            )),
            const SizedBox(width: 10),
            Expanded(child: _modeCard(
              mode: SystemMode.monitoring, icon: Icons.eco_rounded,
              label: 'MODE B', title: 'MONITOR',
              desc: 'AI disease detection\nTime-lapse capture\nScheduled intervals',
              color: AgriTheme.accent,
            )),
          ]),
        ),
      ]),
    );
  }

  Widget _modeCard({
    required SystemMode mode, required IconData icon,
    required String label, required String title,
    required String desc, required Color color,
  }) {
    final selected = _farmMode == mode;
    return GestureDetector(
      onTap: () async {
        if (mode == SystemMode.cctv && !_hddConnected) {
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
            content: Text('CCTV Mode requires HDD connected to central unit'),
            backgroundColor: Color(0xFFEF4444),
            behavior: SnackBarBehavior.floating,
          ));
          return;
        }
        final modeStr = mode == SystemMode.cctv ? 'cctv' : 'monitoring';
        if (_hubOnline) {
          final err = await _hub.setMode(modeStr);
          if (err != null && mounted) {
            ScaffoldMessenger.of(context).showSnackBar(SnackBar(
              content: Text('Hub error: $err'),
              backgroundColor: const Color(0xFFEF4444),
              behavior: SnackBarBehavior.floating,
            ));
            return;
          }
        }
        setState(() => _farmMode = mode);
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: selected ? color.withOpacity(0.08) : const Color(0xFFF9FAFB),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: selected ? color : AgriTheme.border, width: selected ? 2 : 1),
          boxShadow: selected ? [BoxShadow(color: color.withOpacity(0.15), blurRadius: 8)] : [],
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Container(
              width: 36, height: 36,
              decoration: BoxDecoration(
                color: selected ? color.withOpacity(0.15) : const Color(0xFFE5E7EB),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, size: 20, color: selected ? color : AgriTheme.muted),
            ),
            const SizedBox(width: 8),
            Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(label, style: TextStyle(fontSize: 9, fontWeight: FontWeight.w800,
                  color: selected ? color : AgriTheme.muted, letterSpacing: 1)),
              Text(title, style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800,
                  color: selected ? color : AgriTheme.textColor)),
            ]),
            const Spacer(),
            if (selected) Icon(Icons.check_circle_rounded, color: color, size: 22),
          ]),
          const SizedBox(height: 10),
          Text(desc, style: TextStyle(fontSize: 11,
              color: selected ? color.withOpacity(0.8) : AgriTheme.muted, height: 1.5)),
        ]),
      ),
    );
  }

  // ═══ CCTV SETTINGS ═══
  Widget _buildCCTVSettings() {
    return Card(
      key: const ValueKey('cctv'),
      child: Padding(padding: const EdgeInsets.all(16),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          _sectionHeader('🔴 CCTV Settings', const Color(0xFFEF4444)),
          const SizedBox(height: 12),
          _toggleRow('Motion Detection', 'Alert on movement', Icons.sensors_rounded,
              _motionDetection, (v) => setState(() => _motionDetection = v)),
          if (_motionDetection) ...[
            const SizedBox(height: 8),
            _sliderRow('Sensitivity', _motionSensitivity, 0.1, 1.0,
                (v) => setState(() => _motionSensitivity = v),
                label: '${(_motionSensitivity * 100).toInt()}%'),
          ],
          const Divider(height: 24),
          _toggleRow('Continuous Recording', '24/7 to SD card', Icons.fiber_manual_record_rounded,
              _continuousRecord, (v) => setState(() => _continuousRecord = v)),
          const Divider(height: 24),
          _toggleRow('Night Vision (IR LED)', 'Auto in low light', Icons.nightlight_round,
              _nightVision, (v) => setState(() => _nightVision = v)),
          const Divider(height: 24),
          _toggleRow('Audio Alert', 'Buzzer on motion', Icons.volume_up_rounded,
              _audioAlert, (v) => setState(() => _audioAlert = v)),
          const Divider(height: 24),
          _dropdownRow('Quality', ['Low (VGA)', 'Medium (XGA)', 'High (UXGA)', 'Ultra (QXGA)'],
              _recordQuality, (v) => setState(() => _recordQuality = v)),
          const SizedBox(height: 12),
          _dropdownRow('Retention', ['3 days', '7 days', '14 days', '30 days'],
              [3,7,14,30].indexOf(_retentionDays).clamp(0,3),
              (v) => setState(() => _retentionDays = [3,7,14,30][v])),
          const SizedBox(height: 12),
          _dropdownRow('Protocol', ['RTSP', 'MJPEG', 'HTTP'],
              ['RTSP','MJPEG','HTTP'].indexOf(_streamProtocol),
              (v) => setState(() => _streamProtocol = ['RTSP','MJPEG','HTTP'][v])),
        ]),
      ),
    );
  }

  // ═══ MONITORING SETTINGS ═══
  Widget _buildMonitoringSettings() {
    return Card(
      key: const ValueKey('monitor'),
      child: Padding(padding: const EdgeInsets.all(16),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          _sectionHeader('🌱 Monitoring Settings', AgriTheme.accent),
          const SizedBox(height: 12),
          _toggleRow('AI Disease Detection', 'Analyze every image', Icons.biotech_rounded,
              _aiEnabled, (v) => setState(() => _aiEnabled = v)),
          if (_aiEnabled) ...[
            const SizedBox(height: 8),
            _sliderRow('Confidence Threshold', _confidenceThreshold, 0.3, 0.99,
                (v) => setState(() => _confidenceThreshold = v),
                label: '${(_confidenceThreshold * 100).toInt()}%'),
            const SizedBox(height: 8),
            _toggleRow('Auto Treatment Alert', 'WhatsApp + push', Icons.healing_rounded,
                _autoTreatmentAlert, (v) => setState(() => _autoTreatmentAlert = v)),
          ],
          const Divider(height: 24),
          _sliderRow('Capture Interval', _captureIntervalMin.toDouble(), 1, 60,
              (v) => setState(() => _captureIntervalMin = v.toInt()),
              label: '$_captureIntervalMin min', divisions: 59),
          const SizedBox(height: 12),
          _dropdownRow('Resolution', ['VGA (640×480)', 'XGA (1024×768)', 'UXGA (1600×1200)', 'QXGA (2048×1536)'],
              _captureResolution, (v) => setState(() => _captureResolution = v)),
          const Divider(height: 24),
          _toggleRow('Time-Lapse Mode', 'Daily time-lapse video', Icons.timelapse_rounded,
              _timelapse, (v) => setState(() => _timelapse = v)),
          if (_timelapse) ...[
            const SizedBox(height: 8),
            _sliderRow('TL Interval', _timelapseIntervalSec.toDouble(), 10, 300,
                (v) => setState(() => _timelapseIntervalSec = v.toInt()),
                label: '${_timelapseIntervalSec}s', divisions: 29),
            Padding(
              padding: const EdgeInsets.only(left: 8, top: 4),
              child: Text(
                '1 frame / ${_timelapseIntervalSec}s → ${(86400 ~/ _timelapseIntervalSec)} frames/day → ~${(86400 ~/ _timelapseIntervalSec) ~/ 30}s video @30fps',
                style: const TextStyle(fontSize: 10, color: AgriTheme.muted),
              ),
            ),
          ],
          const Divider(height: 24),
          _toggleRow('Night Capture', 'Continue after sunset', Icons.dark_mode_rounded,
              _nightCapture, (v) => setState(() => _nightCapture = v)),
        ]),
      ),
    );
  }

  // ═══════════════════════════════════════
  // TAB 2: PER CAMERA
  // ═══════════════════════════════════════
  Widget _buildPerCamera() {
    final cameras = MockData.cameras;
    return ListView.builder(
      padding: const EdgeInsets.all(12),
      itemCount: cameras.length + 1,
      itemBuilder: (ctx, i) {
        if (i == 0) {
          return Padding(
            padding: const EdgeInsets.only(bottom: 12, left: 4),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Text('Per-Camera Mode Override',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AgriTheme.primary)),
              const SizedBox(height: 4),
              Text('Default: ${_farmMode == SystemMode.cctv ? "Mode A (CCTV)" : "Mode B (Monitoring)"}. Override individual cameras below.',
                  style: const TextStyle(fontSize: 12, color: AgriTheme.muted)),
              const SizedBox(height: 8),
              Row(children: [
                _legendDot(const Color(0xFFEF4444), 'A = CCTV'),
                const SizedBox(width: 12),
                _legendDot(AgriTheme.accent, 'B = Monitor'),
                const SizedBox(width: 12),
                _legendDot(AgriTheme.muted, 'Auto = Farm default'),
              ]),
            ]),
          );
        }
        final cam = cameras[i - 1];
        final serial = cam['serial'] as String;
        final online = cam['online'] as bool;
        final battery = cam['battery'] as int;
        final zone = cam['zone'] as String;
        final effective = _effectiveMode(serial);

        return Container(
          margin: const EdgeInsets.only(bottom: 8),
          decoration: BoxDecoration(
            color: Colors.white, borderRadius: BorderRadius.circular(12),
            border: Border.all(color: _cameraOverrides.containsKey(serial)
                ? (effective == SystemMode.cctv ? const Color(0xFFEF4444) : AgriTheme.accent).withOpacity(0.4)
                : AgriTheme.border),
          ),
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Row(children: [
              Container(width: 10, height: 10,
                decoration: BoxDecoration(shape: BoxShape.circle,
                    color: online ? AgriTheme.accent : AgriTheme.muted)),
              const SizedBox(width: 10),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(serial, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, fontFamily: 'monospace')),
                const SizedBox(height: 2),
                Row(children: [
                  Text('$zone', style: const TextStyle(fontSize: 11, color: AgriTheme.muted)),
                  const SizedBox(width: 6),
                  Text('🔋$battery%', style: TextStyle(fontSize: 11,
                      color: battery < 20 ? const Color(0xFFEF4444) : AgriTheme.muted)),
                  const SizedBox(width: 6),
                  // Show effective mode
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                    decoration: BoxDecoration(
                      color: (effective == SystemMode.cctv ? const Color(0xFFEF4444) : AgriTheme.accent).withOpacity(0.1),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      effective == SystemMode.cctv ? 'CCTV' : 'MON',
                      style: TextStyle(fontSize: 9, fontWeight: FontWeight.w800,
                          color: effective == SystemMode.cctv ? const Color(0xFFEF4444) : AgriTheme.accent),
                    ),
                  ),
                ]),
              ])),
              // Mode pills
              Container(
                decoration: BoxDecoration(
                  color: const Color(0xFFF3F4F6), borderRadius: BorderRadius.circular(8)),
                padding: const EdgeInsets.all(2),
                child: Row(mainAxisSize: MainAxisSize.min, children: [
                  _cameraModePill(serial, null, 'Auto', AgriTheme.muted),
                  _cameraModePill(serial, SystemMode.cctv, 'A', const Color(0xFFEF4444)),
                  _cameraModePill(serial, SystemMode.monitoring, 'B', AgriTheme.accent),
                ]),
              ),
            ]),
          ),
        );
      },
    );
  }

  Widget _cameraModePill(String serial, SystemMode? mode, String label, Color color) {
    final isAuto = mode == null && !_cameraOverrides.containsKey(serial);
    final selected = mode != null && _cameraOverrides[serial] == mode;
    final active = selected || isAuto;
    return GestureDetector(
      onTap: () => setState(() {
        if (mode == null) { _cameraOverrides.remove(serial); }
        else { _cameraOverrides[serial] = mode; }
      }),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: active ? color.withOpacity(0.15) : Colors.transparent,
          borderRadius: BorderRadius.circular(6),
          border: active ? Border.all(color: color.withOpacity(0.4)) : null,
        ),
        child: Text(label, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700,
            color: active ? color : AgriTheme.muted)),
      ),
    );
  }

  // ═══════════════════════════════════════
  // TAB 3: SCHEDULE
  // ═══════════════════════════════════════
  Widget _buildSchedule() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(children: [
        // Capture schedule
        Card(child: Padding(padding: const EdgeInsets.all(16),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            _sectionHeader('⏱ Capture Schedule', AgriTheme.info),
            const SizedBox(height: 12),
            _toggleRow('Enable Schedule', 'Only capture during set hours', Icons.schedule_rounded,
                _scheduleEnabled, (v) => setState(() => _scheduleEnabled = v)),
            if (_scheduleEnabled) ...[
              const Divider(height: 24),
              _timePickerRow('Start Time', _scheduleStart, (t) => setState(() => _scheduleStart = t)),
              const SizedBox(height: 12),
              _timePickerRow('End Time', _scheduleEnd, (t) => setState(() => _scheduleEnd = t)),
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AgriTheme.info.withOpacity(0.06), borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: AgriTheme.info.withOpacity(0.15)),
                ),
                child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Icon(Icons.info_outline, size: 16, color: AgriTheme.info),
                  const SizedBox(width: 8),
                  Expanded(child: Text(
                    'Active ${_scheduleStart.format(context)} → ${_scheduleEnd.format(context)}.\n'
                    'Outside this window cameras enter deep sleep to save battery.',
                    style: TextStyle(fontSize: 11, color: AgriTheme.info.withOpacity(0.8)),
                  )),
                ]),
              ),
            ],
          ]),
        )),
        const SizedBox(height: 16),

        // Visual timeline
        Card(child: Padding(padding: const EdgeInsets.all(16),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('24-Hour Timeline', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
            const SizedBox(height: 16),
            _buildTimeline(),
            const SizedBox(height: 12),
            const Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
              Text('00:00', style: TextStyle(fontSize: 10, color: AgriTheme.muted)),
              Text('06:00', style: TextStyle(fontSize: 10, color: AgriTheme.muted)),
              Text('12:00', style: TextStyle(fontSize: 10, color: AgriTheme.muted)),
              Text('18:00', style: TextStyle(fontSize: 10, color: AgriTheme.muted)),
              Text('24:00', style: TextStyle(fontSize: 10, color: AgriTheme.muted)),
            ]),
            const SizedBox(height: 8),
            Row(children: [
              _legendDot(_modeColor, _farmMode == SystemMode.cctv ? 'CCTV Active' : 'Monitoring Active'),
              const SizedBox(width: 12),
              _legendDot(const Color(0xFFE5E7EB), 'Deep Sleep'),
            ]),
          ]),
        )),
        const SizedBox(height: 16),

        // Day/Night auto switch
        Card(child: Padding(padding: const EdgeInsets.all(16),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            _sectionHeader('🌗 Day/Night Auto Switch', AgriTheme.warning),
            const SizedBox(height: 4),
            const Text('Automatically switch between modes based on time of day',
                style: TextStyle(fontSize: 11, color: AgriTheme.muted)),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AgriTheme.warning.withOpacity(0.06), borderRadius: BorderRadius.circular(12)),
              child: Column(children: [
                const Row(children: [
                  Icon(Icons.wb_sunny_rounded, color: Color(0xFFF59E0B), size: 24),
                  SizedBox(width: 12),
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text('☀️ Daytime → Mode B (Monitoring)',
                        style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                    Text('AI crop detection during daylight',
                        style: TextStyle(fontSize: 11, color: AgriTheme.muted)),
                  ])),
                ]),
                const Padding(padding: EdgeInsets.symmetric(vertical: 8), child: Divider()),
                const Row(children: [
                  Icon(Icons.dark_mode_rounded, color: Color(0xFF6366F1), size: 24),
                  SizedBox(width: 12),
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text('🌙 Nighttime → Mode A (CCTV)',
                        style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                    Text('Security surveillance with IR night vision',
                        style: TextStyle(fontSize: 11, color: AgriTheme.muted)),
                  ])),
                ]),
              ]),
            ),
            const SizedBox(height: 12),
            _toggleRow('Auto Day/Night Switch', 'Monitor by day, CCTV by night', Icons.auto_mode_rounded,
                _autoSwitch, (v) {
              setState(() => _autoSwitch = v);
              if (v) {
                ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
                  content: Text('Auto-switch ON: Monitoring by day, CCTV at night'),
                  behavior: SnackBarBehavior.floating,
                ));
              }
            }),
          ]),
        )),
      ]),
    );
  }

  Widget _buildTimeline() {
    final startH = _scheduleStart.hour + _scheduleStart.minute / 60.0;
    final endH = _scheduleEnd.hour + _scheduleEnd.minute / 60.0;
    return ClipRRect(
      borderRadius: BorderRadius.circular(6),
      child: SizedBox(
        height: 28,
        child: CustomPaint(
          size: const Size(double.infinity, 28),
          painter: _TimelinePainter(
            startHour: _scheduleEnabled ? startH : 0,
            endHour: _scheduleEnabled ? endH : 24,
            activeColor: _modeColor,
          ),
        ),
      ),
    );
  }

  Widget _timePickerRow(String label, TimeOfDay time, ValueChanged<TimeOfDay> onChanged) {
    return Row(children: [
      const Icon(Icons.access_time, size: 18, color: AgriTheme.muted),
      const SizedBox(width: 10),
      Text(label, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
      const Spacer(),
      GestureDetector(
        onTap: () async {
          final picked = await showTimePicker(context: context, initialTime: time);
          if (picked != null) onChanged(picked);
        },
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
          decoration: BoxDecoration(
            color: const Color(0xFFF3F4F6), borderRadius: BorderRadius.circular(8),
            border: Border.all(color: AgriTheme.border)),
          child: Text(time.format(context), style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
        ),
      ),
    ]);
  }

  // ═══ REUSABLE WIDGETS ═══

  Widget _sectionHeader(String title, Color color) =>
      Text(title, style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: color));

  Widget _legendDot(Color color, String label) {
    return Row(mainAxisSize: MainAxisSize.min, children: [
      Container(width: 8, height: 8, decoration: BoxDecoration(shape: BoxShape.circle, color: color)),
      const SizedBox(width: 4),
      Text(label, style: const TextStyle(fontSize: 11, color: AgriTheme.muted)),
    ]);
  }

  Widget _toggleRow(String title, String sub, IconData icon, bool value, ValueChanged<bool> onChanged) {
    return Row(children: [
      Icon(icon, size: 20, color: value ? AgriTheme.accent : AgriTheme.muted),
      const SizedBox(width: 12),
      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(title, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
        Text(sub, style: const TextStyle(fontSize: 11, color: AgriTheme.muted)),
      ])),
      Switch.adaptive(value: value, onChanged: onChanged, activeColor: AgriTheme.accent),
    ]);
  }

  Widget _sliderRow(String title, double value, double min, double max,
      ValueChanged<double> onChanged, {required String label, int? divisions}) {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(children: [
        Text(title, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
        const Spacer(),
        Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AgriTheme.accent)),
      ]),
      Slider(value: value, min: min, max: max, divisions: divisions,
          onChanged: onChanged, activeColor: AgriTheme.accent),
    ]);
  }

  Widget _dropdownRow(String label, List<String> options, int selected, ValueChanged<int> onChanged) {
    return Row(children: [
      Expanded(child: Text(label, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600))),
      Container(
        padding: const EdgeInsets.symmetric(horizontal: 10),
        decoration: BoxDecoration(
          color: const Color(0xFFF3F4F6), borderRadius: BorderRadius.circular(8),
          border: Border.all(color: AgriTheme.border)),
        child: DropdownButton<int>(
          value: selected.clamp(0, options.length - 1),
          underline: const SizedBox(), isDense: true,
          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AgriTheme.textColor),
          items: options.asMap().entries.map((e) =>
              DropdownMenuItem(value: e.key, child: Text(e.value))).toList(),
          onChanged: (v) => onChanged(v ?? 0),
        ),
      ),
    ]);
  }
}

// ═══ TIMELINE CUSTOM PAINTER ═══
class _TimelinePainter extends CustomPainter {
  final double startHour, endHour;
  final Color activeColor;
  _TimelinePainter({required this.startHour, required this.endHour, required this.activeColor});

  @override
  void paint(Canvas canvas, Size size) {
    final bgPaint = Paint()..color = const Color(0xFFE5E7EB);
    final activePaint = Paint()..color = activeColor.withOpacity(0.5);
    final borderPaint = Paint()..color = activeColor..style = PaintingStyle.stroke..strokeWidth = 1.5;

    canvas.drawRRect(RRect.fromRectAndRadius(Offset.zero & size, const Radius.circular(4)), bgPaint);

    final startX = (startHour / 24) * size.width;
    final endX = (endHour / 24) * size.width;
    final activeRect = Rect.fromLTWH(startX, 0, endX - startX, size.height);
    canvas.drawRRect(RRect.fromRectAndRadius(activeRect, const Radius.circular(4)), activePaint);
    canvas.drawRRect(RRect.fromRectAndRadius(activeRect, const Radius.circular(4)), borderPaint);

    final markerPaint = Paint()..color = const Color(0xFFD1D5DB)..strokeWidth = 0.5;
    for (int h = 0; h <= 24; h += 6) {
      final x = (h / 24) * size.width;
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), markerPaint);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter old) => true;
}
