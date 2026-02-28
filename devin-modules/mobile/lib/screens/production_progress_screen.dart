import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import '../config/theme.dart';

/// Production Progress Screen
/// Shows crop diameter checking, growth tracking, and yield estimates
class ProductionProgressScreen extends StatefulWidget {
  const ProductionProgressScreen({super.key});
  @override
  State<ProductionProgressScreen> createState() => _ProductionProgressState();
}

class _ProductionProgressState extends State<ProductionProgressScreen> {
  String _selectedCrop = 'Date Palm';
  String _selectedZone = 'All Zones';

  // Mock production data
  static final Map<String, _CropData> _crops = {
    'Date Palm': _CropData(
      name: 'Date Palm',
      icon: Icons.park_rounded,
      color: const Color(0xFF16A34A),
      currentDiameter: 4.2,
      targetDiameter: 5.0,
      unit: 'cm',
      growthRate: 0.12,
      growthUnit: 'cm/week',
      stage: 'Khalal (Ripening)',
      stageProgress: 0.72,
      daysToHarvest: 34,
      estimatedYield: 185.0,
      yieldUnit: 'kg/tree',
      healthScore: 91,
      weeklyGrowth: [2.8, 3.0, 3.2, 3.4, 3.6, 3.8, 3.9, 4.0, 4.1, 4.2],
      stages: ['Hababouk', 'Kimri', 'Khalal', 'Rutab', 'Tamar'],
      currentStageIndex: 2,
    ),
    'Tomato': _CropData(
      name: 'Tomato',
      icon: Icons.eco_rounded,
      color: const Color(0xFFEF4444),
      currentDiameter: 6.8,
      targetDiameter: 8.0,
      unit: 'cm',
      growthRate: 0.35,
      growthUnit: 'cm/week',
      stage: 'Fruiting',
      stageProgress: 0.65,
      daysToHarvest: 18,
      estimatedYield: 4.2,
      yieldUnit: 'kg/plant',
      healthScore: 87,
      weeklyGrowth: [3.2, 3.8, 4.5, 5.0, 5.4, 5.9, 6.2, 6.4, 6.6, 6.8],
      stages: ['Seedling', 'Vegetative', 'Flowering', 'Fruiting', 'Harvest'],
      currentStageIndex: 3,
    ),
  };

  final List<_ZoneProduction> _zones = [
    _ZoneProduction('North Field', 'Date Palm', 48, 91, 4.2, 5.0, 34),
    _ZoneProduction('East Field', 'Date Palm', 36, 88, 4.0, 5.0, 38),
    _ZoneProduction('South Field', 'Date Palm', 24, 93, 4.3, 5.0, 31),
    _ZoneProduction('West Field', 'Date Palm', 42, 89, 4.1, 5.0, 36),
    _ZoneProduction('Greenhouse A', 'Tomato', 120, 87, 6.8, 8.0, 18),
    _ZoneProduction('Greenhouse B', 'Tomato', 80, 85, 6.5, 8.0, 22),
  ];

