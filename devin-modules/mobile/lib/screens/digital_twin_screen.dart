import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import '../models/farm_identity.dart';

class DigitalTwinScreen extends StatefulWidget {
  final FarmIdentity farm;

  const DigitalTwinScreen({super.key, required this.farm});

  @override
  State<DigitalTwinScreen> createState() => _DigitalTwinScreenState();
}

class _DigitalTwinScreenState extends State<DigitalTwinScreen> {
  String _activeLayer = 'sensors';
  final MapController _mapController = MapController();

  // Mock sensor positions — in production, load from device GPS data
  List<SensorPoint> get _sensorPoints => [
    SensorPoint('Sensor A', widget.farm.latitude + 0.001, widget.farm.longitude + 0.001,
        'temperature', 24.5, 'normal'),
    SensorPoint('Sensor B', widget.farm.latitude - 0.001, widget.farm.longitude + 0.002,
        'soil_moisture', 45.2, 'normal'),
    SensorPoint('Sensor C', widget.farm.latitude + 0.002, widget.farm.longitude - 0.001,
        'humidity', 92.1, 'warning'),
    SensorPoint('Camera 1', widget.farm.latitude, widget.farm.longitude,
        'camera', 0, 'active'),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Digital Twin — ${widget.farm.farmName}'),
        backgroundColor: const Color(0xFF1B5E20),
        foregroundColor: Colors.white,
      ),
      body: Stack(
        children: [
          // Map
          FlutterMap(
            mapController: _mapController,
            options: MapOptions(
              initialCenter: LatLng(widget.farm.latitude, widget.farm.longitude),
              initialZoom: 16,
            ),
            children: [
              TileLayer(
                urlTemplate: _activeLayer == 'satellite'
                    ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
                    : 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
              ),
              // Farm boundary (simplified circle)
              CircleLayer(
                circles: [
                  CircleMarker(
                    point: LatLng(widget.farm.latitude, widget.farm.longitude),
                    radius: _areaToRadius(widget.farm.totalAreaHa),
                    color: const Color(0xFF1B5E20).withOpacity(0.1),
                    borderColor: const Color(0xFF1B5E20),
                    borderStrokeWidth: 2,
                  ),
                ],
              ),
              // Sensor markers
              if (_activeLayer == 'sensors' || _activeLayer == 'satellite')
                MarkerLayer(
                  markers: _sensorPoints.map((s) => Marker(
                    point: LatLng(s.lat, s.lon),
                    width: 40,
                    height: 40,
                    child: GestureDetector(
                      onTap: () => _showSensorDetail(s),
                      child: Container(
                        decoration: BoxDecoration(
                          color: _statusColor(s.status),
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.white, width: 2),
                          boxShadow: [BoxShadow(color: Colors.black26, blurRadius: 4)],
                        ),
                        child: Icon(_sensorIcon(s.type), color: Colors.white, size: 20),
                      ),
                    ),
                  )).toList(),
                ),
            ],
          ),

          // Layer selector
          Positioned(
            top: 16,
            right: 16,
            child: Card(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  _layerButton('sensors', Icons.sensors, 'Sensors'),
                  _layerButton('satellite', Icons.satellite_alt, 'Satellite'),
                  _layerButton('ndvi', Icons.grass, 'NDVI'),
                  _layerButton('moisture', Icons.water_drop, 'Moisture'),
                ],
              ),
            ),
          ),

          // Farm info panel
          Positioned(
            bottom: 0,
            left: 0,
            right: 0,
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
                boxShadow: [BoxShadow(color: Colors.black12, blurRadius: 8)],
              ),
              child: SafeArea(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceAround,
                      children: [
                        _infoChip(Icons.straighten, '${widget.farm.totalAreaHa} ha'),
                        _infoChip(Icons.thermostat, '24.5°C'),
                        _infoChip(Icons.water_drop, '45.2%'),
                        _infoChip(Icons.cloud, '68% RH'),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Crops: ${widget.farm.primaryCrops.join(", ")}',
                      style: const TextStyle(color: Colors.grey, fontSize: 12),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _layerButton(String layer, IconData icon, String label) {
    final active = _activeLayer == layer;
    return InkWell(
      onTap: () => setState(() => _activeLayer = layer),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: active ? const Color(0xFFE8F5E9) : Colors.transparent,
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 18, color: active ? const Color(0xFF1B5E20) : Colors.grey),
            const SizedBox(width: 6),
            Text(label, style: TextStyle(fontSize: 12,
              color: active ? const Color(0xFF1B5E20) : Colors.grey,
              fontWeight: active ? FontWeight.bold : FontWeight.normal)),
          ],
        ),
      ),
    );
  }

  Widget _infoChip(IconData icon, String value) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 16, color: const Color(0xFF2E7D32)),
        const SizedBox(width: 4),
        Text(value, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
      ],
    );
  }

  double _areaToRadius(double hectares) {
    return (hectares * 10000 / 3.14159).abs().toDouble();
  }

  Color _statusColor(String status) {
    switch (status) {
      case 'warning': return Colors.orange;
      case 'critical': return Colors.red;
      case 'active': return const Color(0xFF1B5E20);
      default: return const Color(0xFF2E7D32);
    }
  }

  IconData _sensorIcon(String type) {
    switch (type) {
      case 'temperature': return Icons.thermostat;
      case 'soil_moisture': return Icons.water_drop;
      case 'humidity': return Icons.cloud;
      case 'camera': return Icons.camera_alt;
      default: return Icons.sensors;
    }
  }

  void _showSensorDetail(SensorPoint sensor) {
    showModalBottomSheet(
      context: context,
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(sensor.name, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Text('Type: ${sensor.type}'),
            if (sensor.value > 0) Text('Value: ${sensor.value}'),
            Text('Status: ${sensor.status.toUpperCase()}'),
            Text('Location: ${sensor.lat.toStringAsFixed(5)}, ${sensor.lon.toStringAsFixed(5)}'),
          ],
        ),
      ),
    );
  }
}

class SensorPoint {
  final String name;
  final double lat, lon;
  final String type;
  final double value;
  final String status;

  SensorPoint(this.name, this.lat, this.lon, this.type, this.value, this.status);
}
