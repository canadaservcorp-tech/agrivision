/**
 * AgriVision Camera Node — OTA Firmware Receiver
 * ================================================
 * Hub pushes firmware updates to cameras via HTTP.
 * Uses ESP32 dual-partition scheme for safe rollback.
 * 
 * Flow:
 *   1. Hub sends command: {"cmd":"ota","url":"http://192.168.4.1:8080/firmware/v1.3.0.bin"}
 *   2. Camera downloads binary in chunks
 *   3. Writes to inactive OTA partition
 *   4. Verifies checksum
 *   5. Marks new partition as boot
 *   6. Reboots → runs self-test → if fail → rollback
 *
 * © 2026 PCTA S.A.
 */
#ifndef AGRI_OTA_H
#define AGRI_OTA_H

#include <Arduino.h>
#include <HTTPClient.h>
#include <Update.h>
#include <esp_ota_ops.h>

class OtaReceiver {
public:
  bool updating = false;
  uint8_t progress = 0;

  /**
   * Download and apply firmware from URL.
   * Returns true if update succeeded (reboot needed).
   */
  bool applyUpdate(const char* url) {
    Serial.printf("[OTA] Starting update from: %s\n", url);
    updating = true;
    progress = 0;

    HTTPClient http;
    http.begin(url);
    http.setTimeout(60000); // 60s timeout

    int code = http.GET();
    if (code != 200) {
      Serial.printf("[OTA] ❌ HTTP error: %d\n", code);
      http.end();
      updating = false;
      return false;
    }

    int totalSize = http.getSize();
    if (totalSize <= 0) {
      Serial.println("[OTA] ❌ Invalid content length");
      http.end();
      updating = false;
      return false;
    }

    Serial.printf("[OTA] Firmware size: %d bytes\n", totalSize);

    if (!Update.begin(totalSize, U_FLASH)) {
      Serial.printf("[OTA] ❌ Not enough space: %s\n", Update.errorString());
      http.end();
      updating = false;
      return false;
    }

    WiFiClient* stream = http.getStreamPtr();
    uint8_t buf[4096];
    int written = 0;
    int lastPct = -1;

    while (http.connected() && written < totalSize) {
      size_t available = stream->available();
      if (available) {
        int read = stream->readBytes(buf, min(available, sizeof(buf)));
        size_t w = Update.write(buf, read);
        if (w != (size_t)read) {
          Serial.println("[OTA] ❌ Write failed");
          Update.abort();
          http.end();
          updating = false;
          return false;
        }
        written += read;
        progress = (uint8_t)((written * 100) / totalSize);

        if ((int)progress != lastPct && progress % 10 == 0) {
          Serial.printf("[OTA] Progress: %d%%\n", progress);
          lastPct = progress;
        }
      }
      delay(1);
    }

    http.end();

    if (written != totalSize) {
      Serial.printf("[OTA] ❌ Incomplete: %d/%d bytes\n", written, totalSize);
      Update.abort();
      updating = false;
      return false;
    }

    if (!Update.end(true)) {
      Serial.printf("[OTA] ❌ Finalize failed: %s\n", Update.errorString());
      updating = false;
      return false;
    }

    Serial.println("[OTA] ✅ Update successful — reboot required");
    progress = 100;
    updating = false;
    return true;
  }

  /**
   * Mark current firmware as valid (call after successful self-test post-OTA).
   * Prevents automatic rollback to previous version.
   */
  void confirmFirmware() {
    const esp_partition_t* running = esp_ota_get_running_partition();
    esp_ota_img_states_t state;
    if (esp_ota_get_state_partition(running, &state) == ESP_OK) {
      if (state == ESP_OTA_IMG_PENDING_VERIFY) {
        esp_ota_mark_app_valid_cancel_rollback();
        Serial.println("[OTA] ✅ New firmware confirmed valid");
      }
    }
  }

  /**
   * Force rollback to previous firmware.
   */
  void rollback() {
    Serial.println("[OTA] ⚠️ Rolling back to previous firmware...");
    esp_ota_mark_app_invalid_rollback_and_reboot();
  }

  /**
   * Check if we just booted after an OTA update.
   */
  bool isPostOta() {
    const esp_partition_t* running = esp_ota_get_running_partition();
    esp_ota_img_states_t state;
    if (esp_ota_get_state_partition(running, &state) == ESP_OK) {
      return state == ESP_OTA_IMG_PENDING_VERIFY;
    }
    return false;
  }

  /**
   * Get running partition info.
   */
  void getPartitionInfo(char* buf, size_t sz) {
    const esp_partition_t* running = esp_ota_get_running_partition();
    snprintf(buf, sz, "label=%s addr=0x%08x size=%u",
             running->label, (unsigned)running->address, (unsigned)running->size);
  }
};

#endif