  @override
  Widget build(BuildContext context) {
    final crop = _crops[_selectedCrop]!;
    final filteredZones = _selectedZone == 'All Zones'
        ? _zones
        : _zones.where((z) => z.zone == _selectedZone).toList();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Production Progress'),
        actions: [
          PopupMenuButton<String>(
            icon: const Icon(Icons.filter_list),
            onSelected: (v) => setState(() => _selectedCrop = v),
            itemBuilder: (_) => _crops.keys.map((c) =>
              PopupMenuItem(value: c, child: Text(c))).toList(),
          ),
        ],
      ),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        // Crop selector chips
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(children: _crops.entries.map((e) {
            final sel = e.key == _selectedCrop;
            return Padding(
              padding: const EdgeInsets.only(right: 8),
              child: ChoiceChip(
                label: Text(e.key),
                selected: sel,
                selectedColor: e.value.color.withOpacity(0.15),
                labelStyle: TextStyle(
                  fontWeight: FontWeight.w700,
                  color: sel ? e.value.color : AgriTheme.muted,
                  fontSize: 12,
                ),
                onSelected: (_) => setState(() => _selectedCrop = e.key),
              ),
            );
          }).toList()),
        ),
        const SizedBox(height: 14),

        // Diameter Card
        _DiameterCard(crop: crop),
        const SizedBox(height: 12),

        // Growth Stage Card
        _GrowthStageCard(crop: crop),
        const SizedBox(height: 12),

        // Growth Chart
        _GrowthChartCard(crop: crop),
        const SizedBox(height: 12),

        // Yield Estimate
        _YieldCard(crop: crop),
        const SizedBox(height: 16),

        // Zone breakdown
        Row(children: [
          const Text('Zone Breakdown',
              style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: AgriTheme.primary)),
          const Spacer(),
          DropdownButton<String>(
            value: _selectedZone,
            isDense: true,
            underline: const SizedBox(),
            style: const TextStyle(fontSize: 12, color: AgriTheme.accent, fontWeight: FontWeight.w600),
            items: ['All Zones', ...{..._zones.map((z) => z.zone)}]
                .map((z) => DropdownMenuItem(value: z, child: Text(z)))
                .toList(),
            onChanged: (v) => setState(() => _selectedZone = v ?? 'All Zones'),
          ),
        ]),
        const SizedBox(height: 8),
        ...filteredZones.map((z) => _ZoneCard(zone: z)),
      ]),
    );
  }
}

class _CropData {
  final String name;
  final IconData icon;
  final Color color;
  final double currentDiameter, targetDiameter;
  final String unit, growthUnit, stage, yieldUnit;
  final double growthRate, stageProgress, estimatedYield;
  final int daysToHarvest, healthScore, currentStageIndex;
  final List<double> weeklyGrowth;
  final List<String> stages;

  _CropData({
    required this.name, required this.icon, required this.color,
    required this.currentDiameter, required this.targetDiameter,
    required this.unit, required this.growthRate, required this.growthUnit,
    required this.stage, required this.stageProgress,
    required this.daysToHarvest, required this.estimatedYield,
    required this.yieldUnit, required this.healthScore,
    required this.weeklyGrowth, required this.stages,
    required this.currentStageIndex,
  });
}

class _ZoneProduction {
  final String zone, crop;
  final int plantCount, healthScore, daysToHarvest;
  final double currentDiam, targetDiam;
  _ZoneProduction(this.zone, this.crop, this.plantCount, this.healthScore, this.currentDiam, this.targetDiam, this.daysToHarvest);
}

// ---- DIAMETER CARD ----
class _DiameterCard extends StatelessWidget {
  final _CropData crop;
  const _DiameterCard({required this.crop});

  @override
  Widget build(BuildContext context) {
    final pct = crop.currentDiameter / crop.targetDiameter;
    return Card(
      child: Padding(padding: const EdgeInsets.all(16), child: Column(children: [
        Row(children: [
          Container(
            width: 48, height: 48,
            decoration: BoxDecoration(color: crop.color.withOpacity(0.12), borderRadius: BorderRadius.circular(14)),
            child: Icon(Icons.straighten_rounded, color: crop.color, size: 24),
          ),
          const SizedBox(width: 14),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('Fruit Diameter', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800)),
            Text('${crop.name} average', style: const TextStyle(fontSize: 11, color: AgriTheme.muted)),
          ])),
          Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
            Text('${crop.currentDiameter} ${crop.unit}',
                style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: crop.color)),
            Text('of ${crop.targetDiameter} ${crop.unit} target',
                style: const TextStyle(fontSize: 10, color: AgriTheme.muted)),
          ]),
        ]),
        const SizedBox(height: 14),
        ClipRRect(
          borderRadius: BorderRadius.circular(6),
          child: LinearProgressIndicator(
            value: pct.clamp(0.0, 1.0),
            backgroundColor: AgriTheme.border,
            color: crop.color,
            minHeight: 10,
          ),
        ),
        const SizedBox(height: 6),
        Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          Text('${(pct * 100).toStringAsFixed(0)}% of target',
              style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: crop.color)),
          Text('+${crop.growthRate} ${crop.growthUnit}',
              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AgriTheme.accent)),
        ]),
      ])),
    );
  }
}

