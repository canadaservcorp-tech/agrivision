/**
 * AgriVision ESP32 SD Card Offline Buffer Module
 * ================================================
 * Stores images to MicroSD when WiFi/hub is unreachable.
 * Auto-syncs buffered images when connection restores.
 * 
 * Hardware: MicroSD card module (SPI: CS=GPIO5, MOSI=GPIO23, CLK=GPIO18, MISO=GPIO19)
 * Filesystem: FAT32, max 32GB
 * 
 * Add this alongside esp32_cam_node.ino — call from main capture loop.
 * 
 * © 2026 PCTA S.A.
 */

#include <SD_MMC.h>
#include <FS.h>
#include <SPI.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// ============================================================
// SD CARD PINS (1-bit MMC mode for ESP32-S3-CAM)
// ============================================================
// SD_MMC uses fixed pins on ESP32-S3:
//   CLK  = GPIO39
//   CMD  = GPIO38
//   D0   = GPIO40
// For SPI mode (optional):
#define SD_CS_PIN    5
#define SPI_MOSI     23
#define SPI_CLK      18
#define SPI_MISO     19

// ============================================================
// CONFIGURATION
// ============================================================
#define SD_BUFFER_DIR      "/buffer"
#define SD_SYNCED_DIR      "/synced"
#define SD_LOG_FILE        "/agrivision.log"
#define MAX_BUFFER_FILES   500          // Max images to buffer
#define MAX_SD_USAGE_MB    2048         // 2GB max buffer usage
#define SYNC_BATCH_SIZE    5            // Images per sync batch
#define SYNC_RETRY_DELAY   3000         // 3s between retries
#define IMAGE_PREFIX       "IMG_"
#define METADATA_EXT       ".meta"

// ============================================================
// STRUCTURES
// ============================================================
struct BufferedImage {
  char filename[64];
  char serial[16];
  uint32_t timestamp;
  uint16_t battery;
  int8_t rssi;
  uint32_t filesize;
  bool synced;
};

// ============================================================
// STATE
// ============================================================
static bool sd_initialized = false;
static uint32_t buffer_count = 0;
static uint32_t synced_count = 0;
static uint32_t failed_syncs = 0;

// ============================================================
// INITIALIZATION
// ============================================================

bool sd_init() {
  // Try 1-bit MMC mode first (faster, fewer pins)
  if (SD_MMC.begin("/sdcard", true)) {  // true = 1-bit mode
    sd_initialized = true;
    
    uint8_t cardType = SD_MMC.cardType();
    if (cardType == CARD_NONE) {
      Serial.println("[SD] No card detected");
      sd_initialized = false;
      return false;
    }
    
    uint64_t cardSize = SD_MMC.cardSize() / (1024 * 1024);
    uint64_t usedSize = SD_MMC.usedBytes() / (1024 * 1024);
    
    Serial.printf("[SD] Card: %lluMB, Used: %lluMB, Free: %lluMB\n", 
                  cardSize, usedSize, cardSize - usedSize);
    
    // Create directories
    if (!SD_MMC.exists(SD_BUFFER_DIR)) SD_MMC.mkdir(SD_BUFFER_DIR);
    if (!SD_MMC.exists(SD_SYNCED_DIR)) SD_MMC.mkdir(SD_SYNCED_DIR);
    
    // Count existing buffered images
    buffer_count = sd_count_files(SD_BUFFER_DIR);
    Serial.printf("[SD] Buffered images: %d\n", buffer_count);
    
    sd_log("SD initialized. Buffered: %d", buffer_count);
    return true;
  }
  
  Serial.println("[SD] Mount failed");
  return false;
}

// ============================================================
// SAVE IMAGE TO SD (called when WiFi upload fails)
// ============================================================

