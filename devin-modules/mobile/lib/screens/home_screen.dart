import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:fl_chart/fl_chart.dart';
import '../config/theme.dart';
import '../services/mock_data.dart';
import '../services/auth_service.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  bool _refreshing = false;

  Future<void> _onRefresh() async {
    setState(() => _refreshing = true);
    await Future.delayed(const Duration(milliseconds: 800));
    if (mounted) setState(() => _refreshing = false);
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authProvider).user;
    final d = MockData.dashboardOverview;
    final firstName = (user?['name'] ?? 'Farmer').split(' ').first;

    return Scaffold(
      appBar: AppBar(
        title: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('Hello, $firstName 👋', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
          Text('${MockData.farms[0]['name']}', style: TextStyle(fontSize: 11, color: Theme.of(context).textTheme.bodySmall?.color?.withOpacity(0.5), fontWeight: FontWeight.normal)),
        ]),
        actions: [
          Stack(children: [
            IconButton(icon: const Icon(Icons.notifications_outlined), onPressed: () => context.push('/notifications')),
            Positioned(right: 8, top: 8, child: Container(width: 8, height: 8, decoration: const BoxDecoration(color: AgriTheme.danger, shape: BoxShape.circle))),
          ]),
          IconButton(icon: const Icon(Icons.settings_outlined), onPressed: () => context.push('/settings')),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _onRefresh,
        color: AgriTheme.accent,
        child: ListView(padding: const EdgeInsets.fromLTRB(16, 8, 16, 100), children: [
          // Active alerts banner
          if ((d['active_alerts'] as int) > 0) _AlertBanner(count: d['active_alerts'] as int),
          const SizedBox(height: 14),

          // Farm Health Score
          _FarmHealthCard(score: 91),
          const SizedBox(height: 14),

          // Mode A/B Quick Toggle
          const ModeQuickToggle(),
          const SizedBox(height: 14),

          // Stats grid
          _buildStatsGrid(d),
          const SizedBox(height: 18),

          // Weekly chart
          _SectionHeader(title: '📊 Weekly Trend', action: 'View Reports', onTap: () => context.push('/reports')),
          const SizedBox(height: 8),
          _WeeklyChart(data: d['weekly_trend'] as List<Map<String, dynamic>>),
          const SizedBox(height: 18),

          // Camera fleet status
          _SectionHeader(title: '📷 Camera Fleet', action: 'View All', onTap: () => context.go('/cameras')),
          const SizedBox(height: 8),
          _CameraFleetCard(total: d['cameras_total'] as int, online: d['cameras_online'] as int),
          const SizedBox(height: 18),

          // Recent detections
          _SectionHeader(title: '🔬 Recent Detections', action: 'View All', onTap: () => context.go('/detections')),
          const SizedBox(height: 8),
          ...MockData.detections.take(3).map((det) => _DetectionCard(
            detection: det,
            onTap: () => context.push('/detection/${det['id']}'),
          )),
        ]),
      ),
    );
  }

  Widget _buildStatsGrid(Map<String, dynamic> d) {
    final items = [
      _StatItem('🔬', 'Detections', '${d['detections_today']}', AgriTheme.danger),
      _StatItem('📸', 'Images', '${d['images_today']}', AgriTheme.accent),
      _StatItem('🌡️', 'Temp', '${d['avg_temp']}°C', AgriTheme.warning),
      _StatItem('💧', 'Soil', '${d['avg_soil']}%', AgriTheme.info),
    ];
    return GridView.count(
      crossAxisCount: 2, shrinkWrap: true, physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: 8, crossAxisSpacing: 8, childAspectRatio: 2.0,
      children: items.map((s) => Card(
        child: Padding(padding: const EdgeInsets.all(12), child: Row(children: [
          Text(s.icon, style: const TextStyle(fontSize: 24)),
          const SizedBox(width: 10),
          Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
            Text(s.value, style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: s.color)),
            Text(s.label, style: const TextStyle(fontSize: 10, color: AgriTheme.muted)),
          ]),
        ])),
      )).toList(),
    );
  }
}

class ModeQuickToggle extends StatefulWidget {
  const ModeQuickToggle({super.key});

  @override
  State<ModeQuickToggle> createState() => _ModeQuickToggleState();
}

class _ModeQuickToggleState extends State<ModeQuickToggle> {
  bool _isCCTV = false; // false = Mode B (Monitoring), true = Mode A (CCTV)