// ---- GROWTH STAGE CARD ----
class _GrowthStageCard extends StatelessWidget {
  final _CropData crop;
  const _GrowthStageCard({required this.crop});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(padding: const EdgeInsets.all(16), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          const Text('Growth Stage', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800)),
          const Spacer(),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(color: crop.color.withOpacity(0.12), borderRadius: BorderRadius.circular(8)),
            child: Text(crop.stage, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: crop.color)),
          ),
        ]),
        const SizedBox(height: 14),
        // Stage pipeline
        Row(children: List.generate(crop.stages.length, (i) {
          final active = i <= crop.currentStageIndex;
          final current = i == crop.currentStageIndex;
          return Expanded(child: Column(children: [
            Container(
              height: 6,
              margin: EdgeInsets.only(right: i < crop.stages.length - 1 ? 3 : 0),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(3),
                color: active ? crop.color : AgriTheme.border,
              ),
            ),
            const SizedBox(height: 4),
            Text(crop.stages[i],
                style: TextStyle(
                  fontSize: 8, fontWeight: current ? FontWeight.w800 : FontWeight.w500,
                  color: active ? crop.color : AgriTheme.muted,
                ),
                textAlign: TextAlign.center),
          ]));
        })),
        const SizedBox(height: 14),
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: AgriTheme.accent.withOpacity(0.06),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: AgriTheme.accent.withOpacity(0.2)),
          ),
          child: Row(children: [
            const Icon(Icons.calendar_today_rounded, size: 18, color: AgriTheme.accent),
            const SizedBox(width: 10),
            Text('Estimated ${crop.daysToHarvest} days to harvest',
                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AgriTheme.accent)),
          ]),
        ),
      ])),
    );
  }
}

// ---- GROWTH CHART ----
class _GrowthChartCard extends StatelessWidget {
  final _CropData crop;
  const _GrowthChartCard({required this.crop});

  @override
  Widget build(BuildContext context) {
    final data = crop.weeklyGrowth;
    final maxY = (data.reduce((a, b) => a > b ? a : b) * 1.2).ceilToDouble();

    return Card(
      child: Padding(padding: const EdgeInsets.all(16), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('Growth Trend (10 Weeks)', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800)),
        const SizedBox(height: 4),
        Text('Diameter measurements over time', style: TextStyle(fontSize: 11, color: AgriTheme.muted)),
        const SizedBox(height: 16),
        SizedBox(
          height: 160,
          child: LineChart(LineChartData(
            gridData: FlGridData(show: true, drawVerticalLine: false, horizontalInterval: 1,
                getDrawingHorizontalLine: (_) => FlLine(color: AgriTheme.border, strokeWidth: 0.5)),
            titlesData: FlTitlesData(
              bottomTitles: AxisTitles(sideTitles: SideTitles(showTitles: true, interval: 3,
                  getTitlesWidget: (v, _) => Padding(padding: const EdgeInsets.only(top: 6),
                      child: Text('W${v.toInt() + 1}', style: const TextStyle(fontSize: 9, color: AgriTheme.muted))))),
              leftTitles: AxisTitles(sideTitles: SideTitles(showTitles: true, reservedSize: 32,
                  getTitlesWidget: (v, _) => Text('${v.toStringAsFixed(1)}', style: const TextStyle(fontSize: 9, color: AgriTheme.muted)))),
              topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
              rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
            ),
            borderData: FlBorderData(show: false),
            minY: 0,
            maxY: maxY,
            lineBarsData: [
              LineChartBarData(
                spots: data.asMap().entries.map((e) => FlSpot(e.key.toDouble(), e.value)).toList(),
                isCurved: true,
                color: crop.color,
                barWidth: 3,
                dotData: FlDotData(show: true, getDotPainter: (s, _, __, ___) =>
                    FlDotCirclePainter(radius: 3, color: crop.color, strokeWidth: 0)),
                belowBarData: BarAreaData(show: true, color: crop.color.withOpacity(0.08)),
              ),
              // Target line
              LineChartBarData(
                spots: List.generate(data.length, (i) => FlSpot(i.toDouble(), crop.targetDiameter)),
                isCurved: false,
                color: AgriTheme.muted.withOpacity(0.4),
                barWidth: 1,
                dashArray: [5, 5],
                dotData: const FlDotData(show: false),
              ),
            ],
            lineTouchData: LineTouchData(
              touchTooltipData: LineTouchTooltipData(
                getTooltipItems: (spots) => spots.where((s) => s.barIndex == 0).map((s) =>
                    LineTooltipItem('${s.y.toStringAsFixed(1)} ${crop.unit}',
                        const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w700))).toList(),
              ),
            ),
          )),
        ),
        const SizedBox(height: 8),
        Row(children: [
          _legendDot(crop.color, 'Actual'),
          const SizedBox(width: 16),
          _legendDot(AgriTheme.muted.withOpacity(0.4), 'Target'),
        ]),
      ])),
    );
  }

  Widget _legendDot(Color c, String label) => Row(children: [
    Container(width: 8, height: 8, decoration: BoxDecoration(color: c, shape: BoxShape.circle)),
    const SizedBox(width: 4),
    Text(label, style: const TextStyle(fontSize: 10, color: AgriTheme.muted)),
  ]);
}

