import 'dart:convert';
import 'package:http/http.dart' as http;

class TimelapseService {
  final String baseUrl;
  final String? authToken;

  TimelapseService({this.baseUrl = 'https://api.agrivision.ca/api/v1', this.authToken});

  Map<String, String> get _headers => {
    'Content-Type': 'application/json',
    if (authToken != null) 'Authorization': 'Bearer $authToken',
  };

  // ============ Photos ============

  Future<List<CapturedPhoto>> getPhotos(String farmId, {int limit = 100, int offset = 0}) async {
    final res = await http.get(
      Uri.parse('$baseUrl/timelapse/$farmId/photos?limit=$limit&offset=$offset'),
      headers: _headers,
    );
    if (res.statusCode != 200) throw Exception('Failed to load photos');
    final data = jsonDecode(res.body);
    return (data['data'] as List).map((p) => CapturedPhoto.fromJson(p)).toList();
  }

  // ============ Time-Lapse Videos ============

  Future<List<TimelapseVideo>> getTimelapseVideos(String farmId) async {
    final res = await http.get(
      Uri.parse('$baseUrl/timelapse/$farmId/videos'),
      headers: _headers,
    );
    if (res.statusCode != 200) throw Exception('Failed to load videos');
    final data = jsonDecode(res.body);
    return (data['data'] as List).map((v) => TimelapseVideo.fromJson(v)).toList();
  }

  Future<TimelapseVideo> generateTimelapse({
    required String farmId,
    required DateTime startDate,
    required DateTime endDate,
    required int fps,
    required String resolution,
    required bool showLogo,
    required bool showTimestamp,
    required bool showWeather,
    required String farmName,
    String? farmLogoUrl,
    Function(double progress, String status)? onProgress,
  }) async {
    // Step 1: Request generation
    onProgress?.call(0.1, 'Requesting video generation...');

    final res = await http.post(
      Uri.parse('$baseUrl/timelapse/$farmId/generate'),
      headers: _headers,
      body: jsonEncode({
        'start_date': startDate.toIso8601String(),
        'end_date': endDate.toIso8601String(),
        'fps': fps,
        'resolution': resolution,
        'show_logo': showLogo,
        'show_timestamp': showTimestamp,
        'show_weather': showWeather,
        'farm_name': farmName,
        'farm_logo_url': farmLogoUrl,
      }),
    );

    if (res.statusCode != 202) throw Exception('Failed to start generation: ${res.body}');
    final job = jsonDecode(res.body);
    final jobId = job['data']['job_id'];

    // Step 2: Poll for progress
    while (true) {
      await Future.delayed(const Duration(seconds: 2));

      final pollRes = await http.get(
        Uri.parse('$baseUrl/timelapse/$farmId/jobs/$jobId'),
        headers: _headers,
      );

      if (pollRes.statusCode != 200) continue;
      final status = jsonDecode(pollRes.body)['data'];

      final progress = (status['progress'] as num).toDouble();
      final statusText = status['status_text'] as String;
      onProgress?.call(progress, statusText);

      if (status['status'] == 'completed') {
        return TimelapseVideo.fromJson(status['video']);
      }
      if (status['status'] == 'failed') {
        throw Exception(status['error'] ?? 'Generation failed');
      }
    }
  }

  Future<void> deleteTimelapse(String videoId) async {
    final res = await http.delete(
      Uri.parse('$baseUrl/timelapse/videos/$videoId'),
      headers: _headers,
    );
    if (res.statusCode != 200) throw Exception('Failed to delete');
  }

  // ============ CCTV Mode ============

  Future<CctvStatus> getCctvStatus(String farmId) async {
    final res = await http.get(
      Uri.parse('$baseUrl/timelapse/$farmId/cctv/status'),
      headers: _headers,
    );
    if (res.statusCode != 200) throw Exception('Failed to get CCTV status');
    return CctvStatus.fromJson(jsonDecode(res.body)['data']);
  }

