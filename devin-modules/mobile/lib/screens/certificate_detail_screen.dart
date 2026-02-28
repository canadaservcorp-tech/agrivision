import 'package:flutter/material.dart';
import '../models/certificate.dart';

class CertificateDetailScreen extends StatelessWidget {
  final GreenCertificate certificate;

  const CertificateDetailScreen({super.key, required this.certificate});

  @override
  Widget build(BuildContext context) {
    final cert = certificate;
    final isActive = cert.status == 'active';
    final statusColor = isActive ? const Color(0xFF2E7D32) : cert.status == 'expired' ? Colors.grey : Colors.orange;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Certificate'),
        backgroundColor: const Color(0xFF1B5E20),
        foregroundColor: Colors.white,
        actions: [
          IconButton(icon: const Icon(Icons.share), onPressed: () => _shareCertificate(context)),
          IconButton(icon: const Icon(Icons.print), onPressed: () => _printCertificate(context)),
          IconButton(icon: const Icon(Icons.download), onPressed: () => _downloadPdf(context)),
        ],
      ),
      body: SingleChildScrollView(
        child: Column(
          children: [
            // Certificate preview card
            Container(
              margin: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFF1B5E20), width: 2),
                boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.08), blurRadius: 12, offset: const Offset(0, 4))],
              ),
              child: Column(
                children: [
                  // Header
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(vertical: 20),
                    decoration: const BoxDecoration(
                      color: Color(0xFFE8F5E9),
                      borderRadius: BorderRadius.vertical(top: Radius.circular(14)),
                    ),
                    child: Column(children: [
                      const Text('AGRIVISION', style: TextStyle(
                        fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF1B5E20), letterSpacing: 3)),
                      const SizedBox(height: 4),
                      const Text('CERTIFICATE', style: TextStyle(
                        fontSize: 24, fontWeight: FontWeight.bold, color: Color(0xFF1B5E20))),
                      const SizedBox(height: 2),
                      Text(cert.certificateType.replaceAll('_', ' ').toUpperCase(),
                        style: const TextStyle(fontSize: 12, color: Color(0xFF2E7D32), letterSpacing: 2)),
                    ]),
                  ),

                  Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      children: [
                        // Farmer name
                        Text(cert.farmerName,
                          style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Color(0xFF1B5E20)),
                          textAlign: TextAlign.center),
                        const SizedBox(height: 4),
                        Text(cert.farmName, style: const TextStyle(fontSize: 14, color: Colors.black54)),
                        Text(cert.farmLocation ?? '', style: const TextStyle(fontSize: 12, color: Colors.grey)),

                        const SizedBox(height: 20),
                        const Divider(),
                        const SizedBox(height: 12),

                        // Details grid
                        _detailRow('Certificate No.', cert.certificateNumber),
                        _detailRow('Score', '${cert.overallScore.toStringAsFixed(0)} / 100'),
                        _detailRow('Products', cert.certifiedProducts.join(', ')),
                        _detailRow('Season', cert.season.replaceAll('_', ' ').toUpperCase()),
                        _detailRow('Farm Area', '${cert.farmAreaHa ?? 'N/A'} hectares'),
                        _detailRow('Valid From', _formatDate(cert.validFrom)),
                        _detailRow('Valid Until', _formatDate(cert.validUntil)),

                        const SizedBox(height: 16),

                        // Status badge
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 10),
                          decoration: BoxDecoration(
                            color: statusColor.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(color: statusColor),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(isActive ? Icons.verified : Icons.info_outline, color: statusColor, size: 20),
                              const SizedBox(width: 8),
                              Text(cert.status.toUpperCase(),
                                style: TextStyle(fontWeight: FontWeight.bold, color: statusColor, letterSpacing: 1)),
                            ],
                          ),
                        ),

                        const SizedBox(height: 20),

                        // QR code placeholder
                        Container(
                          width: 100, height: 100,
                          decoration: BoxDecoration(
                            border: Border.all(color: const Color(0xFFE0E0E0)),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Center(
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(Icons.qr_code, size: 50, color: Color(0xFF1B5E20)),
                                Text('Scan to verify', style: TextStyle(fontSize: 8, color: Colors.grey)),
                              ],
                            ),
                          ),
                        ),

                        const SizedBox(height: 12),
                        Text('Performance Cristal Technologies Avancées S.A.',
                          style: const TextStyle(fontSize: 9, color: Colors.grey)),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            // Criteria scores breakdown
            if (cert.criteriaScores != null)
              Container(
                margin: const EdgeInsets.symmetric(horizontal: 16),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white, borderRadius: BorderRadius.circular(12),
                  boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 8)],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Criteria Scores', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                    const SizedBox(height: 12),
                    ...cert.criteriaScores!.entries
                        .where((e) => e.key != 'overall_score')
                        .map((e) {
                      final score = (e.value as num).toDouble().clamp(0.0, 100.0);
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(e.key.replaceAll('_', ' '), style: const TextStyle(fontSize: 12)),
                                Text('${score.toStringAsFixed(0)}%',
                                  style: TextStyle(
                                    fontWeight: FontWeight.bold, fontSize: 12,
                                    color: score >= 70 ? Colors.green : score >= 50 ? Colors.orange : Colors.red)),
                              ],
                            ),
                            const SizedBox(height: 4),
                            ClipRRect(
                              borderRadius: BorderRadius.circular(4),
                              child: LinearProgressIndicator(
                                value: score / 100,
                                minHeight: 8,
                                backgroundColor: Colors.grey.shade200,
                                valueColor: AlwaysStoppedAnimation(
                                  score >= 70 ? const Color(0xFF4CAF50) : score >= 50 ? Colors.orange : Colors.red),
                              ),
                            ),
                          ],
                        ),
                      );
                    }),
                  ],
                ),
              ),

            const SizedBox(height: 24),

            // Action buttons
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => _shareCertificate(context),
                      icon: const Icon(Icons.share),
                      label: const Text('Share'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: const Color(0xFF2E7D32),
                        padding: const EdgeInsets.symmetric(vertical: 14)),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () => _downloadPdf(context),
                      icon: const Icon(Icons.picture_as_pdf),
                      label: const Text('Download PDF'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF1B5E20),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 14)),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  Widget _detailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(width: 120, child: Text(label,
            style: const TextStyle(fontSize: 12, color: Colors.grey, fontWeight: FontWeight.w500))),
          Expanded(child: Text(value,
            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600))),
        ],
      ),
    );
  }

  String _formatDate(DateTime? date) {
    if (date == null) return 'N/A';
    return '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
  }

  void _shareCertificate(BuildContext context) {
    // share_plus integration
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Share link: ${certificate.qrCodeData ?? "agrivision.ca/verify/${certificate.certificateNumber}"}')),
    );
  }

  void _printCertificate(BuildContext context) {
    // printing package integration
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Preparing print...')),
    );
  }

  void _downloadPdf(BuildContext context) {
    // url_launcher to open PDF URL
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Downloading: ${certificate.pdfUrl ?? "generating..."}')),
    );
  }
}