bool sd_save_image(camera_fb_t* fb, const char* node_serial, uint16_t battery_mv, int8_t wifi_rssi) {
  if (!sd_initialized) return false;
  if (buffer_count >= MAX_BUFFER_FILES) {
    Serial.println("[SD] Buffer full! Deleting oldest.");
    sd_delete_oldest();
  }
  
  // Check disk space
  uint64_t freeBytes = SD_MMC.totalBytes() - SD_MMC.usedBytes();
  if (freeBytes < (uint64_t)MAX_SD_USAGE_MB * 1024 * 1024 * 0.1) { // <10% of limit
    Serial.println("[SD] Low disk space!");
    sd_delete_oldest();
  }
  
  // Generate filename: IMG_20260228_143022_CAM001.jpg
  time_t now;
  time(&now);
  struct tm timeinfo;
  localtime_r(&now, &timeinfo);
  
  char filename[64];
  char metafile[64];
  snprintf(filename, sizeof(filename), "%s/%s%04d%02d%02d_%02d%02d%02d_%s.jpg",
           SD_BUFFER_DIR, IMAGE_PREFIX,
           timeinfo.tm_year + 1900, timeinfo.tm_mon + 1, timeinfo.tm_mday,
           timeinfo.tm_hour, timeinfo.tm_min, timeinfo.tm_sec,
           node_serial);
  snprintf(metafile, sizeof(metafile), "%s%s", filename, METADATA_EXT);
  
  // Write image
  File imgFile = SD_MMC.open(filename, FILE_WRITE);
  if (!imgFile) {
    Serial.printf("[SD] Failed to create: %s\n", filename);
    return false;
  }
  
  size_t written = imgFile.write(fb->buf, fb->len);
  imgFile.close();
  
  if (written != fb->len) {
    Serial.println("[SD] Write incomplete!");
    SD_MMC.remove(filename);
    return false;
  }
  
  // Write metadata JSON
  File metaFile = SD_MMC.open(metafile, FILE_WRITE);
  if (metaFile) {
    JsonDocument doc;
    doc["serial"] = node_serial;
    doc["timestamp"] = (uint32_t)now;
    doc["battery"] = battery_mv;
    doc["rssi"] = wifi_rssi;
    doc["filesize"] = fb->len;
    doc["width"] = fb->width;
    doc["height"] = fb->height;
    
    serializeJson(doc, metaFile);
    metaFile.close();
  }
  
  buffer_count++;
  Serial.printf("[SD] Saved: %s (%d bytes). Buffer: %d\n", filename, written, buffer_count);
  sd_log("Buffered: %s (%d bytes)", filename, written);
  
  return true;
}

// ============================================================
// SYNC BUFFERED IMAGES TO HUB (call when WiFi is available)
// ============================================================

