/**
 * ╔══════════════════════════════════════════════════════╗
 * ║  AgriVision ESP32-S3 Camera Node — Production v1.2  ║
 * ║  AI-Powered Agricultural Monitoring                  ║
 * ║  © 2026 PCTA S.A.                                   ║
 * ╚══════════════════════════════════════════════════════╝
 * 
 * BOOT SEQUENCE:
 *   1. Init serial, LED, config from NVS
 *   2. Check factory reset button (BOOT held >5s)
 *   3. Self-test: PSRAM, camera, SD, battery
 *   4. If post-OTA → run self-test → confirm or rollback
 *   5. If not provisioned → enter AP provisioning mode
 *   6. Connect to hub WiFi
 *   7. Send heartbeat → get pending commands
 *   8. Capture image at configured resolution
 *   9. Upload to hub HTTP endpoint
 *  10. If upload fails → buffer to SD card
 *  11. If SD has pending → sync batch to hub
 *  12. Execute any hub commands (interval, OTA, reboot)
 *  13. Deep sleep until next capture
 * 
 * POWER PROFILES:
 *   FULL (>80%)     → normal interval, full res, flash OK
 *   NORMAL (50-80%) → normal interval, full res
 *   SAVER (25-50%)  → 2× interval, reduced res
 *   CRITICAL (10-25%)→ 4× interval, VGA only
 *   SHUTDOWN (<10%) → deep sleep 1 hour
 */

#include <Arduino.h>
#include <esp_camera.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

#include "config.h"
#include "led_status.h"
#include "self_test.h"
#include "power_manager.h"
#include "ota_receiver.h"
#include "heartbeat.h"
#include "sd_buffer.h"
#include "auto_provision.h"

// ── Global instances ──
ConfigManager    configMgr;
LedStatus        led;
SelfTest         selfTest;
PowerManager     power;
OtaReceiver      ota;
HeartbeatReporter heartbeat;
SdBuffer         sdCard;
AutoProvisioner  provisioner;

// ── Timing ──
unsigned long lastCapture = 0;
unsigned long lastHeartbeat = 0;
const unsigned long HEARTBEAT_INTERVAL = 60000; // 60s
const unsigned long FACTORY_RESET_HOLD = 5000;  // 5s hold

// ── Forward declarations ──
bool connectWiFi(uint8_t timeout_sec = 20);
bool uploadImage(camera_fb_t* fb);
void initCamera(uint8_t resolution, uint8_t quality);
void handleHubCommand(HubCommand& cmd);
void checkFactoryReset();
framesize_t resolutionCode(uint8_t r);


