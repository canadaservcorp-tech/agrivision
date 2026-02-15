import 'package:flutter/material.dart';
import '../services/api_service.dart';

class DeviceProvider extends ChangeNotifier {
  List<dynamic> _devices = [];
  bool _loading = false;

  List<dynamic> get devices => _devices;
  bool get loading => _loading;

  Future<void> loadDevices() async {
    _loading = true; notifyListeners();
    try {
      _devices = await ApiService.getDevices();
    } catch (e) {
      print('Device load error: $e');
    }
    _loading = false; notifyListeners();
  }
}