// ---- YIELD CARD ----
class _YieldCard extends StatelessWidget {
  final _CropData crop;
  const _YieldCard({required this.crop});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(padding: const EdgeInsets.all(16), child: Row(children: [
        Expanded(child: _yieldMetric('Estimated Yield', '${crop.estimatedYield} ${crop.yieldUnit}', crop.color)),
        Container(width: 1, height: 40, color: AgriTheme.border),
        Expanded(child: _yieldMetric('Health Score', '${crop.healthScore}%',
            crop.healthScore > 90 ? AgriTheme.accent : crop.healthScore > 80 ? AgriTheme.warning : AgriTheme.danger)),
        Container(width: 1, height: 40, color: AgriTheme.border),
        Expanded(child: _yieldMetric('Days to Harvest', '${crop.daysToHarvest}', AgriTheme.info)),
      ])),
    );
  }

  Widget _yieldMetric(String label, String value, Color c) => Column(children: [
    Text(value, style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: c)),
    const SizedBox(height: 2),
    Text(label, style: const TextStyle(fontSize: 9, color: AgriTheme.muted), textAlign: TextAlign.center),
  ]);
}

// ---- ZONE CARD ----
class _ZoneCard extends StatelessWidget {
  final _ZoneProduction zone;
  const _ZoneCard({required this.zone});

  @override
  Widget build(BuildContext context) {
    final pct = zone.currentDiam / zone.targetDiam;
    final healthColor = zone.healthScore > 90 ? AgriTheme.accent : zone.healthScore > 80 ? AgriTheme.warning : AgriTheme.danger;

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(padding: const EdgeInsets.all(14), child: Column(children: [
        Row(children: [
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(zone.zone, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
            Text('${zone.crop} - ${zone.plantCount} plants', style: const TextStyle(fontSize: 11, color: AgriTheme.muted)),
          ])),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(color: healthColor.withOpacity(0.12), borderRadius: BorderRadius.circular(8)),
            child: Text('${zone.healthScore}%', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: healthColor)),
          ),
        ]),
        const SizedBox(height: 10),
        Row(children: [
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('${zone.currentDiam} / ${zone.targetDiam} cm', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600)),
            const SizedBox(height: 4),
            ClipRRect(borderRadius: BorderRadius.circular(3),
                child: LinearProgressIndicator(value: pct.clamp(0.0, 1.0), backgroundColor: AgriTheme.border, color: AgriTheme.accent, minHeight: 4)),
          ])),
          const SizedBox(width: 16),
          Text('${zone.daysToHarvest}d', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: AgriTheme.info)),
          const SizedBox(width: 4),
          const Text('to harvest', style: TextStyle(fontSize: 9, color: AgriTheme.muted)),
        ]),
      ])),
    );
  }
}
