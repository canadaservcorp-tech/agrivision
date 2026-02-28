/*
 * AgriVision ESP32-S3 Camera Node Firmware v3.0
 * =============================================
 * Hardware: ESP32-S3-CAM + OV5640 (5MP Autofocus)
 * Purpose: Capture images at intervals, send to Central Hub via WiFi
 * Power: 18650 3.7V LiFePO4 + TP4056 solar charger + 5V 2W panel
 * 
 * Protocol: HTTP POST to hub's local IP
 * Deep sleep between captures to maximize battery life
 * 
 * © 2026 Performance Cristal Technologies Avancées S.A.
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <esp_camera.h>
#include <esp_sleep.h>
#include <esp_timer.h>
#include <driver/adc.h>
#include <EEPROM.h>
#include <ArduinoJson.h>

// ============================================================
// CONFIGURATION — Stored in EEPROM, updatable via hub
// ============================================================

// Camera Node Identity
#define NODE_SERIAL       "CAM-001"       // Unique per node — flashed during provisioning
#define FIRMWARE_VERSION  "3.0.0"

// WiFi — Hub creates its own AP or uses farm WiFi
#define WIFI_SSID         "AgriVision-HUB"
#define WIFI_PASSWORD     "agri2026secure"
#define WIFI_TIMEOUT_MS   15000

// Hub Communication
#define HUB_IP            "192.168.4.1"   // Hub AP default gateway
#define HUB_PORT          8080
#define HUB_ENDPOINT      "/api/image"

// Capture Settings
#define CAPTURE_INTERVAL_MIN  15          // Minutes between captures
#define IMAGE_QUALITY         10          // JPEG quality 0-63 (lower = better quality)
#define FRAME_SIZE            FRAMESIZE_QSXGA  // 2560x1920 (5MP)
#define RETRY_COUNT           3
#define RETRY_DELAY_MS        2000

// Battery Monitoring
#define BATTERY_PIN           1           // ADC1 channel for voltage divider
#define BATTERY_LOW_THRESHOLD 3.2         // Volts — skip capture if below
#define BATTERY_CRITICAL      3.0         // Volts — emergency deep sleep

// LED Indicators
#define LED_STATUS            2           // Onboard LED
#define LED_FLASH             4           // Camera flash LED (optional)

// ============================================================
// ESP32-S3-CAM Pin Definitions (OV5640)
// ============================================================

#define PWDN_GPIO     -1
#define RESET_GPIO    -1
#define XCLK_GPIO     15
#define SIOD_GPIO     4
#define SIOC_GPIO     5
#define Y9_GPIO       16
#define Y8_GPIO       17
#define Y7_GPIO       18
#define Y6_GPIO       12
#define Y5_GPIO       10
#define Y4_GPIO       8
#define Y3_GPIO       9
#define Y2_GPIO       11
#define VSYNC_GPIO    6
#define HREF_GPIO     7
#define PCLK_GPIO     13

// ============================================================
// GLOBALS
// ============================================================

RTC_DATA_ATTR int bootCount = 0;          // Survives deep sleep
RTC_DATA_ATTR int failedUploads = 0;      // Track consecutive failures
RTC_DATA_ATTR int totalCaptures = 0;      // Today's capture count

struct NodeConfig {
  uint16_t captureIntervalMin;
  uint8_t  imageQuality;
  uint8_t  frameSize;
  char     hubIP[16];
  uint16_t hubPort;
  bool     flashEnabled;
  bool     autoFocusEnabled;
};

NodeConfig config;

// ============================================================
// SETUP
// ============================================================

void setup() {
  Serial.begin(115200);
  bootCount++;
  
  Serial.println("\n========================================");
  Serial.printf("AgriVision Camera Node %s\n", NODE_SERIAL);
  Serial.printf("Firmware: v%s | Boot #%d\n", FIRMWARE_VERSION, bootCount);
  Serial.println("========================================");

  // Initialize LED
  pinMode(LED_STATUS, OUTPUT);
  blinkLED(2, 100);  // Quick blink = awake

  // Load config from EEPROM
  loadConfig();

  // Check battery first
  float voltage = readBatteryVoltage();
  Serial.printf("Battery: %.2fV\n", voltage);
  
  if (voltage < BATTERY_CRITICAL) {
    Serial.println("⚠️ CRITICAL battery — emergency sleep");
    blinkLED(5, 50);  // Fast blink = critical
    enterDeepSleep(60);  // Sleep 60 min, hope solar charges
    return;
  }
  
  if (voltage < BATTERY_LOW_THRESHOLD) {
    Serial.println("⚠️ Low battery — skipping capture");
    blinkLED(3, 200);  // Slow blink = low battery
    enterDeepSleep(config.captureIntervalMin * 2);  // Double sleep interval
    return;
  }

  // Initialize camera
  if (!initCamera()) {
    Serial.println("❌ Camera init failed!");
    blinkLED(10, 100);  // Error pattern
    enterDeepSleep(5);  // Retry in 5 min
    return;
  }
  Serial.println("✅ Camera initialized");

  // Connect to WiFi (hub AP)
  if (!connectWiFi()) {
    Serial.println("❌ WiFi connection failed");
    // Still capture and store locally if possible
    captureAndBuffer();
    enterDeepSleep(config.captureIntervalMin);
    return;
  }
  Serial.printf("✅ WiFi connected — IP: %s\n", WiFi.localIP().toString().c_str());

  // Capture image
  camera_fb_t* fb = captureImage();
  if (!fb) {
    Serial.println("❌ Image capture failed");
    enterDeepSleep(config.captureIntervalMin);
    return;
  }
  Serial.printf("✅ Image captured: %d bytes (%dx%d)\n", fb->len, fb->width, fb->height);
  totalCaptures++;

  // Upload to hub
  bool uploaded = uploadImage(fb);
  if (uploaded) {
    Serial.println("✅ Image uploaded to hub");
    failedUploads = 0;
    blinkLED(1, 500);  // Long blink = success
  } else {
    Serial.println("❌ Upload failed");
    failedUploads++;
    blinkLED(4, 150);  // Error blink
  }

  // Check for config updates from hub
  checkConfigUpdate();

  // Release frame buffer
  esp_camera_fb_return(fb);

  // Disconnect WiFi to save power
  WiFi.disconnect(true);
  WiFi.mode(WIFI_OFF);

  // Enter deep sleep
  Serial.printf("💤 Sleeping %d minutes...\n", config.captureIntervalMin);
  enterDeepSleep(config.captureIntervalMin);
}

void loop() {
  // Never reached — device deep sleeps after setup()
}

// ============================================================
// CAMERA INITIALIZATION
// ============================================================

bool initCamera() {
  camera_config_t cam_config;
  cam_config.ledc_channel = LEDC_CHANNEL_0;
  cam_config.ledc_timer   = LEDC_TIMER_0;
  cam_config.pin_d0       = Y2_GPIO;
  cam_config.pin_d1       = Y3_GPIO;
  cam_config.pin_d2       = Y4_GPIO;
  cam_config.pin_d3       = Y5_GPIO;
  cam_config.pin_d4       = Y6_GPIO;
  cam_config.pin_d5       = Y7_GPIO;
  cam_config.pin_d6       = Y8_GPIO;
  cam_config.pin_d7       = Y9_GPIO;
  cam_config.pin_xclk     = XCLK_GPIO;
  cam_config.pin_pclk     = PCLK_GPIO;
  cam_config.pin_vsync    = VSYNC_GPIO;
  cam_config.pin_href     = HREF_GPIO;
  cam_config.pin_sccb_sda = SIOD_GPIO;
  cam_config.pin_sccb_scl = SIOC_GPIO;
  cam_config.pin_pwdn     = PWDN_GPIO;
  cam_config.pin_reset    = RESET_GPIO;
  cam_config.xclk_freq_hz = 20000000;
  cam_config.pixel_format = PIXFORMAT_JPEG;
  
  // Use PSRAM for high resolution
  if (psramFound()) {
    cam_config.frame_size   = (framesize_t)config.frameSize;
    cam_config.jpeg_quality = config.imageQuality;
    cam_config.fb_count     = 2;
    cam_config.fb_location  = CAMERA_FB_IN_PSRAM;
    cam_config.grab_mode    = CAMERA_GRAB_LATEST;
    Serial.println("PSRAM found — using high resolution");
  } else {
    cam_config.frame_size   = FRAMESIZE_VGA;
    cam_config.jpeg_quality = 15;
    cam_config.fb_count     = 1;
    Serial.println("No PSRAM — using VGA");
  }

  esp_err_t err = esp_camera_init(&cam_config);
  if (err != ESP_OK) {
    Serial.printf("Camera init error: 0x%x\n", err);
    return false;
  }

  // Sensor settings for outdoor agriculture
  sensor_t* s = esp_camera_sensor_get();
  if (s) {
    s->set_brightness(s, 0);      // -2 to 2
    s->set_contrast(s, 1);        // Slightly higher for plant detail
    s->set_saturation(s, 1);      // Vivid colors for disease detection
    s->set_whitebal(s, 1);        // Auto white balance
    s->set_awb_gain(s, 1);        // AWB gain
    s->set_wb_mode(s, 0);         // Auto
    s->set_exposure_ctrl(s, 1);   // Auto exposure
    s->set_aec2(s, 1);            // Auto exposure (DSP)
    s->set_gain_ctrl(s, 1);       // Auto gain
    s->set_agc_gain(s, 0);        // 0-30
    s->set_gainceiling(s, (gainceiling_t)6);
    s->set_bpc(s, 1);             // Bad pixel correction
    s->set_wpc(s, 1);             // White pixel correction
    s->set_lenc(s, 1);            // Lens correction
    
    // Enable autofocus for OV5640
    if (config.autoFocusEnabled) {
      // OV5640 autofocus trigger
      s->set_reg(s, 0x3022, 0xFF, 0x03);  // Trigger single AF
      delay(300);  // Wait for focus
    }
  }

  // Warm up — discard first 3 frames
  for (int i = 0; i < 3; i++) {
    camera_fb_t* fb = esp_camera_fb_get();
    if (fb) esp_camera_fb_return(fb);
    delay(100);
  }

  return true;
}

// ============================================================
// IMAGE CAPTURE
// ============================================================

camera_fb_t* captureImage() {
  // Flash for low-light if enabled
  if (config.flashEnabled) {
    pinMode(LED_FLASH, OUTPUT);
    digitalWrite(LED_FLASH, HIGH);
    delay(150);  // Brief flash exposure
  }

  camera_fb_t* fb = esp_camera_fb_get();

  if (config.flashEnabled) {
    digitalWrite(LED_FLASH, LOW);
  }

  return fb;
}

void captureAndBuffer() {
  // Future: save to SPIFFS/SD card for later upload
  Serial.println("Buffering not implemented yet — frame dropped");
}

// ============================================================
// WIFI CONNECTION
// ============================================================

bool connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED) {
    if (millis() - start > WIFI_TIMEOUT_MS) {
      return false;
    }
    delay(250);
    Serial.print(".");
  }
  Serial.println();
  return true;
}

// ============================================================
// IMAGE UPLOAD TO HUB
// ============================================================

bool uploadImage(camera_fb_t* fb) {
  if (!fb || fb->len == 0) return false;

  for (int attempt = 0; attempt < RETRY_COUNT; attempt++) {
    HTTPClient http;
    
    String url = String("http://") + config.hubIP + ":" + config.hubPort + HUB_ENDPOINT;
    http.begin(url);
    http.addHeader("Content-Type", "image/jpeg");
    http.addHeader("X-Node-Serial", NODE_SERIAL);
    http.addHeader("X-Firmware", FIRMWARE_VERSION);
    http.addHeader("X-Battery", String(readBatteryVoltage(), 2));
    http.addHeader("X-Boot-Count", String(bootCount));
    http.addHeader("X-Captures-Today", String(totalCaptures));
    http.addHeader("X-WiFi-RSSI", String(WiFi.RSSI()));
    http.setTimeout(15000);

    int httpCode = http.POST(fb->buf, fb->len);
    
    if (httpCode == 200 || httpCode == 201) {
      // Parse response for any commands from hub
      String response = http.getString();
      parseHubResponse(response);
      http.end();
      return true;
    }
    
    Serial.printf("Upload attempt %d failed: HTTP %d\n", attempt + 1, httpCode);
    http.end();
    
    if (attempt < RETRY_COUNT - 1) {
      delay(RETRY_DELAY_MS);
    }
  }
  
  return false;
}

void parseHubResponse(String& response) {
  // Hub can send commands back in the response
  StaticJsonDocument<512> doc;
  DeserializationError error = deserializeJson(doc, response);
  
  if (error) return;
  
  // Check for config updates
  if (doc.containsKey("update_interval")) {
    config.captureIntervalMin = doc["update_interval"].as<uint16_t>();
    Serial.printf("Hub updated interval to %d min\n", config.captureIntervalMin);
    saveConfig();
  }
  
  if (doc.containsKey("flash_enabled")) {
    config.flashEnabled = doc["flash_enabled"].as<bool>();
    saveConfig();
  }
  
  if (doc.containsKey("reboot")) {
    Serial.println("Hub requested reboot");
    ESP.restart();
  }
}

// ============================================================
// CONFIG UPDATE FROM HUB
// ============================================================

void checkConfigUpdate() {
  HTTPClient http;
  String url = String("http://") + config.hubIP + ":" + config.hubPort + "/api/node-config?serial=" + NODE_SERIAL;
  http.begin(url);
  http.setTimeout(5000);
  
  int httpCode = http.GET();
  if (httpCode == 200) {
    String response = http.getString();
    parseHubResponse(response);
  }
  http.end();
}

// ============================================================
// BATTERY MONITORING
// ============================================================

float readBatteryVoltage() {
  // Voltage divider: R1=100k, R2=100k → ADC reads half voltage
  // 18650 range: 3.0V (empty) to 4.2V (full)
  
  adc1_config_width(ADC_WIDTH_BIT_12);
  adc1_config_channel_atten(ADC1_CHANNEL_0, ADC_ATTEN_DB_11);
  
  // Average 10 readings for stability
  uint32_t sum = 0;
  for (int i = 0; i < 10; i++) {
    sum += adc1_get_raw(ADC1_CHANNEL_0);
    delay(5);
  }
  float raw = sum / 10.0;
  
  // Convert to voltage (3.3V reference, 12-bit, voltage divider x2)
  float voltage = (raw / 4095.0) * 3.3 * 2.0;
  
  // Calibration offset (adjust per unit)
  voltage += 0.1;
  
  return voltage;
}

int batteryPercent(float voltage) {
  // LiFePO4 discharge curve approximation
  if (voltage >= 4.2) return 100;
  if (voltage >= 4.0) return 80 + (voltage - 4.0) * 100;
  if (voltage >= 3.7) return 30 + (voltage - 3.7) * 166;
  if (voltage >= 3.4) return 10 + (voltage - 3.4) * 66;
  if (voltage >= 3.2) return (voltage - 3.2) * 50;
  return 0;
}

// ============================================================
// DEEP SLEEP
// ============================================================

void enterDeepSleep(uint16_t minutes) {
  uint64_t sleepTime = (uint64_t)minutes * 60 * 1000000;
  
  // Disable peripherals
  esp_camera_deinit();
  WiFi.disconnect(true);
  WiFi.mode(WIFI_OFF);
  
  // Configure wake source — timer
  esp_sleep_enable_timer_wakeup(sleepTime);
  
  Serial.printf("💤 Deep sleep for %d min\n", minutes);
  Serial.flush();
  
  esp_deep_sleep_start();
}

// ============================================================
// CONFIG PERSISTENCE (EEPROM)
// ============================================================

void loadConfig() {
  EEPROM.begin(128);
  
  uint8_t magic = EEPROM.read(0);
  if (magic == 0xAG) {  // Config exists
    EEPROM.get(1, config);
    Serial.println("Config loaded from EEPROM");
  } else {
    // Default config
    config.captureIntervalMin = CAPTURE_INTERVAL_MIN;
    config.imageQuality = IMAGE_QUALITY;
    config.frameSize = FRAMESIZE_QSXGA;
    strncpy(config.hubIP, HUB_IP, 15);
    config.hubPort = HUB_PORT;
    config.flashEnabled = false;
    config.autoFocusEnabled = true;
    saveConfig();
    Serial.println("Default config written");
  }
}

void saveConfig() {
  EEPROM.begin(128);
  EEPROM.write(0, 0xAG);
  EEPROM.put(1, config);
  EEPROM.commit();
}

// ============================================================
// UTILITY
// ============================================================

void blinkLED(int times, int delayMs) {
  for (int i = 0; i < times; i++) {
    digitalWrite(LED_STATUS, HIGH);
    delay(delayMs);
    digitalWrite(LED_STATUS, LOW);
    delay(delayMs);
  }
}
