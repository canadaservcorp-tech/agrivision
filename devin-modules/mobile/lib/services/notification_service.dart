import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

class NotificationService {
  static final FlutterLocalNotificationsPlugin _local = FlutterLocalNotificationsPlugin();

  static Future<void> initialize() async {
    // Local notifications
    const android = AndroidInitializationSettings('@mipmap/ic_launcher');
    const ios = DarwinInitializationSettings(requestAlertPermission: true, requestBadgePermission: true);
    await _local.initialize(const InitializationSettings(android: android, iOS: ios));

    // Firebase messaging
    final messaging = FirebaseMessaging.instance;
    await messaging.requestPermission(alert: true, badge: true, sound: true);

    // Foreground messages
    FirebaseMessaging.onMessage.listen((message) {
      final notification = message.notification;
      if (notification != null) {
        showLocal(title: notification.title ?? 'AgriVision', body: notification.body ?? '');
      }
    });

    // Get FCM token for backend registration
    final token = await messaging.getToken();
    // TODO: Send token to backend via API
    print('FCM Token: $token');
  }

  static Future<void> showLocal({required String title, required String body}) async {
    const details = NotificationDetails(
      android: AndroidNotificationDetails(
        'agrivision_alerts', 'Farm Alerts',
        channelDescription: 'Disease detection and sensor alerts',
        importance: Importance.high,
        priority: Priority.high,
        icon: '@mipmap/ic_launcher',
      ),
      iOS: DarwinNotificationDetails(presentAlert: true, presentBadge: true, presentSound: true),
    );
    await _local.show(DateTime.now().millisecondsSinceEpoch ~/ 1000, title, body, details);
  }

  static Future<void> showDiseaseAlert(String disease, String severity, String camera) async {
    await showLocal(
      title: '🚨 $disease Detected',
      body: 'Severity: $severity • Camera: $camera',
    );
  }
}
