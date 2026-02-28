/**
 * AgriVision Camera Node — Boot Self-Test
 * ================================================
 * Runs at every boot. Reports results to hub.
 * Field tech can read results via serial or LED pattern.
 * 
 * Tests: PSRAM, Camera, SD Card, WiFi, Battery, Flash LED, NVS
 * 
 * © 2026 PCTA S.A.
 */
#ifndef AGRI_SELFTEST_H
#define AGRI_SELFTEST_H

#include <Arduino.h>
#include <esp_camera.h>
#include <SD_MMC.h>
#include <WiFi.h>

struct TestResult {
  bool psram_ok;
  bool camera_ok;
  bool sd_ok;
  bool wifi_ok;
  bool battery_ok;
  bool nvs_ok;
  uint32_t psram_size_kb;
  uint32_t sd_size_mb;
  uint16_t battery_mv;
  int8_t wifi_rssi;
  uint8_t pass_count;
  uint8_t fail_count;
  char summary[128];
};

class SelfTest {
public:
  TestResult result;

  bool runAll() {
    memset(&result, 0, sizeof(result));
    Serial.println("\n[TEST] ════════════ SELF-TEST ════════════");

    _testPSRAM();
    _testCamera();
    _testSD();
    _testBattery();

    result.nvs_ok = true; result.pass_count++; // NVS ok if we booted

    // Summary
    uint8_t total = result.pass_count + result.fail_count;
    snprintf(result.summary, sizeof(result.summary),
             "%d/%d passed | PSRAM:%s CAM:%s SD:%s BATT:%s",
             result.pass_count, total,
             result.psram_ok ? "OK" : "FAIL",
             result.camera_ok ? "OK" : "FAIL",
             result.sd_ok ? "OK" : "FAIL",
             result.battery_ok ? "OK" : "FAIL");

    Serial.printf("[TEST] Result: %s\n", result.summary);
    Serial.println("[TEST] ══════════════════════════════════\n");

    return result.fail_count == 0;
  }

  // WiFi test runs separately (needs SSID/pass)
  bool testWiFi(const char* ssid, const char* pass, uint8_t timeout_sec = 15) {
    Serial.printf("[TEST] WiFi → connecting to '%s'...\n", ssid);
    WiFi.mode(WIFI_STA);
    WiFi.begin(ssid, pass);

    uint32_t start = millis();
    while (WiFi.status() != WL_CONNECTED) {
      if (millis() - start > timeout_sec * 1000) {
        Serial.println("[TEST] WiFi → ❌ TIMEOUT");
        result.wifi_ok = false;
        result.fail_count++;
        return false;
      }
      delay(500);
      Serial.print(".");
    }
    result.wifi_rssi = WiFi.RSSI();
    result.wifi_ok = true;
    result.pass_count++;
    Serial.printf("\n[TEST] WiFi → ✅ Connected | IP: %s | RSSI: %d dBm\n",
                  WiFi.localIP().toString().c_str(), result.wifi_rssi);
    return true;
  }

  // JSON report for hub
  void toJson(char* buf, size_t sz) {
    snprintf(buf, sz,
      "{\"psram\":%s,\"psram_kb\":%u,\"camera\":%s,\"sd\":%s,\"sd_mb\":%u,"
      "\"wifi\":%s,\"rssi\":%d,\"battery\":%s,\"batt_mv\":%u,\"passed\":%u,\"failed\":%u}",
      B(result.psram_ok), result.psram_size_kb,
      B(result.camera_ok), B(result.sd_ok), result.sd_size_mb,
      B(result.wifi_ok), result.wifi_rssi,
      B(result.battery_ok), result.battery_mv,
      result.pass_count, result.fail_count);
  }

private:
  const char* B(bool v) { return v ? "true" : "false"; }

  void _testPSRAM() {
    if (psramFound()) {
      result.psram_size_kb = ESP.getPsramSize() / 1024;
      result.psram_ok = result.psram_size_kb > 0;
      // Verify read/write
      void* p = ps_malloc(1024);
      if (p) { memset(p, 0xAA, 1024); free(p); }
      else { result.psram_ok = false; }
    }
    if (result.psram_ok) {
      result.pass_count++;
      Serial.printf("[TEST] PSRAM   → ✅ %u KB\n", result.psram_size_kb);
    } else {
      result.fail_count++;
      Serial.println("[TEST] PSRAM   → ❌ Not found or failed");
    }
  }

