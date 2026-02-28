/**
 * AgriVision Camera Node — Power Manager
 * ================================================
 * Adapts capture rate based on battery level.
 * Manages deep sleep for max battery life.
 * 
 * PROFILES:
 *   FULL      (>80%) — Normal interval, full res, flash OK
 *   NORMAL    (50-80%) — Normal interval, full res, no flash
 *   SAVER     (25-50%) — 2× interval, reduced res
 *   CRITICAL  (10-25%) — 4× interval, VGA, skip AI
 *   SHUTDOWN  (<10%)  — One last image + sync, then deep sleep until charge
 *
 * © 2026 PCTA S.A.
 */
#ifndef AGRI_POWER_H
#define AGRI_POWER_H

#include <Arduino.h>
#include <esp_sleep.h>

enum PowerProfile { PWR_FULL, PWR_NORMAL, PWR_SAVER, PWR_CRITICAL, PWR_SHUTDOWN };

class PowerManager {
public:
  void begin() {
    _readBattery();
    _updateProfile();
    Serial.printf("[PWR] Battery: %umV (%u%%) → Profile: %s\n",
                  _batt_mv, _batt_pct, profileName());
  }

  void refresh() {
    _readBattery();
    _updateProfile();
  }

  // Current readings
  uint16_t batteryMv()      const { return _batt_mv; }
  uint8_t  batteryPercent() const { return _batt_pct; }
  PowerProfile profile()    const { return _profile; }

  const char* profileName() const {
    switch (_profile) {
      case PWR_FULL:     return "FULL";
      case PWR_NORMAL:   return "NORMAL";
      case PWR_SAVER:    return "SAVER";
      case PWR_CRITICAL: return "CRITICAL";
      case PWR_SHUTDOWN: return "SHUTDOWN";
      default:           return "UNKNOWN";
    }
  }

  // Adjusted capture interval based on battery
  uint16_t adjustedInterval(uint16_t base_sec) const {
    switch (_profile) {
      case PWR_FULL:
      case PWR_NORMAL:   return base_sec;
      case PWR_SAVER:    return base_sec * 2;
      case PWR_CRITICAL: return base_sec * 4;
      case PWR_SHUTDOWN: return 0; // No more captures
      default:           return base_sec;
    }
  }

  // Max resolution for current profile
  uint8_t maxResolution() const {
    switch (_profile) {
      case PWR_FULL:
      case PWR_NORMAL:   return 0; // UXGA 1600x1200
      case PWR_SAVER:    return 2; // XGA 1024x768
      case PWR_CRITICAL: return 4; // VGA 640x480
      default:           return 0;
    }
  }

  bool flashAllowed() const { return _profile == PWR_FULL; }
  bool aiAllowed()    const { return _profile != PWR_CRITICAL && _profile != PWR_SHUTDOWN; }
  bool shouldSleep()  const { return _profile == PWR_SHUTDOWN; }

  // Enter deep sleep — wake on timer or external trigger
  void deepSleep(uint32_t seconds) {
    Serial.printf("[PWR] Deep sleep for %u seconds\n", seconds);
    esp_sleep_enable_timer_wakeup((uint64_t)seconds * 1000000ULL);
    // Also wake on BOOT button press
    esp_sleep_enable_ext0_wakeup((gpio_num_t)RESET_BTN_PIN, 0);
    delay(100);
    esp_deep_sleep_start();
  }

  // Shutdown for low battery — wake after 1 hour to recheck
  void shutdownLowBattery() {
    Serial.println("[PWR] ⚠️ Battery critically low — shutting down");
    Serial.println("[PWR] Will wake in 1 hour to recheck");
    deepSleep(3600);
  }

  // Get wake reason
  const char* wakeReason() {
    esp_sleep_wakeup_cause_t reason = esp_sleep_get_wakeup_cause();
    switch (reason) {
      case ESP_SLEEP_WAKEUP_TIMER: return "timer";
      case ESP_SLEEP_WAKEUP_EXT0:  return "button";
      default:                     return "power_on";
    }
  }

private:
  uint16_t _batt_mv = 0;
  uint8_t  _batt_pct = 0;
  PowerProfile _profile = PWR_FULL;

  void _readBattery() {
    uint32_t sum = 0;
    for (int i = 0; i < 16; i++) {
      sum += analogReadMilliVolts(BATT_ADC_PIN);
      delay(2);
    }
    _batt_mv = (sum / 16) * 2; // Voltage divider 2:1

    // LiFePO4 curve: 3.6V=100%, 3.2V=50%, 2.8V=0%
    if (_batt_mv >= 3600) _batt_pct = 100;
    else if (_batt_mv <= 2800) _batt_pct = 0;
    else _batt_pct = (uint8_t)((_batt_mv - 2800) * 100 / 800);
  }

  void _updateProfile() {
    if (_batt_pct > 80)      _profile = PWR_FULL;
    else if (_batt_pct > 50) _profile = PWR_NORMAL;
    else if (_batt_pct > 25) _profile = PWR_SAVER;
    else if (_batt_pct > 10) _profile = PWR_CRITICAL;
    else                     _profile = PWR_SHUTDOWN;
  }
};

#endif
