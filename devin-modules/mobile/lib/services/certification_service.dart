import 'dart:convert';
import 'package:http/http.dart' as http;

const String _baseUrl = String.fromEnvironment('API_BASE_URL', defaultValue: 'http://localhost:3000');

// ============================================================
// CERTIFICATION API SERVICE
// ============================================================
class CertificationApiService {
  String? _authToken;
  void setToken(String token) => _authToken = token;

  Map<String, String> get _headers => {
    'Content-Type': 'application/json',
    if (_authToken != null) 'Authorization': 'Bearer $_authToken',
  };

  Future<EligibilityResult> checkEligibility(String farmId, String type, String season) async {
    final res = await http.get(
      Uri.parse('$_baseUrl/api/v1/certification/eligibility/$farmId?certificate_type=$type&season=$season'),
      headers: _headers,
    );
    if (res.statusCode != 200) throw Exception('Eligibility check failed');
    final data = jsonDecode(res.body)['data'];
    return EligibilityResult.fromJson(data);
  }

  Future<GreenCertificate> requestCertificate({
    required String farmId,
    required String certificateType,
    required List<String> certifiedProducts,
    required String season,
    bool pesticideCompliance = false,
  }) async {
    final res = await http.post(
      Uri.parse('$_baseUrl/api/v1/certification/request'),
      headers: _headers,
      body: jsonEncode({
        'farm_id': farmId,
        'certificate_type': certificateType,
        'certified_products': certifiedProducts,
        'season': season,
        'pesticide_compliance': pesticideCompliance,
      }),
    );
    if (res.statusCode != 201) {
      final error = jsonDecode(res.body);
      throw Exception(error['error'] ?? 'Certificate request failed');
    }
    return GreenCertificate.fromJson(jsonDecode(res.body)['data']);
  }

  Future<List<GreenCertificate>> getMyCertificates() async {
    final res = await http.get(Uri.parse('$_baseUrl/api/v1/certification/my-certificates'), headers: _headers);
    if (res.statusCode != 200) return [];
    final data = jsonDecode(res.body)['data'] as List;
    return data.map((c) => GreenCertificate.fromJson(c)).toList();
  }

  Future<GreenCertificate?> getCertificate(String certId) async {
    final res = await http.get(Uri.parse('$_baseUrl/api/v1/certification/$certId'), headers: _headers);
    if (res.statusCode != 200) return null;
    return GreenCertificate.fromJson(jsonDecode(res.body)['data']);
  }

  Future<Map<String, dynamic>?> verifyCertificate(String certNumber) async {
    final res = await http.get(Uri.parse('$_baseUrl/api/v1/certification/verify/$certNumber'));
    if (res.statusCode != 200) return null;
    return jsonDecode(res.body);
  }
}

// ============================================================
// DATA MODELS
// ============================================================

class GreenCertificate {
  final String id;
  final String farmId;
  final String certificateNumber;
  final String certificateType;
  final String farmName;
  final String farmerName;
  final String? farmLocation;
  final double? farmAreaHa;
  final List<String> certifiedProducts;
  final String season;
  final double overallScore;
  final Map<String, dynamic>? criteriaScores;
  final String status;
  final DateTime? issuedAt;
  final DateTime? validFrom;
  final DateTime? validUntil;
  final String? qrCodeData;
  final String? pdfUrl;

  GreenCertificate({
    required this.id, required this.farmId, required this.certificateNumber,
    required this.certificateType, required this.farmName, required this.farmerName,
    this.farmLocation, this.farmAreaHa, required this.certifiedProducts,
    required this.season, required this.overallScore, this.criteriaScores,
    required this.status, this.issuedAt, this.validFrom, this.validUntil,
    this.qrCodeData, this.pdfUrl,
  });

  factory GreenCertificate.fromJson(Map<String, dynamic> json) => GreenCertificate(
    id: json['id'] ?? '',
    farmId: json['farm_id'] ?? '',
    certificateNumber: json['certificate_number'] ?? '',
    certificateType: json['certificate_type'] ?? 'disease_free',
    farmName: json['farm_name'] ?? '',
    farmerName: json['farmer_name'] ?? '',
    farmLocation: json['farm_location'],
    farmAreaHa: json['farm_area_ha'] != null ? double.tryParse(json['farm_area_ha'].toString()) : null,
    certifiedProducts: List<String>.from(json['certified_products'] ?? []),
    season: json['season'] ?? '',
    overallScore: (json['overall_score'] ?? 0).toDouble(),
    criteriaScores: json['criteria_scores'] is String
        ? jsonDecode(json['criteria_scores']) : json['criteria_scores'],
    status: json['status'] ?? 'pending',
    issuedAt: json['issued_at'] != null ? DateTime.tryParse(json['issued_at']) : null,
    validFrom: json['valid_from'] != null ? DateTime.tryParse(json['valid_from']) : null,
    validUntil: json['valid_until'] != null ? DateTime.tryParse(json['valid_until']) : null,
    qrCodeData: json['qr_code_data'],
    pdfUrl: json['pdf_url'],
  );

  bool get isActive => status == 'active' && validUntil != null && validUntil!.isAfter(DateTime.now());
}

class EligibilityResult {
  final bool eligible;
  final double overallScore;
  final List<Map<String, dynamic>> criteriaResults;
  final List<Map<String, dynamic>> missing;
  final List<String> recommendations;

  EligibilityResult({
    required this.eligible, required this.overallScore,
    required this.criteriaResults, required this.missing,
    required this.recommendations,
  });

  factory EligibilityResult.fromJson(Map<String, dynamic> json) => EligibilityResult(
    eligible: json['eligible'] ?? false,
    overallScore: (json['overall_score'] ?? 0).toDouble(),
    criteriaResults: List<Map<String, dynamic>>.from(json['criteria_results'] ?? []),
    missing: List<Map<String, dynamic>>.from(json['missing_criteria'] ?? []),
    recommendations: List<String>.from(json['recommendations'] ?? []),
  );
}

class FranchisePartner {
  final String id;
  final String firstName;
  final String lastName;
  final String email;
  final String? phone;
  final String? companyName;
  final String businessType;
  final String businessDescription;
  final String country;
  final String? region;
  final String interestType;
  final String status;
  final String? partnerCode;
  final DateTime createdAt;

  FranchisePartner({
    required this.id, required this.firstName, required this.lastName,
    required this.email, this.phone, this.companyName,
    required this.businessType, required this.businessDescription,
    required this.country, this.region, required this.interestType,
    required this.status, this.partnerCode, required this.createdAt,
  });

  factory FranchisePartner.fromJson(Map<String, dynamic> json) => FranchisePartner(
    id: json['id'] ?? '',
    firstName: json['first_name'] ?? '',
    lastName: json['last_name'] ?? '',
    email: json['email'] ?? '',
    phone: json['phone'],
    companyName: json['company_name'],
    businessType: json['business_type'] ?? '',
    businessDescription: json['business_description'] ?? '',
    country: json['country'] ?? '',
    region: json['region'],
    interestType: json['interest_type'] ?? '',
    status: json['status'] ?? 'pending',
    partnerCode: json['partner_code'],
    createdAt: DateTime.parse(json['created_at'] ?? DateTime.now().toIso8601String()),
  );
}
