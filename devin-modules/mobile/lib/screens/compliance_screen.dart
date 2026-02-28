import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

// ============================================================
// COMPLIANCE SCREEN — Carbon footprint & sustainability reports
// ============================================================
class ComplianceScreen extends StatefulWidget {
  final String farmId;
  final String farmName;
  const ComplianceScreen({super.key, required this.farmId, required this.farmName});

  @override
  State<ComplianceScreen> createState() => _ComplianceScreenState();
}

class _ComplianceScreenState extends State<ComplianceScreen> {
  List<Map<String, dynamic>> _reports = [];
  bool _isLoading = true;
  bool _generating = false;

  @override
  void initState() { super.initState(); _loadReports(); }

  Future<void> _loadReports() async {
    setState(() => _isLoading = true);
    try {
      final uri = Uri.parse('${const String.fromEnvironment('API_BASE_URL', defaultValue: 'http://localhost:3000')}/api/v1/compliance/reports/${widget.farmId}');
      final res = await http.get(uri);
      final data = jsonDecode(res.body);
      if (mounted) setState(() { _reports = List<Map<String, dynamic>>.from(data['data'] ?? []); _isLoading = false; });
    } catch (e) { if (mounted) setState(() => _isLoading = false); }
  }

  Future<void> _generateReport(String type) async {
    setState(() => _generating = true);
    try {
      final uri = Uri.parse('${const String.fromEnvironment('API_BASE_URL', defaultValue: 'http://localhost:3000')}/api/v1/compliance/report');
      await http.post(uri,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'farm_id': widget.farmId, 'report_type': type,
          'period_start': DateTime.now().subtract(const Duration(days: 90)).toIso8601String(),
          'period_end': DateTime.now().toIso8601String()}),
      );
      _loadReports();
    } catch (e) { debugPrint('Generate error: $e'); }
    if (mounted) setState(() => _generating = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Compliance — ${widget.farmName}'),
        backgroundColor: const Color(0xFF1B5E20), foregroundColor: Colors.white),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                // Generate buttons
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Wrap(spacing: 8, runSpacing: 8, children: [
                    _genButton('Carbon Footprint', 'carbon_footprint', Icons.eco),
                    _genButton('Sustainability', 'sustainability', Icons.nature),
                    _genButton('Water Usage', 'water_usage', Icons.water_drop),
                    _genButton('Pesticide Log', 'pesticide_usage', Icons.science),
                  ]),
                ),
                const Divider(),
                // Reports list
                Expanded(
                  child: _reports.isEmpty
                      ? const Center(child: Text('No reports yet. Generate one above.'))
                      : ListView.builder(
                          itemCount: _reports.length,
                          itemBuilder: (ctx, i) {
                            final r = _reports[i];
                            return ListTile(
                              leading: CircleAvatar(backgroundColor: const Color(0xFFE8F5E9),
                                child: Icon(_typeIcon(r['report_type']), color: const Color(0xFF2E7D32))),
                              title: Text((r['report_type'] ?? '').replaceAll('_', ' ').toUpperCase(),
                                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                              subtitle: Text('${r['status']} — ${r['created_at']?.substring(0, 10)}'),
                              trailing: r['status'] == 'draft'
                                  ? TextButton(onPressed: () {}, child: const Text('Submit'))
                                  : const Icon(Icons.check_circle, color: Colors.green),
                            );
                          },
                        ),
                ),
              ],
            ),
    );
  }

  Widget _genButton(String label, String type, IconData icon) {
    return ElevatedButton.icon(
      onPressed: _generating ? null : () => _generateReport(type),
      icon: Icon(icon, size: 16),
      label: Text(label, style: const TextStyle(fontSize: 12)),
      style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF2E7D32), foregroundColor: Colors.white),
    );
  }

  IconData _typeIcon(String? type) {
    switch (type) {
      case 'carbon_footprint': return Icons.eco;
      case 'sustainability': return Icons.nature;
      case 'water_usage': return Icons.water_drop;
      case 'pesticide_usage': return Icons.science;
      default: return Icons.description;
    }
  }
}

