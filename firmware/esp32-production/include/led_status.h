/**
 * AgriVision Camera Node — LED Status Indicator
 * ================================================
 * Blink patterns visible in the field without SSH.
 * 
 * PATTERNS:
 *   BOOTING       ─ Fast blink 5x (250ms)
 *   PROVISION_MODE─ Slow pulse (1s on, 1s off)
 *   WIFI_CONNECT  ─ Double blink (100ms on, 100ms off, 100ms on, 700ms off)
 *   CAPTURING     ─ Single flash (50ms on)
 *   UPLOADING     ─ Triple fast (80ms × 3)
 *   SD_BUFFERING  ─ Long-short (500ms on, 100ms off, 100ms on, 300ms off)
 *   ERROR         ─ SOS pattern
 *   LOW_BATTERY   ─ Single dim pulse every 5s
 *   OTA_UPDATE    ─ Rapid flicker
 *   SELF_TEST     ─ Ramp up 5 blinks accelerating
 *   IDLE          ─ Off (deep sleep coming)
 *   FACTORY_RESET ─ 3 long blinks (1s each)
 *
 * © 2026 PCTA S.A.
 */
#ifndef AGRI_LED_H
#define AGRI_LED_H

#include <Arduino.h>

enum LedPattern {
  LED_OFF,
  LED_BOOTING,
  LED_PROVISION_MODE,
  LED_WIFI_CONNECT,
  LED_CAPTURING,
  LED_UPLOADING,
  LED_SD_BUFFERING,
  LED_ERROR,
  LED_LOW_BATTERY,
  LED_OTA_UPDATE,
  LED_SELF_TEST,
  LED_FACTORY_RESET,
  LED_SOLID_ON
};

class LedStatus {
public:
  void begin() {
    pinMode(LED_PIN, OUTPUT);
    digitalWrite(LED_PIN, LOW);
  }

  // Non-blocking pattern — call from loop()
  void update() {
    if (_pattern == LED_OFF) { digitalWrite(LED_PIN, LOW); return; }
    if (_pattern == LED_SOLID_ON) { digitalWrite(LED_PIN, HIGH); return; }

    unsigned long now = millis();
    if (now - _lastToggle < _stepDelay[_stepIdx]) return;
    _lastToggle = now;

    bool state = _steps[_stepIdx];
    digitalWrite(LED_PIN, state ? HIGH : LOW);
    _stepIdx++;

    if (_stepIdx >= _stepCount) {
      _stepIdx = 0;
      _cycleCount++;
      // One-shot patterns auto-off
      if (_oneShot && _cycleCount >= _maxCycles) {
        _pattern = LED_OFF;
        digitalWrite(LED_PIN, LOW);
      }
    }
  }

  void setPattern(LedPattern p) {
    if (p == _pattern) return;
    _pattern = p;
    _stepIdx = 0;
    _cycleCount = 0;
    _lastToggle = 0;
    _oneShot = false;
    _maxCycles = 1;
    _buildPattern(p);
  }

  // One-shot flash (e.g., capture indicator)
  void flash(LedPattern p, uint8_t cycles = 1) {
    setPattern(p);
    _oneShot = true;
    _maxCycles = cycles;
  }

  LedPattern current() const { return _pattern; }

private:
  LedPattern _pattern = LED_OFF;
  bool _steps[20];
  uint16_t _stepDelay[20];
  uint8_t _stepCount = 0;
  uint8_t _stepIdx = 0;
  uint32_t _cycleCount = 0;
  uint32_t _maxCycles = 1;
  unsigned long _lastToggle = 0;
  bool _oneShot = false;

  void _add(bool on, uint16_t ms) {
    if (_stepCount < 20) {
      _steps[_stepCount] = on;
      _stepDelay[_stepCount] = ms;
      _stepCount++;
    }
  }

  void _buildPattern(LedPattern p) {
    _stepCount = 0;
    switch (p) {
      case LED_BOOTING:        // 5 fast blinks
        for (int i = 0; i < 5; i++) { _add(true, 150); _add(false, 150); }
        _add(false, 500);
        break;
      case LED_PROVISION_MODE: // Slow pulse
        _add(true, 1000); _add(false, 1000);
        break;
      case LED_WIFI_CONNECT:   // Double blink
        _add(true, 100); _add(false, 100); _add(true, 100); _add(false, 700);
        break;
      case LED_CAPTURING:      // Single flash
        _add(true, 50); _add(false, 200);
        break;
      case LED_UPLOADING:      // Triple fast
        for (int i = 0; i < 3; i++) { _add(true, 80); _add(false, 80); }
        _add(false, 400);
        break;
      case LED_SD_BUFFERING:   // Long-short
        _add(true, 500); _add(false, 100); _add(true, 100); _add(false, 300);
        break;
      case LED_ERROR:          // SOS: ...---...
        for (int i = 0; i < 3; i++) { _add(true, 100); _add(false, 100); } // S
        for (int i = 0; i < 3; i++) { _add(true, 300); _add(false, 100); } // O
        for (int i = 0; i < 3; i++) { _add(true, 100); _add(false, 100); } // S
        _add(false, 1000);
        break;
      case LED_LOW_BATTERY:    // Dim pulse every 5s
        _add(true, 200); _add(false, 4800);
        break;
      case LED_OTA_UPDATE:     // Rapid flicker
        _add(true, 50); _add(false, 50);
        break;
      case LED_SELF_TEST:      // Accelerating
        _add(true, 400); _add(false, 400);
        _add(true, 300); _add(false, 300);
        _add(true, 200); _add(false, 200);
        _add(true, 100); _add(false, 100);
        _add(true, 50);  _add(false, 500);
        break;
      case LED_FACTORY_RESET:  // 3 long blinks
        for (int i = 0; i < 3; i++) { _add(true, 1000); _add(false, 500); }
        break;
      default:
        break;
    }
  }
};

#endif