// ════════════════════════════════════════════════════════
// SETUP — runs once on boot
// ════════════════════════════════════════════════════════
void setup() {
  Serial.begin(115200);
  delay(500);

  Serial.println("\n╔══════════════════════════════════════════╗");
  Serial.println("║  🌱 AgriVision Camera Node v" FW_VERSION "        ║");
  Serial.println("║  Built: " FW_BUILD_DATE "                      ║");
  Serial.println("╚══════════════════════════════════════════╝\n");

  // ── 1. Init LED + Config ──
  led.begin();
  led.setPattern(LED_BOOTING);
  configMgr.begin();

  Serial.printf("[BOOT] Serial: %s | MAC: %s | Boot #%u\n",
                configMgr.cfg.serial, configMgr.cfg.mac, configMgr.cfg.boot_count);
  Serial.printf("[BOOT] Wake reason: %s\n", power.wakeReason());

  // ── 2. Factory reset check ──
  checkFactoryReset();

  // ── 3. Power check ──
  power.begin();
  if (power.shouldSleep()) {
    led.setPattern(LED_LOW_BATTERY);
    delay(2000);
    power.shutdownLowBattery();
    return; // Won't reach here
  }

  // ── 4. Self-test ──
  led.setPattern(LED_SELF_TEST);
  bool allOk = selfTest.runAll();

  // ── 5. Post-OTA verification ──
  if (ota.isPostOta()) {
    Serial.println("[BOOT] Post-OTA boot detected");
    if (allOk) {
      ota.confirmFirmware();
      Serial.println("[BOOT] ✅ New firmware confirmed");
    } else {
      Serial.println("[BOOT] ❌ Self-test failed after OTA — rolling back!");
      led.setPattern(LED_ERROR);
      delay(3000);
      ota.rollback(); // Reboots to previous firmware
      return;
    }
  }

  // ── 6. Init SD card ──
  sdCard.begin();
  heartbeat.sd_available = sdCard.available;

  // ── 7. Provision check ──
  if (!configMgr.isProvisioned()) {
    Serial.println("[BOOT] ⚠️ Not provisioned — entering setup mode");
    led.setPattern(LED_PROVISION_MODE);
    provisioner.begin(configMgr);

    // Stay in provision loop until configured
    while (!configMgr.isProvisioned()) {
      provisioner.handle();
      provisioner.checkSerial(); // Also check serial for batch provisioning
      led.update();
      delay(10);
    }

    provisioner.stop();
    Serial.println("[BOOT] ✅ Provisioned! Rebooting into normal mode...");
    delay(500);
    ESP.restart();
    return;
  }

  // ── 8. Connect to hub WiFi ──
  led.setPattern(LED_WIFI_CONNECT);
  if (!connectWiFi()) {
    Serial.println("[BOOT] ❌ Cannot connect to hub WiFi");
    // Still proceed — will buffer images to SD
    led.setPattern(LED_ERROR);
    delay(2000);
  }

  // ── 9. Init camera at configured resolution ──
  uint8_t res = min(configMgr.cfg.resolution, power.maxResolution());
  initCamera(res, configMgr.cfg.jpeg_quality);

  // ── 10. Send initial heartbeat ──
  if (WiFi.status() == WL_CONNECTED) {
    heartbeat.send(configMgr.cfg.hub_ip, configMgr.cfg.hub_port,
                   configMgr.cfg.serial, configMgr.cfg.mac, configMgr.cfg.fw_version,
                   power.batteryMv(), power.batteryPercent(), power.profileName(),
                   configMgr.cfg.zone);
    if (heartbeat.lastCommand.has_command) {
      handleHubCommand(heartbeat.lastCommand);
    }
  }

  Serial.printf("[BOOT] ✅ Ready | Interval: %us | Res: %u | Profile: %s\n",
                power.adjustedInterval(configMgr.cfg.capture_sec),
                res, power.profileName());
}


// ════════════════════════════════════════════════════════
// LOOP — capture, upload, sleep, repeat
// ════════════════════════════════════════════════════════
void loop() {
  led.update();
  unsigned long now = millis();

  // ── Check serial for provision commands (debug) ──
  provisioner.checkSerial();

  // ── Heartbeat (every 60s) ──
  if (now - lastHeartbeat >= HEARTBEAT_INTERVAL && WiFi.status() == WL_CONNECTED) {
    heartbeat.sd_buffered = sdCard.buffered;
    heartbeat.send(configMgr.cfg.hub_ip, configMgr.cfg.hub_port,
                   configMgr.cfg.serial, configMgr.cfg.mac, configMgr.cfg.fw_version,
                   power.batteryMv(), power.batteryPercent(), power.profileName(),
                   configMgr.cfg.zone);
    lastHeartbeat = now;

    if (heartbeat.lastCommand.has_command) {
      handleHubCommand(heartbeat.lastCommand);
    }
  }

  // ── Capture cycle ──
  uint16_t interval = power.adjustedInterval(configMgr.cfg.capture_sec);
  if (interval == 0) {
    // SHUTDOWN profile — sleep
    power.shutdownLowBattery();
    return;
  }

  if (now - lastCapture >= (unsigned long)interval * 1000) {
    lastCapture = now;
    power.refresh(); // Re-read battery

    // Capture image
    led.flash(LED_CAPTURING, 1);
    camera_fb_t* fb = esp_camera_fb_get();
    if (!fb) {
      Serial.println("[CAM] ❌ Capture failed");
      heartbeat.upload_failures++;
      return;
    }

    Serial.printf("[CAM] 📸 Captured %u bytes (%ux%u)\n", fb->len, fb->width, fb->height);
    configMgr.incrementImages();
    heartbeat.images_today++;

    // Try upload to hub
    bool uploaded = false;
    if (WiFi.status() == WL_CONNECTED) {
      led.flash(LED_UPLOADING, 1);
      uploaded = uploadImage(fb);
    }

    // If upload failed → buffer to SD
    if (!uploaded) {
      if (sdCard.available) {
        led.flash(LED_SD_BUFFERING, 1);
        sdCard.saveImage(fb, configMgr.cfg.serial, power.batteryMv(), WiFi.RSSI());
      } else {
        Serial.println("[CAM] ⚠️ Upload failed and no SD card — image lost");
        heartbeat.upload_failures++;
      }
    }

    esp_camera_fb_return(fb);

    // Sync any SD-buffered images
    if (sdCard.hasPending() && WiFi.status() == WL_CONNECTED) {
      uint32_t synced = sdCard.syncToHub(configMgr.cfg.hub_ip, configMgr.cfg.hub_port,
                                          configMgr.cfg.serial);
      heartbeat.sd_buffered = sdCard.buffered;
    }

    // Deep sleep until next capture (if interval > 30s)
    if (interval > 30) {
      Serial.printf("[PWR] 💤 Deep sleep %us\n", interval - 5);
      delay(200);
      power.deepSleep(interval - 5); // Wake 5s early for boot overhead
      // Won't return — next cycle starts from setup()
    }
  }

  delay(100);
}