// ============================================================
// BENCHMARK SCREEN — Cross-farm comparison
// ============================================================
class BenchmarkScreen extends StatefulWidget {
  final String farmId;
  final String farmName;
  const BenchmarkScreen({super.key, required this.farmId, required this.farmName});

  @override
  State<BenchmarkScreen> createState() => _BenchmarkScreenState();
}

class _BenchmarkScreenState extends State<BenchmarkScreen> {
  Map<String, dynamic>? _myPosition;
  List<Map<String, dynamic>> _comparisons = [];
  bool _isLoading = true;
  String _selectedCrop = 'wheat';

  @override
  void initState() { super.initState(); _loadBenchmarks(); }

  Future<void> _loadBenchmarks() async {
    setState(() => _isLoading = true);
    try {
      final baseUrl = const String.fromEnvironment('API_BASE_URL', defaultValue: 'http://localhost:3000');
      final posRes = await http.get(Uri.parse('$baseUrl/api/v1/benchmark/my-position/${widget.farmId}?crop_type=$_selectedCrop'));
      final compRes = await http.get(Uri.parse('$baseUrl/api/v1/benchmark/compare?crop_type=$_selectedCrop'));

      if (mounted) {
        final posData = jsonDecode(posRes.body);
        final compData = jsonDecode(compRes.body);
        setState(() {
          _myPosition = posData['data'];
          _comparisons = List<Map<String, dynamic>>.from(compData['data'] ?? []);
          _isLoading = false;
        });
      }
    } catch (e) { if (mounted) setState(() => _isLoading = false); }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Benchmark — ${widget.farmName}'),
        backgroundColor: const Color(0xFF1B5E20), foregroundColor: Colors.white),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Crop selector
                  Wrap(spacing: 8, children: ['wheat', 'corn', 'tomato', 'potato', 'soybean'].map((c) =>
                    ChoiceChip(label: Text(c), selected: _selectedCrop == c,
                      selectedColor: const Color(0xFFE8F5E9),
                      onSelected: (_) { setState(() => _selectedCrop = c); _loadBenchmarks(); }),
                  ).toList()),

                  const SizedBox(height: 20),

                  // My position
                  if (_myPosition != null) ...[
                    const Text('Your Position', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                    const SizedBox(height: 8),
                    Card(
                      color: const Color(0xFFE8F5E9),
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          children: [
                            Text('Percentile: ${_myPosition!['percentile_rank'] ?? 'N/A'}%',
                              style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: Color(0xFF1B5E20))),
                            Text('Compared with ${_myPosition!['total_farms_compared'] ?? 0} farms in ${_myPosition!['region'] ?? 'region'}',
                              style: const TextStyle(color: Colors.grey)),
                          ],
                        ),
                      ),
                    ),
                  ] else
                    const Card(child: Padding(padding: EdgeInsets.all(16),
                      child: Text('Submit your metrics to see your position.'))),

                  const SizedBox(height: 20),

                  // Regional comparisons
                  if (_comparisons.isNotEmpty) ...[
                    const Text('Regional Averages', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                    const SizedBox(height: 8),
                    ..._comparisons.map((c) => Card(
                      margin: const EdgeInsets.only(bottom: 8),
                      child: ListTile(
                        title: Text('${c['region'] ?? 'Unknown'} — ${c['farm_size_category'] ?? ''} farms'),
                        subtitle: Text('${c['farm_count']} farms compared'),
                        trailing: Text('Avg yield: ${c['aggregated_metrics']?['yield_per_ha']?['avg'] ?? 'N/A'}',
                          style: const TextStyle(fontWeight: FontWeight.bold)),
                      ),
                    )),
                  ],
                ],
              ),
            ),
    );
  }
}
