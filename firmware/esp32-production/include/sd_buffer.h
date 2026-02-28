/**
 * AgriVision Camera Node — SD Offline Buffer
 * ================================================
 * When hub WiFi is down or upload fails:
 *   1. Saves image + metadata to SD card
 *   2. When connection restored, syncs in batches
 *   3. Manages disk space (FIFO deletion when full)
 *
 * Directory structure:
 *   /buffer/IMG_20260228_143022_CAM001.jpg    ← pending upload
 *   /buffer/IMG_20260228_143022_CAM001.json   ← metadata
 *   /synced/IMG_20260228_143022_CAM001.jpg    ← uploaded (cleanup after 50)
 *
 * © 2026 PCTA S.A.
 */
#ifndef AGRI_SD_BUFFER_H
#define AGRI_SD_BUFFER_H

#include <Arduino.h>
#include <SD_MMC.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <esp_camera.h>

#define SD_MAX_FILES     500
#define SD_MAX_MB        2048   // 2GB
#define SD_BATCH_SIZE    5
#define SD_BATCH_DELAY   500    // ms between uploads
#define SD_KEEP_SYNCED   50     // Keep last 50 synced files

class SdBuffer {
public:
  bool available = false;
  uint32_t buffered = 0;
  uint32_t synced_total = 0;
  uint32_t sync_failures = 0;

  bool begin() {
    if (!SD_MMC.begin("/sdcard", true)) { // 1-bit mode
      Serial.println("[SD] ⚠️ SD card not detected");
      available = false;
      return false;
    }

    available = true;

    // Create directories
    if (!SD_MMC.exists("/buffer")) SD_MMC.mkdir("/buffer");
    if (!SD_MMC.exists("/synced")) SD_MMC.mkdir("/synced");

    // Count existing buffered files
    buffered = _countFiles("/buffer", ".jpg");
    Serial.printf("[SD] ✅ Ready | %u MB total | %u MB used | %u buffered\n",
                  (uint32_t)(SD_MMC.totalBytes() / 1048576),
                  (uint32_t)(SD_MMC.usedBytes() / 1048576),
                  buffered);
    return true;
  }

  /**
   * Save image to SD when upload fails.
   */
  bool saveImage(camera_fb_t* fb, const char* serial, uint16_t batt_mv, int8_t rssi) {
    if (!available) return false;

    // Check disk space
    if (buffered >= SD_MAX_FILES || SD_MMC.usedBytes() > (uint64_t)SD_MAX_MB * 1048576) {
      _deleteOldest("/buffer");
    }

    // Generate filename from timestamp
    char ts[20];
    unsigned long ms = millis();
    snprintf(ts, sizeof(ts), "%010lu", ms);

    char imgPath[64], jsonPath[64];
    snprintf(imgPath, sizeof(imgPath), "/buffer/IMG_%s_%s.jpg", ts, serial);
    snprintf(jsonPath, sizeof(jsonPath), "/buffer/IMG_%s_%s.json", ts, serial);

    // Save image
    File img = SD_MMC.open(imgPath, FILE_WRITE);
    if (!img) {
      Serial.println("[SD] ❌ Cannot write image");
      return false;
    }
    img.write(fb->buf, fb->len);
    img.close();

    // Save metadata
    JsonDocument meta;
    meta["serial"] = serial;
    meta["timestamp"] = ts;
    meta["battery_mv"] = batt_mv;
    meta["rssi"] = rssi;
    meta["size"] = fb->len;
    meta["width"] = fb->width;
    meta["height"] = fb->height;

    File json = SD_MMC.open(jsonPath, FILE_WRITE);
    if (json) {
      serializeJson(meta, json);
      json.close();
    }

    buffered++;
    Serial.printf("[SD] 💾 Saved %s (%u bytes) | Buffered: %u\n", imgPath, fb->len, buffered);
    return true;
  }