// ════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════

bool connectWiFi(uint8_t timeout_sec) {
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.begin(configMgr.cfg.hub_ssid, configMgr.cfg.hub_pass);

  Serial.printf("[WiFi] Connecting to '%s'", configMgr.cfg.hub_ssid);
  uint32_t start = millis();
  while (WiFi.status() != WL_CONNECTED) {
    if (millis() - start > timeout_sec * 1000) {
      Serial.println(" TIMEOUT");
      return false;
    }
    Serial.print(".");
    delay(500);
  }
  Serial.printf(" OK | IP: %s | RSSI: %d\n",
                WiFi.localIP().toString().c_str(), WiFi.RSSI());
  return true;
}

bool uploadImage(camera_fb_t* fb) {
  char url[128];
  snprintf(url, sizeof(url), "http://%s:%d/api/upload",
           configMgr.cfg.hub_ip, configMgr.cfg.hub_port);

  HTTPClient http;
  http.begin(url);
  http.addHeader("Content-Type", "image/jpeg");
  http.addHeader("X-Node-Serial", configMgr.cfg.serial);
  http.addHeader("X-Node-MAC", configMgr.cfg.mac);
  http.addHeader("X-Battery-MV", String(power.batteryMv()));
  http.addHeader("X-Battery-PCT", String(power.batteryPercent()));
  http.addHeader("X-RSSI", String(WiFi.RSSI()));
  http.addHeader("X-Zone", configMgr.cfg.zone);
  http.addHeader("X-Firmware", configMgr.cfg.fw_version);
  http.addHeader("X-Boot-Count", String(configMgr.cfg.boot_count));
  http.setTimeout(15000);

  int code = http.POST(fb->buf, fb->len);
  bool ok = (code == 200);

  if (ok) {
    // Parse response for detection result
    String resp = http.getString();
    JsonDocument doc;
    if (deserializeJson(doc, resp) == DeserializationError::Ok) {
      if (doc.containsKey("detection") && doc["detection"].as<bool>()) {
        configMgr.incrementDetections();
        heartbeat.detections_today++;
        Serial.printf("[HUB] 🔬 Detection: %s (%d%%)\n",
                      doc["disease"].as<const char*>(),
                      (int)(doc["confidence"].as<float>() * 100));
      }
    }
    Serial.printf("[HUB] ✅ Upload OK (%d bytes)\n", fb->len);
  } else {
    Serial.printf("[HUB] ❌ Upload failed (HTTP %d)\n", code);
    heartbeat.upload_failures++;
  }

  http.end();
  return ok;
}

