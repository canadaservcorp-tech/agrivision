/**
 * AgriVision Camera Node — Heartbeat Reporter
 * ================================================
 * Sends periodic health status to hub.
 * Hub uses this for fleet monitoring, health scoring, command dispatch.
 * 
 * Heartbeat includes: battery, signal, SD status, images, uptime, temp.
 * Hub returns: pending commands (interval change, OTA, reboot, flash toggle).
 *
 * © 2026 PCTA S.A.
 */
#ifndef AGRI_HEARTBEAT_H
#define AGRI_HEARTBEAT_H

#include <Arduino.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <WiFi.h>

// Commands that can come back from hub
struct HubCommand {
  bool has_command;
  char cmd[32];       // "set_interval", "ota", "reboot", "set_flash", "set_zone", "factory_reset"
  char value[128];    // command argument
};

class HeartbeatReporter {
public:
  HubCommand lastCommand;
  uint32_t images_today = 0;
  uint32_t detections_today = 0;
  uint32_t upload_failures = 0;
  uint32_t sd_buffered = 0;
  bool sd_available = false;

  /**
   * Send heartbeat to hub. Returns pending command (if any).
   */
  bool send(const char* hub_ip, uint16_t hub_port,
            const char* serial, const char* mac, const char* fw_version,
            uint16_t batt_mv, uint8_t batt_pct, const char* pwr_profile,
            const char* zone) {

    lastCommand.has_command = false;

    char url[128];
    snprintf(url, sizeof(url), "http://%s:%d/api/heartbeat", hub_ip, hub_port);

    // Build JSON payload
    JsonDocument doc;
    doc["serial"] = serial;
    doc["mac"] = mac;
    doc["firmware"] = fw_version;
    doc["battery_mv"] = batt_mv;
    doc["battery_pct"] = batt_pct;
    doc["power_profile"] = pwr_profile;
    doc["rssi"] = WiFi.RSSI();
    doc["zone"] = zone;
    doc["images_today"] = images_today;
    doc["detections_today"] = detections_today;
    doc["upload_failures"] = upload_failures;
    doc["sd_available"] = sd_available;
    doc["sd_buffered"] = sd_buffered;
    doc["uptime_sec"] = millis() / 1000;
    doc["free_heap"] = ESP.getFreeHeap();
    doc["cpu_temp"] = temperatureRead();
    doc["boot_count"] = 0; // Set by caller

    char body[512];
    serializeJson(doc, body, sizeof(body));

    HTTPClient http;
    http.begin(url);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("X-Node-Serial", serial);
    http.setTimeout(10000);

    int code = http.POST(body);

    if (code == 200) {
      String resp = http.getString();
      _parseResponse(resp.c_str());
      Serial.printf("[HB] ✅ Heartbeat sent | RSSI:%d Batt:%u%% Imgs:%u\n",
                    WiFi.RSSI(), batt_pct, images_today);
    } else {
      Serial.printf("[HB] ❌ Failed (HTTP %d)\n", code);
      http.end();
      return false;
    }

    http.end();
    return true;
  }

  // Reset daily counters (called at midnight or by hub command)
  void resetDaily() {
    images_today = 0;
    detections_today = 0;
    upload_failures = 0;
  }

private:
  void _parseResponse(const char* json) {
    JsonDocument doc;
    DeserializationError err = deserializeJson(doc, json);
    if (err) return;

    // Hub can send a pending command
    if (doc.containsKey("cmd") && !doc["cmd"].isNull()) {
      lastCommand.has_command = true;
      strncpy(lastCommand.cmd, doc["cmd"].as<const char*>(), sizeof(lastCommand.cmd) - 1);
      if (doc.containsKey("value")) {
        strncpy(lastCommand.value, doc["value"].as<const char*>(), sizeof(lastCommand.value) - 1);
      } else {
        lastCommand.value[0] = '\0';
      }
      Serial.printf("[HB] 📩 Command from hub: %s = %s\n", lastCommand.cmd, lastCommand.value);
    }

    // Hub can update server time for clock sync
    if (doc.containsKey("server_time")) {
      // Could set RTC here if needed
    }
  }
};

#endif