  /**
   * Sync buffered images to hub in batches.
   * Returns number of images successfully synced.
   */
  uint32_t syncToHub(const char* hub_ip, uint16_t hub_port, const char* serial) {
    if (!available || buffered == 0) return 0;

    char url[128];
    snprintf(url, sizeof(url), "http://%s:%d/api/upload", hub_ip, hub_port);

    uint32_t synced = 0;
    File root = SD_MMC.open("/buffer");
    if (!root) return 0;

    File file;
    while ((file = root.openNextFile()) && synced < SD_BATCH_SIZE) {
      String name = file.name();
      if (!name.endsWith(".jpg")) { file.close(); continue; }

      // Read image
      size_t sz = file.size();
      uint8_t* buf = (uint8_t*)ps_malloc(sz);
      if (!buf) { file.close(); continue; }
      file.read(buf, sz);
      file.close();

      // Upload to hub
      HTTPClient http;
      http.begin(url);
      http.addHeader("Content-Type", "image/jpeg");
      http.addHeader("X-Node-Serial", serial);
      http.addHeader("X-SD-Buffered", "true");
      http.setTimeout(15000);

      int code = http.POST(buf, sz);
      free(buf);

      if (code == 200) {
        // Move to synced
        String srcPath = String("/buffer/") + name;
        String dstPath = String("/synced/") + name;
        SD_MMC.rename(srcPath.c_str(), dstPath.c_str());

        // Also move metadata json
        String jsonSrc = srcPath;
        jsonSrc.replace(".jpg", ".json");
        SD_MMC.remove(jsonSrc.c_str());

        synced++;
        synced_total++;
        buffered--;
        Serial.printf("[SD] ☁️ Synced %s (%u bytes)\n", name.c_str(), sz);
      } else {
        sync_failures++;
        Serial.printf("[SD] ❌ Sync failed for %s (HTTP %d)\n", name.c_str(), code);
      }

      http.end();
      delay(SD_BATCH_DELAY);
    }
    root.close();

    // Cleanup old synced files
    _cleanupSynced();

    if (synced > 0) {
      Serial.printf("[SD] ✅ Batch sync: %u uploaded, %u remaining\n", synced, buffered);
    }
    return synced;
  }

  bool hasPending() const { return available && buffered > 0; }

  void getStatus(JsonDocument& doc) {
    doc["sd_available"] = available;
    if (available) {
      doc["sd_total_mb"] = (uint32_t)(SD_MMC.totalBytes() / 1048576);
      doc["sd_used_mb"] = (uint32_t)(SD_MMC.usedBytes() / 1048576);
    }
    doc["sd_buffered"] = buffered;
    doc["sd_synced_total"] = synced_total;
    doc["sd_sync_failures"] = sync_failures;
  }

private:
  uint32_t _countFiles(const char* dir, const char* ext) {
    uint32_t count = 0;
    File root = SD_MMC.open(dir);
    if (!root) return 0;
    File f;
    while ((f = root.openNextFile())) {
      if (String(f.name()).endsWith(ext)) count++;
      f.close();
    }
    root.close();
    return count;
  }

  void _deleteOldest(const char* dir) {
    File root = SD_MMC.open(dir);
    if (!root) return;
    File oldest;
    File f;
    while ((f = root.openNextFile())) {
      if (!oldest || strcmp(f.name(), oldest.name()) < 0) {
        if (oldest) oldest.close();
        oldest = f;
      } else {
        f.close();
      }
    }
    root.close();
    if (oldest) {
      String path = String(dir) + "/" + oldest.name();
      SD_MMC.remove(path.c_str());
      oldest.close();
      Serial.printf("[SD] 🗑️ Deleted oldest: %s\n", path.c_str());
    }
  }

  void _cleanupSynced() {
    uint32_t count = _countFiles("/synced", ".jpg");
    if (count <= SD_KEEP_SYNCED) return;

    File root = SD_MMC.open("/synced");
    if (!root) return;
    uint32_t toDelete = count - SD_KEEP_SYNCED;
    uint32_t deleted = 0;
    File f;
    while ((f = root.openNextFile()) && deleted < toDelete) {
      String path = String("/synced/") + f.name();
      f.close();
      SD_MMC.remove(path.c_str());
      deleted++;
    }
    root.close();
  }
};

#endif
