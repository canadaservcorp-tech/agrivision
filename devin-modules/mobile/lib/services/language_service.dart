import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Multi-language support: Arabic, English, Turkish
/// Persists user preference and supports live switching + RTL

enum AppLanguage { en, ar, tr }

class LanguageNotifier extends StateNotifier<AppLanguage> {
  LanguageNotifier() : super(AppLanguage.en) {
    _load();
  }

  Future<void> _load() async {
    final prefs = await SharedPreferences.getInstance();
    final code = prefs.getString('app_language') ?? 'en';
    state = AppLanguage.values.firstWhere((l) => l.name == code, orElse: () => AppLanguage.en);
  }

  Future<void> setLanguage(AppLanguage lang) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('app_language', lang.name);
    state = lang;
  }
}

final languageProvider = StateNotifierProvider<LanguageNotifier, AppLanguage>(
  (ref) => LanguageNotifier(),
);

/// Translation map
const Map<String, Map<String, String>> _translations = {
  // Navigation & General
  'home': {'en': 'Home', 'ar': 'الرئيسية', 'tr': 'Ana Sayfa'},
  'cameras': {'en': 'Cameras', 'ar': 'الكاميرات', 'tr': 'Kameralar'},
  'detections': {'en': 'Detections', 'ar': 'الكشوفات', 'tr': 'Tespitler'},
  'map': {'en': 'Map', 'ar': 'الخريطة', 'tr': 'Harita'},
  'settings': {'en': 'Settings', 'ar': 'الإعدادات', 'tr': 'Ayarlar'},
  'notifications': {'en': 'Notifications', 'ar': 'الإشعارات', 'tr': 'Bildirimler'},

  // Home screen
  'hello': {'en': 'Hello', 'ar': 'مرحبا', 'tr': 'Merhaba'},
  'active_alerts': {'en': 'Active Alerts', 'ar': 'تنبيهات نشطة', 'tr': 'Aktif Uyarilar'},
  'farm_health': {'en': 'Farm Health Score', 'ar': 'درجة صحة المزرعة', 'tr': 'Ciftlik Saglik Puani'},
  'weekly_trend': {'en': 'Weekly Trend', 'ar': 'الاتجاه الأسبوعي', 'tr': 'Haftalik Trend'},
  'view_reports': {'en': 'View Reports', 'ar': 'عرض التقارير', 'tr': 'Raporlari Gor'},
  'camera_fleet': {'en': 'Camera Fleet', 'ar': 'أسطول الكاميرات', 'tr': 'Kamera Filosu'},
  'view_all': {'en': 'View All', 'ar': 'عرض الكل', 'tr': 'Tumunu Gor'},
  'recent_detections': {'en': 'Recent Detections', 'ar': 'الكشوفات الأخيرة', 'tr': 'Son Tespitler'},

  // Production Progress
  'production_progress': {'en': 'Production Progress', 'ar': 'تقدم الإنتاج', 'tr': 'Uretim Ilerlemesi'},
  'fruit_diameter': {'en': 'Fruit Diameter', 'ar': 'قطر الثمرة', 'tr': 'Meyve Capi'},
  'growth_stage': {'en': 'Growth Stage', 'ar': 'مرحلة النمو', 'tr': 'Buyume Asamasi'},
  'growth_trend': {'en': 'Growth Trend', 'ar': 'اتجاه النمو', 'tr': 'Buyume Trendi'},
  'estimated_yield': {'en': 'Estimated Yield', 'ar': 'المحصول المقدر', 'tr': 'Tahmini Verim'},
  'health_score': {'en': 'Health Score', 'ar': 'درجة الصحة', 'tr': 'Saglik Puani'},
  'days_to_harvest': {'en': 'Days to Harvest', 'ar': 'أيام للحصاد', 'tr': 'Hasada Kalan Gun'},
  'zone_breakdown': {'en': 'Zone Breakdown', 'ar': 'تفاصيل المنطقة', 'tr': 'Bolge Detaylari'},
  'of_target': {'en': 'of target', 'ar': 'من الهدف', 'tr': 'hedefin'},
  'to_harvest': {'en': 'to harvest', 'ar': 'للحصاد', 'tr': 'hasada'},

  // Mode Control
  'system_mode': {'en': 'System Mode (A/B)', 'ar': 'وضع النظام (أ/ب)', 'tr': 'Sistem Modu (A/B)'},
  'mode_a_cctv': {'en': 'MODE A — CCTV', 'ar': 'الوضع أ — كاميرات', 'tr': 'MOD A — CCTV'},
  'mode_b_monitor': {'en': 'MODE B — MONITORING', 'ar': 'الوضع ب — مراقبة', 'tr': 'MOD B — IZLEME'},
  'cctv_desc': {'en': 'Live surveillance • Motion alerts • Local recording (HDD)', 'ar': 'مراقبة حية • تنبيهات حركة • تسجيل محلي', 'tr': 'Canli izleme • Hareket uyarilari • Yerel kayit'},
  'monitor_desc': {'en': 'AI Detection • Time-lapse • Scheduled capture', 'ar': 'كشف ذكي • فاصل زمني • التقاط مجدول', 'tr': 'AI Tespit • Hizlandirilmis • Zamanlanmis cekim'},

  // Settings
  'dark_mode': {'en': 'Dark Mode', 'ar': 'الوضع الداكن', 'tr': 'Karanlik Mod'},
  'dark_active': {'en': 'Dark theme active', 'ar': 'المظهر الداكن مفعل', 'tr': 'Karanlik tema aktif'},
  'light_active': {'en': 'Light theme active', 'ar': 'المظهر الفاتح مفعل', 'tr': 'Acik tema aktif'},
  'your_farms': {'en': 'Your Farms', 'ar': 'مزارعك', 'tr': 'Ciftlikleriniz'},
  'notification_prefs': {'en': 'Notification Preferences', 'ar': 'تفضيلات الإشعارات', 'tr': 'Bildirim Tercihleri'},
  'language': {'en': 'Language', 'ar': 'اللغة', 'tr': 'Dil'},
  'privacy': {'en': 'Privacy & Data Consent', 'ar': 'الخصوصية وموافقة البيانات', 'tr': 'Gizlilik ve Veri Onami'},
  'billing': {'en': 'Billing & Orders', 'ar': 'الفواتير والطلبات', 'tr': 'Faturalar ve Siparisler'},
  'firmware_updates': {'en': 'Firmware Updates', 'ar': 'تحديثات البرنامج', 'tr': 'Firmware Guncellemeleri'},
  'help': {'en': 'Help & Support', 'ar': 'المساعدة والدعم', 'tr': 'Yardim ve Destek'},
  'about': {'en': 'About', 'ar': 'حول', 'tr': 'Hakkinda'},
  'logout': {'en': 'Logout', 'ar': 'تسجيل الخروج', 'tr': 'Cikis Yap'},
  'select_language': {'en': 'Select Language', 'ar': 'اختر اللغة', 'tr': 'Dil Secin'},

  // Sensors
  'temp': {'en': 'Temp', 'ar': 'الحرارة', 'tr': 'Sicaklik'},
  'soil': {'en': 'Soil', 'ar': 'التربة', 'tr': 'Toprak'},
  'images': {'en': 'Images', 'ar': 'صور', 'tr': 'Goruntular'},

  // General
  'plants': {'en': 'plants', 'ar': 'نبات', 'tr': 'bitki'},
  'farms': {'en': 'farms', 'ar': 'مزارع', 'tr': 'ciftlik'},
  'all_zones': {'en': 'All Zones', 'ar': 'كل المناطق', 'tr': 'Tum Bolgeler'},
  'actual': {'en': 'Actual', 'ar': 'فعلي', 'tr': 'Gercek'},
  'target': {'en': 'Target', 'ar': 'هدف', 'tr': 'Hedef'},
};

/// Get translation for a key
String tr(AppLanguage lang, String key) {
  return _translations[key]?[lang.name] ?? _translations[key]?['en'] ?? key;
}

/// Language display info
String languageLabel(AppLanguage lang) {
  switch (lang) {
    case AppLanguage.en: return 'English';
    case AppLanguage.ar: return 'العربية';
    case AppLanguage.tr: return 'Turkce';
  }
}

String languageFlag(AppLanguage lang) {
  switch (lang) {
    case AppLanguage.en: return '🇬🇧';
    case AppLanguage.ar: return '🇸🇦';
    case AppLanguage.tr: return '🇹🇷';
  }
}

bool isRTL(AppLanguage lang) => lang == AppLanguage.ar;

Locale getLocale(AppLanguage lang) {
  switch (lang) {
    case AppLanguage.en: return const Locale('en');
    case AppLanguage.ar: return const Locale('ar');
    case AppLanguage.tr: return const Locale('tr');
  }
}