  @override
  Widget build(BuildContext context) {
    final color = _isCCTV ? AgriTheme.danger : AgriTheme.accent;
    final icon = _isCCTV ? Icons.videocam_rounded : Icons.eco_rounded;
    final modeLabel = _isCCTV ? 'MODE A — CCTV' : 'MODE B — MONITORING';
    final modeDesc = _isCCTV
        ? 'Live surveillance • Motion alerts • Local recording (HDD)'
        : 'AI Detection • Time-lapse • Scheduled capture';

    return GestureDetector(
      onTap: () => context.push('/mode'),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: color.withOpacity(0.08),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: color.withOpacity(0.25)),
        ),
        child: Row(children: [
          // Mode icon
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: color.withOpacity(0.12),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: color, size: 24),
          ),
          const SizedBox(width: 12),
          // Mode info
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(modeLabel,
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: color, letterSpacing: 0.3)),
              const SizedBox(height: 2),
              Text(modeDesc, style: TextStyle(fontSize: 11, color: color.withOpacity(0.7))),
            ]),
          ),
          // Toggle + settings icon
          Column(children: [
            GestureDetector(
              onTap: () => setState(() => _isCCTV = !_isCCTV),
              child: Container(
                width: 56,
                height: 28,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(14),
                  color: color.withOpacity(0.15),
                  border: Border.all(color: color.withOpacity(0.3)),
                ),
                child: Stack(children: [
                  Row(children: [
                    Expanded(
                      child: Center(
                        child: Text('A',
                            style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w800,
                                color: _isCCTV ? Colors.white : color.withOpacity(0.4))),
                      ),
                    ),
                    Expanded(
                      child: Center(
                        child: Text('B',
                            style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w800,
                                color: !_isCCTV ? Colors.white : color.withOpacity(0.4))),
                      ),
                    ),
                  ]),
                  AnimatedAlign(
                    duration: const Duration(milliseconds: 200),
                    alignment: _isCCTV ? Alignment.centerLeft : Alignment.centerRight,
                    child: Container(
                      width: 28,
                      height: 28,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: color,
                        boxShadow: [BoxShadow(color: color.withOpacity(0.3), blurRadius: 4)],
                      ),
                      child: Center(
                        child: Text(_isCCTV ? 'A' : 'B',
                            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w900, color: Colors.white)),
                      ),
                    ),
                  ),
                ]),
              ),
            ),
            const SizedBox(height: 4),
            Icon(Icons.tune_rounded, size: 14, color: color.withOpacity(0.5)),
          ]),
        ]),
      ),
    );
  }
}

class _StatItem {
  final String icon, label, value;
  final Color color;
  _StatItem(this.icon, this.label, this.value, this.color);
}

class _AlertBanner extends StatelessWidget {
  final int count;
  const _AlertBanner({required this.count});
  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => context.go('/detections'),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          gradient: const LinearGradient(colors: [Color(0xFFDC2626), Color(0xFFB91C1C)]),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(children: [
          const Text('🚨', style: TextStyle(fontSize: 24)),
          const SizedBox(width: 12),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('$count Active Alert${count > 1 ? 's' : ''}', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 14)),
            const Text('Tap to view disease detections', style: TextStyle(color: Colors.white70, fontSize: 11)),
          ])),
          const Icon(Icons.arrow_forward_ios_rounded, color: Colors.white, size: 16),
        ]),
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final String title, action;
  final VoidCallback? onTap;
  const _SectionHeader({required this.title, this.action = '', this.onTap});
  @override
  Widget build(BuildContext context) {
    return Row(children: [
      Text(title, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: AgriTheme.primary)),
      const Spacer(),
      if (onTap != null) GestureDetector(onTap: onTap,
        child: Text(action, style: const TextStyle(fontSize: 12, color: AgriTheme.accent, fontWeight: FontWeight.w600))),
    ]);
  }
}

class _WeeklyChart extends StatelessWidget {
  final List<Map<String, dynamic>> data;
  const _WeeklyChart({required this.data});
  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(padding: const EdgeInsets.all(16), child: SizedBox(
        height: 160,
        child: BarChart(BarChartData(
          barGroups: data.asMap().entries.map((e) => BarChartGroupData(
            x: e.key,
            barRods: [
              BarChartRodData(toY: (e.value['detections'] as int).toDouble(), color: AgriTheme.accent, width: 12, borderRadius: BorderRadius.circular(4)),
            ],
          )).toList(),
          titlesData: FlTitlesData(
            bottomTitles: AxisTitles(sideTitles: SideTitles(showTitles: true, getTitlesWidget: (v, _) {
              if (v.toInt() < data.length) return Padding(padding: const EdgeInsets.only(top: 6), child: Text(data[v.toInt()]['day'], style: const TextStyle(fontSize: 10, color: AgriTheme.muted)));
              return const SizedBox();
            })),
            leftTitles: AxisTitles(sideTitles: SideTitles(showTitles: true, reservedSize: 28, getTitlesWidget: (v, _) => Text('${v.toInt()}', style: const TextStyle(fontSize: 9, color: AgriTheme.muted)))),
            topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
            rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          ),
          gridData: FlGridData(show: true, drawVerticalLine: false, horizontalInterval: 4, getDrawingHorizontalLine: (_) => FlLine(color: AgriTheme.border, strokeWidth: 0.5)),
          borderData: FlBorderData(show: false),
          barTouchData: BarTouchData(touchTooltipData: BarTouchTooltipData(
            getTooltipItem: (g, _, r, __) => BarTooltipItem('${r.toY.toInt()} detections', const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w600)),
          )),
        )),
      )),
    );
  }
}