  Future<void> setCctvMode(String farmId, bool enabled) async {
    await http.post(
      Uri.parse('$baseUrl/timelapse/$farmId/cctv'),
      headers: _headers,
      body: jsonEncode({'enabled': enabled}),
    );
  }
}

// ============ Models ============

class CapturedPhoto {
  final String id;
  final DateTime capturedAt;
  final String? thumbnailUrl;
  final String? imageUrl;
  final double? temperature;
  final double? humidity;
  final bool hasDiseaseAlert;
  final String? diseaseType;
  final int fileSizeKb;

  CapturedPhoto({
    required this.id, required this.capturedAt, this.thumbnailUrl,
    this.imageUrl, this.temperature, this.humidity,
    this.hasDiseaseAlert = false, this.diseaseType, this.fileSizeKb = 0,
  });

  factory CapturedPhoto.fromJson(Map<String, dynamic> j) => CapturedPhoto(
    id: j['id'],
    capturedAt: DateTime.parse(j['captured_at']),
    thumbnailUrl: j['thumbnail_url'],
    imageUrl: j['image_url'],
    temperature: (j['temperature'] as num?)?.toDouble(),
    humidity: (j['humidity'] as num?)?.toDouble(),
    hasDiseaseAlert: j['has_disease_alert'] ?? false,
    diseaseType: j['disease_type'],
    fileSizeKb: j['file_size_kb'] ?? 0,
  );
}

class TimelapseVideo {
  final String id;
  final DateTime startDate;
  final DateTime endDate;
  final int photoCount;
  final int fps;
  final String resolution;
  final int durationSeconds;
  final String? videoUrl;
  final String? thumbnailUrl;
  final bool hasLogo;
  final String fileSizeMb;
  final DateTime createdAt;

  TimelapseVideo({
    required this.id, required this.startDate, required this.endDate,
    required this.photoCount, required this.fps, required this.resolution,
    required this.durationSeconds, this.videoUrl, this.thumbnailUrl,
    this.hasLogo = false, this.fileSizeMb = '0', required this.createdAt,
  });

  factory TimelapseVideo.fromJson(Map<String, dynamic> j) => TimelapseVideo(
    id: j['id'],
    startDate: DateTime.parse(j['start_date']),
    endDate: DateTime.parse(j['end_date']),
    photoCount: j['photo_count'] ?? 0,
    fps: j['fps'] ?? 10,
    resolution: j['resolution'] ?? '1080p',
    durationSeconds: j['duration_seconds'] ?? 0,
    videoUrl: j['video_url'],
    thumbnailUrl: j['thumbnail_url'],
    hasLogo: j['has_logo'] ?? false,
    fileSizeMb: j['file_size_mb']?.toString() ?? '0',
    createdAt: DateTime.parse(j['created_at']),
  );
}

class CctvStatus {
  final bool enabled;
  final bool externalDriveDetected;
  final String? driveLabel;
  final int driveCapacityGb;
  final int driveUsedGb;
  final int recordingCount;
  final DateTime? lastRecording;

  CctvStatus({
    this.enabled = false, this.externalDriveDetected = false,
    this.driveLabel, this.driveCapacityGb = 0, this.driveUsedGb = 0,
    this.recordingCount = 0, this.lastRecording,
  });

  factory CctvStatus.fromJson(Map<String, dynamic> j) => CctvStatus(
    enabled: j['enabled'] ?? false,
    externalDriveDetected: j['external_drive_detected'] ?? false,
    driveLabel: j['drive_label'],
    driveCapacityGb: j['drive_capacity_gb'] ?? 0,
    driveUsedGb: j['drive_used_gb'] ?? 0,
    recordingCount: j['recording_count'] ?? 0,
    lastRecording: j['last_recording'] != null ? DateTime.parse(j['last_recording']) : null,
  );

  int get driveAvailableGb => driveCapacityGb - driveUsedGb;
  double get driveUsagePercent => driveCapacityGb > 0 ? driveUsedGb / driveCapacityGb : 0;
}