void initCamera(uint8_t resolution, uint8_t quality) {
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
  cam_cfg.frame_size   = resolutionCode(resolution);
  cam_cfg.jpeg_quality = quality;
  cam_cfg.fb_count     = 2;
  cam_cfg.fb_location  = CAMERA_FB_IN_PSRAM;
  cam_cfg.grab_mode    = CAMERA_GRAB_LATEST;

  esp_err_t err = esp_camera_init(&cam_cfg);
  if (err != ESP_OK) {
    Serial.printf("[CAM] ❌ Init failed (0x%x)\n", err);
    led.setPattern(LED_ERROR);
  } else {
    // Configure sensor
    sensor_t* s = esp_camera_sensor_get();
    if (s) {
      s->set_brightness(s, 1);
      s->set_saturation(s, 1);
      s->set_whitebal(s, 1);
      s->set_awb_gain(s, 1);
      s->set_exposure_ctrl(s, 1);
      s->set_aec2(s, 1);
      s->set_gain_ctrl(s, 1);
    }
    Serial.printf("[CAM] ✅ Camera ready | Res: %u | Quality: %u\n", resolution, quality);
  }
}

framesize_t resolutionCode(uint8_t r) {
  switch (r) {
    case 0: return FRAMESIZE_UXGA;   // 1600x1200
    case 1: return FRAMESIZE_SXGA;   // 1280x1024
    case 2: return FRAMESIZE_XGA;    // 1024x768
    case 3: return FRAMESIZE_SVGA;   // 800x600
    case 4: return FRAMESIZE_VGA;    // 640x480
    default: return FRAMESIZE_UXGA;
  }
}

void handleHubCommand(HubCommand& cmd) {
  Serial.printf("[CMD] Processing: %s = %s\n", cmd.cmd, cmd.value);

  if (strcmp(cmd.cmd, "set_interval") == 0) {
    uint16_t sec = atoi(cmd.value);
    if (sec >= 30 && sec <= 7200) {
      configMgr.setCaptureInterval(sec);
      Serial.printf("[CMD] ✅ Interval → %us\n", sec);
    }
  }
  else if (strcmp(cmd.cmd, "ota") == 0) {
    led.setPattern(LED_OTA_UPDATE);
    if (ota.applyUpdate(cmd.value)) {
      Serial.println("[CMD] ✅ OTA done — rebooting");
      delay(500);
      ESP.restart();
    } else {
      led.setPattern(LED_ERROR);
      Serial.println("[CMD] ❌ OTA failed");
    }
  }
  else if (strcmp(cmd.cmd, "reboot") == 0) {
    Serial.println("[CMD] Rebooting...");
    delay(200);
    ESP.restart();
  }
  else if (strcmp(cmd.cmd, "set_flash") == 0) {
    configMgr.setFlash(strcmp(cmd.value, "true") == 0 || strcmp(cmd.value, "1") == 0);
  }
  else if (strcmp(cmd.cmd, "set_zone") == 0) {
    configMgr.setZone(cmd.value);
  }
  else if (strcmp(cmd.cmd, "set_resolution") == 0) {
    configMgr.setResolution(atoi(cmd.value));
  }
  else if (strcmp(cmd.cmd, "factory_reset") == 0) {
    led.setPattern(LED_FACTORY_RESET);
    delay(3000);
    configMgr.factoryReset();
  }
  else if (strcmp(cmd.cmd, "sync_sd") == 0) {
    if (sdCard.hasPending()) {
      sdCard.syncToHub(configMgr.cfg.hub_ip, configMgr.cfg.hub_port, configMgr.cfg.serial);
    }
  }

  cmd.has_command = false;
}

void checkFactoryReset() {
  pinMode(RESET_BTN_PIN, INPUT_PULLUP);
  if (digitalRead(RESET_BTN_PIN) == LOW) {
    Serial.println("[BOOT] BOOT button held — checking for factory reset...");
    led.setPattern(LED_FACTORY_RESET);
    uint32_t start = millis();
    while (digitalRead(RESET_BTN_PIN) == LOW) {
      led.update();
      if (millis() - start > FACTORY_RESET_HOLD) {
        Serial.println("[BOOT] *** FACTORY RESET TRIGGERED ***");
        configMgr.factoryReset(); // Reboots
        return;
      }
      delay(50);
    }
    Serial.println("[BOOT] Button released — normal boot");
  }
}