class _CameraFleetCard extends StatelessWidget {
  final int total, online;
  const _CameraFleetCard({required this.total, required this.online});
  @override
  Widget build(BuildContext context) {
    final pct = total > 0 ? online / total : 0.0;
    return Card(child: Padding(padding: const EdgeInsets.all(16), child: Row(children: [
      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('$online / $total Online', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: AgriTheme.primary)),
        const SizedBox(height: 4),
        Text('${(pct * 100).toStringAsFixed(1)}% uptime', style: const TextStyle(fontSize: 11, color: AgriTheme.muted)),
        const SizedBox(height: 8),
        ClipRRect(borderRadius: BorderRadius.circular(4), child: LinearProgressIndicator(
          value: pct, backgroundColor: AgriTheme.border, color: online == total ? AgriTheme.accent : AgriTheme.warning, minHeight: 6)),
      ])),
      const SizedBox(width: 16),
      Container(width: 50, height: 50, decoration: BoxDecoration(
        color: online == total ? AgriTheme.accentLight : const Color(0xFFFEF3C7),
        borderRadius: BorderRadius.circular(14),
      ), child: Center(child: Text(online == total ? '✅' : '⚠️', style: const TextStyle(fontSize: 24)))),
    ])));
  }
}

class _FarmHealthCard extends StatelessWidget {
  final int score;
  const _FarmHealthCard({required this.score});
  @override
  Widget build(BuildContext context) {
    final color = score > 90 ? AgriTheme.accent : score > 80 ? AgriTheme.warning : AgriTheme.danger;
    final label = score > 90 ? 'Excellent' : score > 80 ? 'Good' : score > 70 ? 'Fair' : 'Needs Attention';
    return Card(
      child: Padding(padding: const EdgeInsets.all(16), child: Row(children: [
        SizedBox(
          width: 56, height: 56,
          child: Stack(alignment: Alignment.center, children: [
            CircularProgressIndicator(
              value: score / 100,
              strokeWidth: 6,
              backgroundColor: Theme.of(context).dividerColor.withOpacity(0.2),
              color: color,
            ),
            Text('$score', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: color)),
          ]),
        ),
        const SizedBox(width: 16),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('🌿 Farm Health Score', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800)),
          const SizedBox(height: 4),
          Text(label, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: color)),
          const SizedBox(height: 2),
          Text('Based on disease detections, camera uptime & sensor data',
              style: TextStyle(fontSize: 10, color: Theme.of(context).textTheme.bodySmall?.color?.withOpacity(0.5))),
        ])),
      ])),
    );
  }
}

class _DetectionCard extends StatelessWidget {
  final Map<String, dynamic> detection;
  final VoidCallback? onTap;
  const _DetectionCard({required this.detection, this.onTap});
  @override
  Widget build(BuildContext context) {
    final sev = detection['severity'] as String;
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Padding(padding: const EdgeInsets.all(12), child: Row(children: [
          Container(width: 42, height: 42, decoration: BoxDecoration(
            color: AgriTheme.severityColor(sev).withOpacity(0.12),
            borderRadius: BorderRadius.circular(10),
          ), child: Center(child: Text(AgriTheme.severityEmoji(sev), style: const TextStyle(fontSize: 18)))),
          const SizedBox(width: 12),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(detection['disease_name'] as String, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
            const SizedBox(height: 2),
            Text('${detection['camera_serial']} • ${detection['detected_at']}', style: const TextStyle(fontSize: 10, color: AgriTheme.muted)),
          ])),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(color: AgriTheme.severityColor(sev), borderRadius: BorderRadius.circular(6)),
            child: Text('${((detection['confidence'] as double) * 100).toInt()}%', style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w800)),
          ),
        ])),
      ),
    );
  }
}
