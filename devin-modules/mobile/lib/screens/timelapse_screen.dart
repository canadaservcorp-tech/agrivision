import 'dart:typed_data';
import 'package:flutter/material.dart';
import '../services/timelapse_service.dart';

class TimelapseScreen extends StatefulWidget {
  final String farmId;
  final String farmName;
  final String? farmLogoUrl;

  const TimelapseScreen({
    super.key,
    required this.farmId,
    required this.farmName,
    this.farmLogoUrl,
  });

  @override
  State<TimelapseScreen> createState() => _TimelapseScreenState();
}

class _TimelapseScreenState extends State<TimelapseScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final TimelapseService _service = TimelapseService();

  // Gallery state
  List<CapturedPhoto> _photos = [];
  List<TimelapseVideo> _videos = [];
  bool _loadingPhotos = true;
  bool _loadingVideos = true;

  // Generation form
  DateTime _startDate = DateTime.now().subtract(const Duration(days: 7));
  DateTime _endDate = DateTime.now();
  double _fps = 10;
  String _resolution = '4K';
  bool _showLogo = true;
  bool _showTimestamp = true;
  bool _showWeatherOverlay = false;
  bool _generating = false;
  double _progress = 0;
  String _progressStatus = '';

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadPhotos();
    _loadVideos();
  }

  Future<void> _loadPhotos() async {
    setState(() => _loadingPhotos = true);
    try {
      final photos = await _service.getPhotos(widget.farmId, limit: 100);
      if (mounted) setState(() { _photos = photos; _loadingPhotos = false; });
    } catch (e) {
      if (mounted) setState(() => _loadingPhotos = false);
    }
  }

  Future<void> _loadVideos() async {
    setState(() => _loadingVideos = true);
    try {
      final videos = await _service.getTimelapseVideos(widget.farmId);
      if (mounted) setState(() { _videos = videos; _loadingVideos = false; });
    } catch (e) {
      if (mounted) setState(() => _loadingVideos = false);
    }
  }

  Future<void> _generateTimelapse() async {
    setState(() { _generating = true; _progress = 0; _progressStatus = 'Fetching photos...'; });

    try {
      final video = await _service.generateTimelapse(
        farmId: widget.farmId,
        startDate: _startDate,
        endDate: _endDate,
        fps: _fps.toInt(),
        resolution: _resolution,
        showLogo: _showLogo,
        showTimestamp: _showTimestamp,
        showWeather: _showWeatherOverlay,
        farmName: widget.farmName,
        farmLogoUrl: widget.farmLogoUrl,
        onProgress: (progress, status) {
          if (mounted) setState(() { _progress = progress; _progressStatus = status; });
        },
      );

      if (mounted) {
        setState(() { _generating = false; });
        _loadVideos();
        _tabController.animateTo(2); // Switch to Videos tab

        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('Time-lapse video created! ${video.photoCount} photos → ${video.durationSeconds}s video'),
          backgroundColor: const Color(0xFF2E7D32),
        ));
      }
    } catch (e) {
      if (mounted) {
        setState(() { _generating = false; });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Generation failed: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Time-Lapse Studio'),
        backgroundColor: const Color(0xFF1B5E20),
        foregroundColor: Colors.white,
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: Colors.white,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white60,
          tabs: const [
            Tab(icon: Icon(Icons.photo_library), text: 'Photos'),
            Tab(icon: Icon(Icons.movie_creation), text: 'Generate'),
            Tab(icon: Icon(Icons.video_library), text: 'Videos'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildPhotosGallery(),
          _buildGenerateForm(),
          _buildVideosList(),
        ],
      ),
    );
  }

  // ============ TAB 1: Photos Gallery ============
  Widget _buildPhotosGallery() {
    if (_loadingPhotos) return const Center(child: CircularProgressIndicator());

    if (_photos.isEmpty) {
      return Center(child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.photo_camera_outlined, size: 64, color: Colors.grey.shade300),
          const SizedBox(height: 12),
          const Text('No photos captured yet', style: TextStyle(color: Colors.grey, fontSize: 16)),
          const SizedBox(height: 4),
          const Text('Photos are taken every 20 minutes automatically',
            style: TextStyle(color: Colors.grey, fontSize: 12)),
        ],
      ));
    }

    return RefreshIndicator(
      onRefresh: _loadPhotos,
      child: Column(
        children: [
          // Stats bar
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            color: const Color(0xFFE8F5E9),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _stat('Total', '${_photos.length}'),
                _stat('Today', '${_photos.where((p) => _isToday(p.capturedAt)).length}'),
                _stat('This Week', '${_photos.where((p) => _isThisWeek(p.capturedAt)).length}'),
                _stat('Interval', '20 min'),
                _stat('Quality', '24MP'),
              ],
            ),
          ),
          // Grid
          Expanded(
            child: GridView.builder(
              padding: const EdgeInsets.all(8),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 3, crossAxisSpacing: 4, mainAxisSpacing: 4,
              ),
              itemCount: _photos.length,
              itemBuilder: (ctx, i) {
                final photo = _photos[i];
                return GestureDetector(
                  onTap: () => _showPhotoDetail(photo),
                  child: Stack(
                    fit: StackFit.expand,
                    children: [
                      Container(
                        decoration: BoxDecoration(
                          color: Colors.grey.shade200,
                          borderRadius: BorderRadius.circular(6),
                          image: photo.thumbnailUrl != null
                            ? DecorationImage(image: NetworkImage(photo.thumbnailUrl!), fit: BoxFit.cover)
                            : null,
                        ),
                        child: photo.thumbnailUrl == null
                          ? const Center(child: Icon(Icons.image, color: Colors.grey))
                          : null,
                      ),
                      // Timestamp overlay
                      Positioned(
                        bottom: 0, left: 0, right: 0,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              begin: Alignment.bottomCenter, end: Alignment.topCenter,
                              colors: [Colors.black54, Colors.transparent],
                            ),
                            borderRadius: const BorderRadius.vertical(bottom: Radius.circular(6)),
                          ),
                          child: Text(
                            _formatShortDate(photo.capturedAt),
                            style: const TextStyle(color: Colors.white, fontSize: 8),
                          ),
                        ),
                      ),
                      // Disease alert badge
                      if (photo.hasDiseaseAlert)
                        Positioned(
                          top: 4, right: 4,
                          child: Container(
                            padding: const EdgeInsets.all(2),
                            decoration: const BoxDecoration(color: Colors.red, shape: BoxShape.circle),
                            child: const Icon(Icons.warning, color: Colors.white, size: 12),
                          ),
                        ),
                    ],
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  // ============ TAB 2: Generate Time-Lapse ============
  Widget _buildGenerateForm() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Farm banner
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: const Color(0xFFE8F5E9), borderRadius: BorderRadius.circular(12),
            ),
            child: Row(children: [
              if (widget.farmLogoUrl != null)
                ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: Image.network(widget.farmLogoUrl!, width: 40, height: 40, fit: BoxFit.cover),
                )
              else
                Container(
                  width: 40, height: 40,
                  decoration: BoxDecoration(color: const Color(0xFF2E7D32), borderRadius: BorderRadius.circular(8)),
                  child: const Icon(Icons.agriculture, color: Colors.white, size: 22),
                ),
              const SizedBox(width: 12),
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(widget.farmName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                const Text('Time-Lapse Generator', style: TextStyle(fontSize: 11, color: Colors.grey)),
              ]),
            ]),
          ),
          const SizedBox(height: 24),

          // Date range
          const Text('Date Range', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
          const SizedBox(height: 10),
          Row(children: [
            Expanded(child: _dateButton('Start', _startDate, (d) => setState(() => _startDate = d))),
            const Padding(padding: EdgeInsets.symmetric(horizontal: 10), child: Icon(Icons.arrow_forward, size: 18, color: Colors.grey)),
            Expanded(child: _dateButton('End', _endDate, (d) => setState(() => _endDate = d))),
          ]),
          const SizedBox(height: 6),
          Text(
            '${_daysBetween(_startDate, _endDate)} days · ~${_daysBetween(_startDate, _endDate) * 72} photos estimated',
            style: const TextStyle(fontSize: 11, color: Colors.grey),
          ),
          const SizedBox(height: 24),

          // Quick presets
          const Text('Quick Presets', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
          const SizedBox(height: 8),
          Wrap(spacing: 8, runSpacing: 8, children: [
            _presetChip('Last 24h', 1),
            _presetChip('Last 3 days', 3),
            _presetChip('Last 7 days', 7),
            _presetChip('Last 14 days', 14),
            _presetChip('Last 30 days', 30),
            _presetChip('Full Season', 90),
          ]),
          const SizedBox(height: 24),

          // Video settings
          const Text('Video Settings', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
          const SizedBox(height: 12),

          // FPS slider
          Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
            const Text('Speed (FPS)', style: TextStyle(fontSize: 13)),
            Text('${_fps.toInt()} fps', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
          ]),
          Slider(
            value: _fps, min: 5, max: 30, divisions: 5,
            activeColor: const Color(0xFF2E7D32),
            onChanged: (v) => setState(() => _fps = v),
          ),
          Text(
            'Result: ~${(_daysBetween(_startDate, _endDate) * 72 / _fps).toStringAsFixed(0)}s video '
            '(${((_daysBetween(_startDate, _endDate) * 72 / _fps) / 60).toStringAsFixed(1)} min)',
            style: const TextStyle(fontSize: 11, color: Colors.grey),
          ),
          const SizedBox(height: 16),

          // Resolution
          Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
            const Text('Resolution', style: TextStyle(fontSize: 13)),
            SegmentedButton<String>(
              segments: const [
                ButtonSegment(value: '1080p', label: Text('1080p', style: TextStyle(fontSize: 11))),
                ButtonSegment(value: '4K', label: Text('4K', style: TextStyle(fontSize: 11))),
                ButtonSegment(value: '24MP', label: Text('24MP', style: TextStyle(fontSize: 11))),
              ],
              selected: {_resolution},
              onSelectionChanged: (v) => setState(() => _resolution = v.first),
              style: ButtonStyle(
                backgroundColor: WidgetStateProperty.resolveWith((s) =>
                  s.contains(WidgetState.selected) ? const Color(0xFF2E7D32) : null),
                foregroundColor: WidgetStateProperty.resolveWith((s) =>
                  s.contains(WidgetState.selected) ? Colors.white : null),
              ),
            ),
          ]),
          const SizedBox(height: 20),

          // Overlay options
          const Text('Overlays', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
          const SizedBox(height: 8),
          _toggleOption(Icons.branding_watermark, 'Farm Logo Watermark',
            'Show farm name & logo on video', _showLogo, (v) => setState(() => _showLogo = v)),
          _toggleOption(Icons.access_time, 'Timestamp',
            'Show date & time on each frame', _showTimestamp, (v) => setState(() => _showTimestamp = v)),
          _toggleOption(Icons.thermostat, 'Weather Data',
            'Overlay temperature & humidity readings', _showWeatherOverlay, (v) => setState(() => _showWeatherOverlay = v)),
          const SizedBox(height: 24),

          // Generate button or progress
          if (_generating) ...[
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: const Color(0xFFE8F5E9), borderRadius: BorderRadius.circular(12),
              ),
              child: Column(children: [
                LinearProgressIndicator(
                  value: _progress,
                  backgroundColor: Colors.grey.shade200,
                  valueColor: const AlwaysStoppedAnimation(Color(0xFF2E7D32)),
                  minHeight: 8,
                  borderRadius: BorderRadius.circular(4),
                ),
                const SizedBox(height: 10),
                Text(_progressStatus, style: const TextStyle(fontSize: 12, color: Colors.grey)),
                Text('${(_progress * 100).toStringAsFixed(0)}%',
                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF2E7D32))),
              ]),
            ),
          ] else
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: _generateTimelapse,
                icon: const Icon(Icons.movie_creation),
                label: const Text('Generate Time-Lapse Video'),
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

  // ============ TAB 3: Generated Videos ============
  Widget _buildVideosList() {
    if (_loadingVideos) return const Center(child: CircularProgressIndicator());

    if (_videos.isEmpty) {
      return Center(child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.video_library_outlined, size: 64, color: Colors.grey.shade300),
          const SizedBox(height: 12),
          const Text('No time-lapse videos yet', style: TextStyle(color: Colors.grey, fontSize: 16)),
          const SizedBox(height: 8),
          ElevatedButton(
            onPressed: () => _tabController.animateTo(1),
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF2E7D32)),
            child: const Text('Create One', style: TextStyle(color: Colors.white)),
          ),
        ],
      ));
    }

    return RefreshIndicator(
      onRefresh: _loadVideos,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _videos.length,
        itemBuilder: (ctx, i) {
          final video = _videos[i];
          return Card(
            margin: const EdgeInsets.only(bottom: 12),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            child: InkWell(
              onTap: () => _playVideo(video),
              borderRadius: BorderRadius.circular(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Thumbnail
                  Container(
                    height: 160,
                    decoration: BoxDecoration(
                      color: Colors.grey.shade200,
                      borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
                      image: video.thumbnailUrl != null
                        ? DecorationImage(image: NetworkImage(video.thumbnailUrl!), fit: BoxFit.cover)
                        : null,
                    ),
                    child: Stack(children: [
                      // Play button overlay
                      Center(
                        child: Container(
                          width: 56, height: 56,
                          decoration: BoxDecoration(
                            color: Colors.black45, shape: BoxShape.circle,
                            border: Border.all(color: Colors.white, width: 2),
                          ),
                          child: const Icon(Icons.play_arrow, color: Colors.white, size: 32),
                        ),
                      ),
                      // Duration badge
                      Positioned(
                        bottom: 8, right: 8,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(color: Colors.black54, borderRadius: BorderRadius.circular(4)),
                          child: Text(_formatDuration(video.durationSeconds),
                            style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
                        ),
                      ),
                      // Farm logo
                      if (video.hasLogo)
                        Positioned(
                          top: 8, left: 8,
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                            decoration: BoxDecoration(
                              color: const Color(0xFF1B5E20).withOpacity(0.85),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(widget.farmName,
                              style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold)),
                          ),
                        ),
                    ]),
                  ),
                  // Info
                  Padding(
                    padding: const EdgeInsets.all(12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '${_formatDate(video.startDate)} → ${_formatDate(video.endDate)}',
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                        ),
                        const SizedBox(height: 4),
                        Row(children: [
                          _videoStat(Icons.photo, '${video.photoCount} photos'),
                          const SizedBox(width: 12),
                          _videoStat(Icons.speed, '${video.fps} fps'),
                          const SizedBox(width: 12),
                          _videoStat(Icons.high_quality, video.resolution),
                          const SizedBox(width: 12),
                          _videoStat(Icons.storage, video.fileSizeMb),
                        ]),
                        const SizedBox(height: 8),
                        Row(children: [
                          Expanded(
                            child: OutlinedButton.icon(
                              onPressed: () => _shareVideo(video),
                              icon: const Icon(Icons.share, size: 16),
                              label: const Text('Share', style: TextStyle(fontSize: 12)),
                              style: OutlinedButton.styleFrom(foregroundColor: const Color(0xFF2E7D32)),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: OutlinedButton.icon(
                              onPressed: () => _downloadVideo(video),
                              icon: const Icon(Icons.download, size: 16),
                              label: const Text('Save', style: TextStyle(fontSize: 12)),
                              style: OutlinedButton.styleFrom(foregroundColor: const Color(0xFF2E7D32)),
                            ),
                          ),
                          const SizedBox(width: 8),
                          IconButton(
                            onPressed: () => _deleteVideo(video),
                            icon: const Icon(Icons.delete_outline, size: 20, color: Colors.red),
                          ),
                        ]),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  // ============ Helper Widgets ============

  Widget _stat(String label, String value) {
    return Column(children: [
      Text(value, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Color(0xFF1B5E20))),
      Text(label, style: const TextStyle(fontSize: 10, color: Colors.grey)),
    ]);
  }

  Widget _dateButton(String label, DateTime date, Function(DateTime) onPicked) {
    return OutlinedButton(
      onPressed: () async {
        final picked = await showDatePicker(
          context: context,
          initialDate: date,
          firstDate: DateTime(2024),
          lastDate: DateTime.now(),
        );
        if (picked != null) onPicked(picked);
      },
      style: OutlinedButton.styleFrom(
        foregroundColor: const Color(0xFF2E7D32),
        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 12),
      ),
      child: Column(children: [
        Text(label, style: const TextStyle(fontSize: 10, color: Colors.grey)),
        Text(_formatDate(date), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
      ]),
    );
  }

  Widget _presetChip(String label, int days) {
    final selected = _daysBetween(_startDate, _endDate) == days;
    return ChoiceChip(
      label: Text(label),
      selected: selected,
      selectedColor: const Color(0xFFE8F5E9),
      onSelected: (_) => setState(() {
        _endDate = DateTime.now();
        _startDate = DateTime.now().subtract(Duration(days: days));
      }),
    );
  }

  Widget _toggleOption(IconData icon, String title, String sub, bool value, Function(bool) onChanged) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: SwitchListTile(
        secondary: Icon(icon, color: const Color(0xFF2E7D32), size: 22),
        title: Text(title, style: const TextStyle(fontSize: 13)),
        subtitle: Text(sub, style: const TextStyle(fontSize: 10, color: Colors.grey)),
        value: value,
        activeColor: const Color(0xFF2E7D32),
        onChanged: onChanged,
        contentPadding: EdgeInsets.zero,
        dense: true,
      ),
    );
  }

  Widget _videoStat(IconData icon, String text) {
    return Row(children: [
      Icon(icon, size: 12, color: Colors.grey),
      const SizedBox(width: 3),
      Text(text, style: const TextStyle(fontSize: 10, color: Colors.grey)),
    ]);
  }

  // ============ Helpers ============

  int _daysBetween(DateTime a, DateTime b) => b.difference(a).inDays.abs().clamp(1, 365);
  bool _isToday(DateTime d) => d.day == DateTime.now().day && d.month == DateTime.now().month;
  bool _isThisWeek(DateTime d) => DateTime.now().difference(d).inDays < 7;

  String _formatDate(DateTime d) => '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';
  String _formatShortDate(DateTime d) => '${d.month}/${d.day} ${d.hour}:${d.minute.toString().padLeft(2, '0')}';
  String _formatDuration(int seconds) {
    if (seconds < 60) return '${seconds}s';
    return '${seconds ~/ 60}:${(seconds % 60).toString().padLeft(2, '0')}';
  }

  void _showPhotoDetail(CapturedPhoto photo) {
    showDialog(context: context, builder: (_) => Dialog(
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        if (photo.imageUrl != null)
          Image.network(photo.imageUrl!, fit: BoxFit.cover),
        Padding(
          padding: const EdgeInsets.all(12),
          child: Column(children: [
            Text(_formatDate(photo.capturedAt), style: const TextStyle(fontWeight: FontWeight.bold)),
            if (photo.temperature != null)
              Text('${photo.temperature}°C · ${photo.humidity}% humidity', style: const TextStyle(fontSize: 12, color: Colors.grey)),
            if (photo.hasDiseaseAlert)
              Container(
                margin: const EdgeInsets.only(top: 8),
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(color: Colors.red.shade50, borderRadius: BorderRadius.circular(8)),
                child: Row(children: [
                  const Icon(Icons.warning, color: Colors.red, size: 16),
                  const SizedBox(width: 6),
                  Text('Disease detected: ${photo.diseaseType}',
                    style: const TextStyle(color: Colors.red, fontSize: 12)),
                ]),
              ),
          ]),
        ),
      ]),
    ));
  }

  void _playVideo(TimelapseVideo video) {
    // TODO: Open video player with video.videoUrl
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Playing: ${video.videoUrl}')));
  }

  void _shareVideo(TimelapseVideo video) {
    // share_plus integration
    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Sharing video...')));
  }

  void _downloadVideo(TimelapseVideo video) {
    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Downloading video...')));
  }

  void _deleteVideo(TimelapseVideo video) {
    showDialog(context: context, builder: (_) => AlertDialog(
      title: const Text('Delete Video?'),
      content: Text('Delete time-lapse from ${_formatDate(video.startDate)} to ${_formatDate(video.endDate)}?'),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
        TextButton(
          onPressed: () async {
            Navigator.pop(context);
            await _service.deleteTimelapse(video.id);
            _loadVideos();
          },
          child: const Text('Delete', style: TextStyle(color: Colors.red)),
        ),
      ],
    ));
  }

  @override
  void dispose() { _tabController.dispose(); super.dispose(); }
}
