import 'package:flutter/material.dart';
import '../services/certification_service.dart';
import '../models/certificate.dart';
import 'certificate_detail_screen.dart';

class CertificationScreen extends StatefulWidget {
  final String farmId;
  final String farmName;

  const CertificationScreen({super.key, required this.farmId, required this.farmName});

  @override
  State<CertificationScreen> createState() => _CertificationScreenState();
}

class _CertificationScreenState extends State<CertificationScreen> with SingleTickerProviderStateMixin {
  final CertificationApiService _certService = CertificationApiService();
  late TabController _tabController;

  List<GreenCertificate> _certificates = [];
  EligibilityResult? _eligibility;
  bool _isLoading = true;
  bool _checking = false;
  bool _requesting = false;
  String _selectedSeason = 'full_year_2026';
  String _selectedType = 'disease_free';
  List<String> _products = [];
  final TextEditingController _productController = TextEditingController();
  bool _pesticideCompliance = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _loadCertificates();
  }

  Future<void> _loadCertificates() async {
    setState(() => _isLoading = true);
    try {
      final certs = await _certService.getMyCertificates();
      if (mounted) setState(() { _certificates = certs; _isLoading = false; });
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _checkEligibility() async {
    setState(() => _checking = true);
    try {
      final result = await _certService.checkEligibility(
        widget.farmId, _selectedType, _selectedSeason
      );
      if (mounted) setState(() { _eligibility = result; _checking = false; });
    } catch (e) {
      if (mounted) {
        setState(() => _checking = false);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Eligibility check failed')),
        );
      }
    }
  }

  Future<void> _requestCertificate() async {
    if (_products.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Add at least one certified product')),
      );
      return;
    }

    setState(() => _requesting = true);
    try {
      final cert = await _certService.requestCertificate(
        farmId: widget.farmId,
        certificateType: _selectedType,
        certifiedProducts: _products,
        season: _selectedSeason,
        pesticideCompliance: _pesticideCompliance,
      );

      if (mounted) {
        setState(() { _requesting = false; });
        _loadCertificates();
        _tabController.animateTo(0);

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Certificate ${cert.certificateNumber} issued!'),
            backgroundColor: const Color(0xFF2E7D32),
          ),
        );

        // Navigate to detail
        Navigator.push(context, MaterialPageRoute(
          builder: (_) => CertificateDetailScreen(certificate: cert),
        ));
      }
    } catch (e) {
      if (mounted) {
        setState(() => _requesting = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Certificate request failed: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Green Certification'),
        backgroundColor: const Color(0xFF1B5E20),
        foregroundColor: Colors.white,
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: Colors.white,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white60,
          tabs: const [
            Tab(icon: Icon(Icons.card_membership), text: 'My Certificates'),
            Tab(icon: Icon(Icons.add_circle_outline), text: 'New Certificate'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [_buildCertificatesList(), _buildNewCertificateForm()],
      ),
    );
  }

  // ============ TAB 1: Certificates List ============
  Widget _buildCertificatesList() {
    if (_isLoading) return const Center(child: CircularProgressIndicator());

    if (_certificates.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.verified_outlined, size: 64, color: Colors.grey.shade300),
            const SizedBox(height: 16),
            const Text('No certificates yet', style: TextStyle(fontSize: 18, color: Colors.grey)),
            const SizedBox(height: 8),
            ElevatedButton(
              onPressed: () => _tabController.animateTo(1),
              style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF2E7D32)),
              child: const Text('Get Certified', style: TextStyle(color: Colors.white)),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadCertificates,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _certificates.length,
        itemBuilder: (ctx, i) {
          final cert = _certificates[i];
          return _CertificateCard(
            cert: cert,
            onTap: () => Navigator.push(context, MaterialPageRoute(
              builder: (_) => CertificateDetailScreen(certificate: cert),
            )),
          );
        },
      ),
    );
  }

  // ============ TAB 2: New Certificate Form ============
  Widget _buildNewCertificateForm() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Farm name
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: const Color(0xFFE8F5E9), borderRadius: BorderRadius.circular(12),
            ),
            child: Row(children: [
              const Icon(Icons.agriculture, color: Color(0xFF2E7D32)),
              const SizedBox(width: 10),
              Text(widget.farmName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            ]),
          ),
          const SizedBox(height: 20),

          // Certificate type
          const Text('Certificate Type', style: TextStyle(fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          Wrap(spacing: 8, children: [
            _typeChip('disease_free', 'Disease-Free'),
            _typeChip('organic_compliant', 'Organic'),
            _typeChip('sustainable', 'Sustainable'),
            _typeChip('premium', 'Premium'),
          ]),
          const SizedBox(height: 20),

          // Season
          const Text('Season', style: TextStyle(fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          DropdownButtonFormField<String>(
            value: _selectedSeason,
            decoration: InputDecoration(border: OutlineInputBorder(borderRadius: BorderRadius.circular(10))),
            items: const [
              DropdownMenuItem(value: 'spring_2026', child: Text('Spring 2026')),
              DropdownMenuItem(value: 'summer_2026', child: Text('Summer 2026')),
              DropdownMenuItem(value: 'fall_2026', child: Text('Fall 2026')),
              DropdownMenuItem(value: 'winter_2026', child: Text('Winter 2026')),
              DropdownMenuItem(value: 'full_year_2026', child: Text('Full Year 2026')),
            ],
            onChanged: (v) => setState(() => _selectedSeason = v!),
          ),
          const SizedBox(height: 20),

          // Products
          const Text('Certified Products', style: TextStyle(fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          Row(children: [
            Expanded(
              child: TextField(
                controller: _productController,
                decoration: InputDecoration(
                  hintText: 'e.g. Tomatoes, Wheat...',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                ),
                onSubmitted: (_) => _addProduct(),
              ),
            ),
            const SizedBox(width: 8),
            IconButton(
              icon: const Icon(Icons.add_circle, color: Color(0xFF2E7D32), size: 36),
              onPressed: _addProduct,
            ),
          ]),
          if (_products.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Wrap(spacing: 6, runSpacing: 6,
                children: _products.map((p) => Chip(
                  label: Text(p),
                  backgroundColor: const Color(0xFFE8F5E9),
                  deleteIcon: const Icon(Icons.close, size: 16),
                  onDeleted: () => setState(() => _products.remove(p)),
                )).toList(),
              ),
            ),
          const SizedBox(height: 20),

          // Pesticide compliance
          SwitchListTile(
            title: const Text('Pesticide Compliance Declared'),
            subtitle: const Text('I confirm pesticide usage is within Agrivision guidelines'),
            value: _pesticideCompliance,
            activeColor: const Color(0xFF2E7D32),
            onChanged: (v) => setState(() => _pesticideCompliance = v),
            contentPadding: EdgeInsets.zero,
          ),
          const SizedBox(height: 16),

          // Check eligibility button
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: _checking ? null : _checkEligibility,
              icon: _checking
                  ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Icon(Icons.fact_check),
              label: Text(_checking ? 'Checking...' : 'Check Eligibility'),
              style: OutlinedButton.styleFrom(
                foregroundColor: const Color(0xFF2E7D32),
                padding: const EdgeInsets.symmetric(vertical: 14),
              ),
            ),
          ),

          // Eligibility results
          if (_eligibility != null) ...[
            const SizedBox(height: 20),
            _buildEligibilityResults(),
          ],

          const SizedBox(height: 20),

          // Request certificate button
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: (_eligibility?.eligible == true && !_requesting) ? _requestCertificate : null,
              icon: _requesting
                  ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Icon(Icons.verified),
              label: Text(_requesting ? 'Issuing...' : 'Issue Certificate'),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF1B5E20),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
                textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEligibilityResults() {
    final e = _eligibility!;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: e.eligible ? const Color(0xFFE8F5E9) : const Color(0xFFFFF3E0),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: e.eligible ? const Color(0xFF4CAF50) : Colors.orange),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            Icon(e.eligible ? Icons.check_circle : Icons.warning_amber,
              color: e.eligible ? const Color(0xFF2E7D32) : Colors.orange, size: 28),
            const SizedBox(width: 10),
            Text(e.eligible ? 'ELIGIBLE' : 'NOT YET ELIGIBLE',
              style: TextStyle(
                fontWeight: FontWeight.bold, fontSize: 18,
                color: e.eligible ? const Color(0xFF2E7D32) : Colors.orange.shade800,
              )),
            const Spacer(),
            Text('Score: ${e.overallScore.toStringAsFixed(0)}',
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
          ]),
          const Divider(),
          ...e.criteriaResults.map((c) => Padding(
            padding: const EdgeInsets.symmetric(vertical: 4),
            child: Row(children: [
              Icon(c['passed'] ? Icons.check : Icons.close,
                color: c['passed'] ? Colors.green : Colors.red, size: 18),
              const SizedBox(width: 8),
              Expanded(child: Text(c['criteria_name'], style: const TextStyle(fontSize: 13))),
              Text('${(c['score'] as num).toStringAsFixed(0)} / ${(c['minimum'] as num).toStringAsFixed(0)}',
                style: TextStyle(
                  fontWeight: FontWeight.bold, fontSize: 13,
                  color: c['passed'] ? Colors.green : Colors.red,
                )),
            ]),
          )),
          if (e.recommendations.isNotEmpty) ...[
            const SizedBox(height: 12),
            const Text('Recommendations:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
            ...e.recommendations.map((r) => Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Text('• $r', style: const TextStyle(fontSize: 12, color: Colors.black54)),
            )),
          ],
        ],
      ),
    );
  }

  Widget _typeChip(String value, String label) {
    return ChoiceChip(
      label: Text(label),
      selected: _selectedType == value,
      selectedColor: const Color(0xFFE8F5E9),
      onSelected: (_) => setState(() { _selectedType = value; _eligibility = null; }),
    );
  }

  void _addProduct() {
    final text = _productController.text.trim();
    if (text.isNotEmpty && !_products.contains(text)) {
      setState(() => _products.add(text));
      _productController.clear();
    }
  }

  @override
  void dispose() {
    _tabController.dispose();
    _productController.dispose();
    super.dispose();
  }
}

// ============ Certificate Card Widget ============
class _CertificateCard extends StatelessWidget {
  final GreenCertificate cert;
  final VoidCallback onTap;

  const _CertificateCard({required this.cert, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final isActive = cert.status == 'active';
    final color = isActive ? const Color(0xFF2E7D32) : cert.status == 'expired' ? Colors.grey : Colors.orange;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Container(
                width: 56, height: 56,
                decoration: BoxDecoration(
                  color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(Icons.verified, color: color, size: 30),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(cert.certificateNumber, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                    const SizedBox(height: 2),
                    Text(cert.certifiedProducts.join(', '),
                      style: const TextStyle(fontSize: 12, color: Colors.black54),
                      overflow: TextOverflow.ellipsis),
                    const SizedBox(height: 4),
                    Row(children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(4)),
                        child: Text(cert.status.toUpperCase(),
                          style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: color)),
                      ),
                      const SizedBox(width: 8),
                      Text('Score: ${cert.overallScore.toStringAsFixed(0)}',
                        style: const TextStyle(fontSize: 11, color: Colors.black54)),
                    ]),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right, color: Colors.grey),
            ],
          ),
        ),
      ),
    );
  }
}
