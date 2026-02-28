/**
 * AgriVision Camera Node — Configuration Manager
 * ================================================
 * Per-unit identity + settings stored in NVS (survives reboots + OTA).
 * Factory reset via long-press BOOT button → wipes config.
 * © 2026 PCTA S.A.
 */
#ifndef AGRI_CONFIG_H
#define AGRI_CONFIG_H

#include <Preferences.h>
#include <esp_mac.h>

#define DEFAULT_HUB_SSID     "AgriVision-HUB"
#define DEFAULT_HUB_PASS     "agri2026secure"
#define DEFAULT_HUB_IP       "192.168.4.1"
#define DEFAULT_HUB_PORT     8080
#define DEFAULT_CAPTURE_SEC  900
#define DEFAULT_JPEG_Q       12
#define DEFAULT_RESOLUTION   0  // UXGA 1600x1200

struct NodeConfig {
  char serial[16];
  char mac[18];
  char hub_ssid[33];
  char hub_pass[64];
  char hub_ip[16];
  uint16_t hub_port;
  uint16_t capture_sec;
  bool flash_enabled;
  bool autofocus;
  uint8_t jpeg_quality;
  uint8_t resolution;
  char zone[32];
  char fw_version[16];
  bool provisioned;
  uint32_t boot_count;
  uint32_t total_images;
  uint32_t total_detections;
};

class ConfigManager {
public:
  NodeConfig cfg;

  void begin() {
    _prefs.begin("agri", false);
    _load();
  }

  bool isProvisioned() { return cfg.provisioned; }

  void provision(const char* serial, const char* ssid, const char* pass,
                 const char* ip, uint16_t port, const char* zone) {
    _put("serial", serial, cfg.serial, 16);
    _put("hub_ssid", ssid, cfg.hub_ssid, 33);
    _put("hub_pass", pass, cfg.hub_pass, 64);
    _put("hub_ip", ip, cfg.hub_ip, 16);
    cfg.hub_port = port;  _prefs.putUShort("hub_port", port);
    _put("zone", zone, cfg.zone, 32);
    cfg.provisioned = true; _prefs.putBool("prov", true);
    Serial.printf("[CFG] Provisioned as %s → %s:%d zone=%s\n", serial, ip, port, zone);
  }

  void setCaptureInterval(uint16_t sec) {
    cfg.capture_sec = sec; _prefs.putUShort("cap_sec", sec);
  }
  void setFlash(bool en)    { cfg.flash_enabled = en; _prefs.putBool("flash", en); }
  void setResolution(uint8_t r) { cfg.resolution = r; _prefs.putUChar("res", r); }
  void setJpegQuality(uint8_t q) { cfg.jpeg_quality = q; _prefs.putUChar("jpegq", q); }

  void incrementImages()     { cfg.total_images++;     _prefs.putUInt("tot_img", cfg.total_images); }
  void incrementDetections() { cfg.total_detections++; _prefs.putUInt("tot_det", cfg.total_detections); }

  void factoryReset() {
    Serial.println("[CFG] *** FACTORY RESET ***");
    _prefs.clear();
    delay(300);
    ESP.restart();
  }

private:
  Preferences _prefs;

  void _put(const char* key, const char* val, char* dst, size_t sz) {
    strncpy(dst, val, sz - 1); dst[sz - 1] = '\0';
    _prefs.putString(key, val);
  }

  void _load() {
    cfg.provisioned  = _prefs.getBool("prov", false);
    cfg.boot_count   = _prefs.getUInt("boots", 0) + 1;
    _prefs.putUInt("boots", cfg.boot_count);

    _loadStr("serial",   cfg.serial,   16, "UNPROVISIONED");
    _loadStr("hub_ssid", cfg.hub_ssid, 33, DEFAULT_HUB_SSID);
    _loadStr("hub_pass", cfg.hub_pass, 64, DEFAULT_HUB_PASS);
    _loadStr("hub_ip",   cfg.hub_ip,   16, DEFAULT_HUB_IP);
    _loadStr("zone",     cfg.zone,     32, "default");

    cfg.hub_port       = _prefs.getUShort("hub_port", DEFAULT_HUB_PORT);
    cfg.capture_sec    = _prefs.getUShort("cap_sec",  DEFAULT_CAPTURE_SEC);
    cfg.flash_enabled  = _prefs.getBool("flash", false);
    cfg.autofocus      = _prefs.getBool("af", true);
    cfg.jpeg_quality   = _prefs.getUChar("jpegq", DEFAULT_JPEG_Q);
    cfg.resolution     = _prefs.getUChar("res", DEFAULT_RESOLUTION);
    cfg.total_images   = _prefs.getUInt("tot_img", 0);
    cfg.total_detections = _prefs.getUInt("tot_det", 0);

    strncpy(cfg.fw_version, FW_VERSION, sizeof(cfg.fw_version));

    // MAC address
    uint8_t mac[6];
    esp_read_mac(mac, ESP_MAC_WIFI_STA);
    snprintf(cfg.mac, sizeof(cfg.mac), "%02X:%02X:%02X:%02X:%02X:%02X",
             mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);
  }

  void _loadStr(const char* key, char* dst, size_t sz, const char* def) {
    String v = _prefs.getString(key, def);
    strncpy(dst, v.c_str(), sz - 1); dst[sz - 1] = '\0';
  }
};

#endif
