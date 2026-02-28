import 'package:flutter/material.dart';
import '../services/climate_service.dart';
import '../widgets/risk_gauge_widget.dart';

class RiskDashboardScreen extends StatefulWidget {
  final String farmId;
  final String farmName;

  const RiskDashboardScreen({super.key, required this.farmId, required this.farmName});

  @override
  State<RiskDashboardScreen> createState() => _RiskDashboardScreenState();
}

class _RiskDashboardScreenState extends State<RiskDashboardScreen> {
  final ClimateService _climateService = ClimateService();
  Map<String, dynamic>? _risks;
  List<Map<String, dynamic>>? _forecasts;
  List<Map<String, dynamic>>? _anomalies;
  bool _isLoading = true;
  int _horizonDays = 14;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    try {
      final results = await Future.wait([
        _climateService.getRiskScores(widget.farmId),
        _climateService.getForecast(widget.farmId, _horizonDays),
        _climateService.getAnomalies(widget.farmId),
      ]);

      if (mounted) {
        setState(() {
          _risks = results[0] as Map<String, dynamic>?;
          _forecasts = (results[1] as Map<String, dynamic>?)?['predictions']?['daily_forecasts']
              ?.cast<Map<String, dynamic>>();
          _anomalies = (results[2] as List?)?.cast<Map<String, dynamic>>();
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
      debugPrint('Risk data error: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Risks — ${widget.farmName}'),
        backgroundColor: const Color(0xFF1B5E20),
        foregroundColor: Colors.white,
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: _loadData),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF2E7D32)))
          : RefreshIndicator(
              onRefresh: _loadData,
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Overall risk
                    _buildOverallRisk(),
                    const SizedBox(height: 20),

                    // Risk gauges grid
                    _buildRiskGauges(),
                    const SizedBox(height: 20),

                    // Horizon selector
                    _buildHorizonSelector(),
                    const SizedBox(height: 16),

                    // Forecast chart placeholder
                    _buildForecastList(),
                    const SizedBox(height: 20),

                    // Active anomalies
                    _buildAnomalies(),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildOverallRisk() {
    final combined = _risks?['combined_risk'] ?? 0.0;
    final level = combined > 0.7 ? 'HIGH' : combined > 0.4 ? 'MODERATE' : 'LOW';
    final color = combined > 0.7 ? Colors.red : combined > 0.4 ? Colors.orange : Colors.green;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [color.withOpacity(0.15), color.withOpacity(0.05)],
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Column(
        children: [
          Text('Overall Risk Level', style: TextStyle(color: color.shade700, fontSize: 14)),
          const SizedBox(height: 8),
          Text(level, style: TextStyle(color: color.shade800, fontSize: 32, fontWeight: FontWeight.bold)),
          Text('${(combined * 100).toStringAsFixed(0)}%', style: TextStyle(color: color.shade600, fontSize: 16)),
        ],
      ),
    );
  }

  Widget _buildRiskGauges() {
    final climateRisks = (_risks?['climate_risks'] as Map<String, dynamic>?) ?? {};

    final gauges = [
      {'label': 'Frost', 'value': climateRisks['frost_risk'] ?? 0.0, 'icon': Icons.ac_unit},
      {'label': 'Drought', 'value': climateRisks['drought_risk'] ?? 0.0, 'icon': Icons.wb_sunny},
      {'label': 'Flood', 'value': climateRisks['flood_risk'] ?? 0.0, 'icon': Icons.water},
      {'label': 'Heat', 'value': climateRisks['heat_stress_risk'] ?? 0.0, 'icon': Icons.local_fire_department},
      {'label': 'Disease', 'value': climateRisks['disease_risk'] ?? 0.0, 'icon': Icons.bug_report},
    ];

    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 3, childAspectRatio: 0.85, crossAxisSpacing: 12, mainAxisSpacing: 12,
      ),
      itemCount: gauges.length,
      itemBuilder: (context, i) => RiskGaugeWidget(
        label: gauges[i]['label'] as String,
        value: (gauges[i]['value'] as double).toDouble(),
        icon: gauges[i]['icon'] as IconData,
      ),
    );
  }

  Widget _buildHorizonSelector() {
    return Row(
      children: [
        const Text('Forecast:', style: TextStyle(fontWeight: FontWeight.bold)),
        const SizedBox(width: 12),
        ...([7, 14, 30].map((d) => Padding(
          padding: const EdgeInsets.only(right: 8),
          child: ChoiceChip(
            label: Text('${d}d'),
            selected: _horizonDays == d,
            selectedColor: const Color(0xFFE8F5E9),
            onSelected: (_) {
              setState(() => _horizonDays = d);
              _loadData();
            },
          ),
        ))),
      ],
    );
  }

  Widget _buildForecastList() {
    if (_forecasts == null || _forecasts!.isEmpty) {
      return const Card(child: Padding(
        padding: EdgeInsets.all(16),
        child: Text('No forecast data available'),
      ));
    }

    return Card(
      child: Column(
        children: _forecasts!.take(7).map((f) {
          final precip = (f['precipitation_mm'] ?? 0).toDouble();
          final tempMax = (f['temp_max'] ?? 0).toDouble();
          final tempMin = (f['temp_min'] ?? 0).toDouble();

          return ListTile(
            dense: true,
            leading: Icon(
              precip > 10 ? Icons.thunderstorm : precip > 1 ? Icons.cloud : Icons.wb_sunny,
              color: precip > 10 ? Colors.blue.shade700 : precip > 1 ? Colors.grey : Colors.orange,
            ),
            title: Text(f['date'] ?? '', style: const TextStyle(fontSize: 13)),
            subtitle: Text('${precip.toStringAsFixed(1)}mm rain', style: const TextStyle(fontSize: 12)),
            trailing: Text('${tempMin.toStringAsFixed(0)}° / ${tempMax.toStringAsFixed(0)}°',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                color: tempMin < 0 ? Colors.blue : tempMax > 35 ? Colors.red : Colors.black87,
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildAnomalies() {
    if (_anomalies == null || _anomalies!.isEmpty) {
      return const SizedBox.shrink();
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Active Alerts', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
        const SizedBox(height: 8),
        ..._anomalies!.take(10).map((a) {
          final severity = a['severity'] ?? 'low';
          final color = severity == 'critical' ? Colors.red
              : severity == 'high' ? Colors.orange
              : severity == 'medium' ? Colors.amber
              : Colors.grey;

          return Card(
            margin: const EdgeInsets.only(bottom: 8),
            child: ListTile(
              leading: CircleAvatar(backgroundColor: color.withOpacity(0.2),
                child: Icon(Icons.warning_amber, color: color, size: 20)),
              title: Text(a['description'] ?? 'Unknown anomaly', style: const TextStyle(fontSize: 13)),
              subtitle: Text('${a['anomaly_type']} — ${severity.toUpperCase()}', style: const TextStyle(fontSize: 11)),
              trailing: a['acknowledged'] == true
                  ? const Icon(Icons.check_circle, color: Colors.green, size: 20)
                  : TextButton(
                      onPressed: () => _acknowledgeAnomaly(a['id']),
                      child: const Text('ACK', style: TextStyle(fontSize: 11)),
                    ),
            ),
          );
        }),
      ],
    );
  }

  Future<void> _acknowledgeAnomaly(String id) async {
    try {
      await _climateService.acknowledgeAnomaly(id);
      _loadData();
    } catch (e) {
      debugPrint('Acknowledge error: $e');
    }
  }
}