uint32_t sd_sync_to_hub(const char* hub_url) {
  if (!sd_initialized || buffer_count == 0) return 0;
  
  // Check WiFi
  if (WiFi.status() != WL_CONNECTED) return 0;
  
  Serial.printf("[SD] Syncing %d buffered images to %s\n", buffer_count, hub_url);
  
  File root = SD_MMC.open(SD_BUFFER_DIR);
  if (!root || !root.isDirectory()) return 0;
  
  uint32_t synced = 0;
  
  File file = root.openNextFile();
  while (file && synced < SYNC_BATCH_SIZE) {
    String name = file.name();
    
    // Skip metadata files
    if (name.endsWith(METADATA_EXT)) {
      file = root.openNextFile();
      continue;
    }
    
    // Skip non-JPEG
    if (!name.endsWith(".jpg")) {
      file = root.openNextFile();
      continue;
    }
    
    // Read metadata
    String metaPath = String(file.path()) + METADATA_EXT;
    String serial = "UNKNOWN";
    uint16_t battery = 0;
    int8_t rssi = 0;
    
    if (SD_MMC.exists(metaPath.c_str())) {
      File metaFile = SD_MMC.open(metaPath.c_str());
      if (metaFile) {
        JsonDocument doc;
        deserializeJson(doc, metaFile);
        serial = doc["serial"].as<String>();
        battery = doc["battery"] | 0;
        rssi = doc["rssi"] | 0;
        metaFile.close();
      }
    }
    
    // Upload via HTTP
    size_t fileSize = file.size();
    uint8_t* buffer = (uint8_t*)ps_malloc(fileSize);
    if (!buffer) {
      Serial.println("[SD] Malloc failed for upload buffer");
      file = root.openNextFile();
      continue;
    }
    
    file.read(buffer, fileSize);
    
    HTTPClient http;
    String url = String(hub_url) + "/api/image";
    http.begin(url);
    http.addHeader("Content-Type", "image/jpeg");
    http.addHeader("X-Node-Serial", serial);
    http.addHeader("X-Battery", String(battery));
    http.addHeader("X-WiFi-RSSI", String(rssi));
    http.addHeader("X-SD-Buffered", "true");
    
    int httpCode = http.POST(buffer, fileSize);
    free(buffer);
    
    if (httpCode == 200) {
      // Move to synced dir
      String syncedPath = String(SD_SYNCED_DIR) + "/" + name;
      SD_MMC.rename(file.path(), syncedPath.c_str());
      
      // Remove metadata
      if (SD_MMC.exists(metaPath.c_str())) {
        SD_MMC.remove(metaPath.c_str());
      }
      
      synced++;
      buffer_count--;
      synced_count++;
      
      Serial.printf("[SD] Synced: %s (HTTP %d)\n", name.c_str(), httpCode);
    } else {
      failed_syncs++;
      Serial.printf("[SD] Sync failed: %s (HTTP %d)\n", name.c_str(), httpCode);
    }
    
    http.end();
    delay(500); // Don't overwhelm the hub
    
    file = root.openNextFile();
  }
  
  root.close();
  
  if (synced > 0) {
    sd_log("Synced %d images. Remaining: %d", synced, buffer_count);
    // Clean old synced files (keep last 50)
    sd_cleanup_synced(50);
  }
  
  return synced;
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

uint32_t sd_count_files(const char* dir) {
  File root = SD_MMC.open(dir);
  if (!root) return 0;
  
  uint32_t count = 0;
  File file = root.openNextFile();
  while (file) {
    if (!file.isDirectory() && String(file.name()).endsWith(".jpg")) count++;
    file = root.openNextFile();
  }
  return count;
}

void sd_delete_oldest() {
  File root = SD_MMC.open(SD_BUFFER_DIR);
  if (!root) return;
  
  File oldest = root.openNextFile();
  if (oldest) {
    String path = oldest.path();
    String metaPath = path + METADATA_EXT;
    oldest.close();
    
    SD_MMC.remove(path.c_str());
    if (SD_MMC.exists(metaPath.c_str())) SD_MMC.remove(metaPath.c_str());
    
    if (buffer_count > 0) buffer_count--;
    Serial.printf("[SD] Deleted oldest: %s\n", path.c_str());
  }
  root.close();
}

void sd_cleanup_synced(uint32_t keep) {
  File root = SD_MMC.open(SD_SYNCED_DIR);
  if (!root) return;
  
  // Count synced files
  uint32_t count = 0;
  File file = root.openNextFile();
  while (file) { count++; file = root.openNextFile(); }
  root.close();
  
  if (count <= keep) return;
  
  // Delete oldest synced
  uint32_t toDelete = count - keep;
  root = SD_MMC.open(SD_SYNCED_DIR);
  file = root.openNextFile();
  uint32_t deleted = 0;
  while (file && deleted < toDelete) {
    SD_MMC.remove(file.path());
    deleted++;
    file = root.openNextFile();
  }
  root.close();
  
  Serial.printf("[SD] Cleaned %d synced files\n", deleted);
}

// Get SD status for hub reporting
void sd_get_status(JsonDocument& doc) {
  if (!sd_initialized) {
    doc["sd_available"] = false;
    return;
  }
  
  doc["sd_available"] = true;
  doc["sd_total_mb"] = SD_MMC.totalBytes() / (1024 * 1024);
  doc["sd_used_mb"] = SD_MMC.usedBytes() / (1024 * 1024);
  doc["sd_buffered"] = buffer_count;
  doc["sd_synced_total"] = synced_count;
  doc["sd_sync_failures"] = failed_syncs;
}

// Simple logging
void sd_log(const char* fmt, ...) {
  if (!sd_initialized) return;
  
  char msg[256];
  va_list args;
  va_start(args, fmt);
  vsnprintf(msg, sizeof(msg), fmt, args);
  va_end(args);
  
  File logFile = SD_MMC.open(SD_LOG_FILE, FILE_APPEND);
  if (logFile) {
    time_t now;
    time(&now);
    struct tm t;
    localtime_r(&now, &t);
    logFile.printf("[%04d-%02d-%02d %02d:%02d:%02d] %s\n",
                   t.tm_year + 1900, t.tm_mon + 1, t.tm_mday,
                   t.tm_hour, t.tm_min, t.tm_sec, msg);
    logFile.close();
  }
}

// Check if SD has pending images to sync
bool sd_has_pending() {
  return sd_initialized && buffer_count > 0;
}

// Get buffer count
uint32_t sd_get_buffer_count() {
  return buffer_count;
}