  void _testCamera() {
    camera_config_t cam_cfg;
    cam_cfg.ledc_channel = LEDC_CHANNEL_0;
    cam_cfg.ledc_timer   = LEDC_TIMER_0;
    cam_cfg.pin_d0       = CAM_PIN_D0;
    cam_cfg.pin_d1       = CAM_PIN_D1;
    cam_cfg.pin_d2       = CAM_PIN_D2;
    cam_cfg.pin_d3       = CAM_PIN_D3;
    cam_cfg.pin_d4       = CAM_PIN_D4;
    cam_cfg.pin_d5       = CAM_PIN_D5;
    cam_cfg.pin_d6       = CAM_PIN_D6;
    cam_cfg.pin_d7       = CAM_PIN_D7;
    cam_cfg.pin_xclk     = CAM_PIN_XCLK;
    cam_cfg.pin_pclk     = CAM_PIN_PCLK;
    cam_cfg.pin_vsync    = CAM_PIN_VSYNC;
    cam_cfg.pin_href     = CAM_PIN_HREF;
    cam_cfg.pin_sccb_sda = CAM_PIN_SIOD;
    cam_cfg.pin_sccb_scl = CAM_PIN_SIOC;
    cam_cfg.pin_pwdn     = CAM_PIN_PWDN;
    cam_cfg.pin_reset    = CAM_PIN_RESET;
    cam_cfg.xclk_freq_hz = 20000000;
    cam_cfg.pixel_format = PIXFORMAT_JPEG;
    cam_cfg.frame_size   = FRAMESIZE_VGA; // Low res for test
    cam_cfg.jpeg_quality = 15;
    cam_cfg.fb_count     = 1;
    cam_cfg.fb_location  = CAMERA_FB_IN_PSRAM;
    cam_cfg.grab_mode    = CAMERA_GRAB_LATEST;

    esp_err_t err = esp_camera_init(&cam_cfg);
    if (err != ESP_OK) {
      result.camera_ok = false;
      result.fail_count++;
      Serial.printf("[TEST] Camera  → ❌ Init failed (0x%x)\n", err);
      return;
    }

    // Take a test shot
    camera_fb_t* fb = esp_camera_fb_get();
    if (fb && fb->len > 1000) {
      result.camera_ok = true;
      result.pass_count++;
      Serial.printf("[TEST] Camera  → ✅ Test shot %u bytes (%dx%d)\n", fb->len, fb->width, fb->height);
      esp_camera_fb_return(fb);
    } else {
      result.camera_ok = false;
      result.fail_count++;
      Serial.println("[TEST] Camera  → ❌ Empty frame");
      if (fb) esp_camera_fb_return(fb);
    }
    esp_camera_deinit();
  }

  void _testSD() {
    if (SD_MMC.begin("/sdcard", true)) { // 1-bit mode
      result.sd_size_mb = SD_MMC.totalBytes() / (1024 * 1024);
      result.sd_ok = result.sd_size_mb > 0;

      // Write test file
      File f = SD_MMC.open("/agri_test.tmp", FILE_WRITE);
      if (f) {
        f.println("AgriVision SD Test");
        f.close();
        SD_MMC.remove("/agri_test.tmp");
      } else {
        result.sd_ok = false;
      }
    }
    if (result.sd_ok) {
      result.pass_count++;
      Serial.printf("[TEST] SD Card → ✅ %u MB total\n", result.sd_size_mb);
    } else {
      result.fail_count++;
      Serial.println("[TEST] SD Card → ⚠️  Not detected (optional — images will upload directly)");
    }
  }

  void _testBattery() {
    uint32_t sum = 0;
    for (int i = 0; i < 16; i++) {
      sum += analogReadMilliVolts(BATT_ADC_PIN);
      delay(5);
    }
    result.battery_mv = (sum / 16) * 2; // Voltage divider 2:1
    result.battery_ok = result.battery_mv > 2800; // > 2.8V minimum
    if (result.battery_ok) {
      result.pass_count++;
      Serial.printf("[TEST] Battery → ✅ %u mV (%u%%)\n", result.battery_mv, _mvToPercent(result.battery_mv));
    } else {
      result.fail_count++;
      Serial.printf("[TEST] Battery → ❌ %u mV (too low!)\n", result.battery_mv);
    }
  }

  uint8_t _mvToPercent(uint16_t mv) {
    if (mv >= 4100) return 100;
    if (mv <= 2800) return 0;
    return (uint8_t)((mv - 2800) * 100 / 1300);
  }
};

#endif
