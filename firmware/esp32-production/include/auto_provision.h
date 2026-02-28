/**
 * AgriVision Camera Node — Auto-Provisioning
 * ================================================
 * When not provisioned (or after factory reset):
 *   1. Creates temporary WiFi AP: "AgriCam-XXXX" (last 4 of MAC)
 *   2. Runs HTTP server on 192.168.4.1:80
 *   3. Phone/laptop connects → opens config page
 *   4. Or: batch_flash.py sends config via serial during manufacture
 *
 * Endpoints:
 *   GET  /           → Config page (HTML form)
 *   GET  /status     → Current config JSON
 *   POST /provision  → Set serial, hub WiFi, zone
 *   POST /test-wifi  → Test hub WiFi connection
 *   POST /reboot     → Save and reboot into normal mode
 *
 * © 2026 PCTA S.A.
 */
#ifndef AGRI_PROVISION_H
#define AGRI_PROVISION_H

#include <Arduino.h>
#include <WiFi.h>
#include <WebServer.h>
#include <ArduinoJson.h>
#include "config.h"

class AutoProvisioner {
public:
  bool active = false;

  void begin(ConfigManager& cfg) {
    _cfg = &cfg;

    // Create AP name from MAC
    String mac = cfg.cfg.mac;
    String suffix = mac.substring(mac.length() - 5);
    suffix.replace(":", "");
    _apName = "AgriCam-" + suffix;

    Serial.printf("[PROV] Starting provisioning AP: %s\n", _apName.c_str());

    WiFi.mode(WIFI_AP);
    WiFi.softAP(_apName.c_str(), "agri-setup"); // Password: agri-setup
    delay(100);
    WiFi.softAPConfig(IPAddress(192,168,4,1), IPAddress(192,168,4,1), IPAddress(255,255,255,0));

    _setupRoutes();
    _server.begin();
    active = true;

    Serial.printf("[PROV] AP ready: %s (pw: agri-setup)\n", _apName.c_str());
    Serial.printf("[PROV] Config page: http://192.168.4.1\n");
  }

  void handle() {
    if (active) _server.handleClient();
  }

  void stop() {
    _server.stop();
    WiFi.softAPdisconnect(true);
    active = false;
  }

  // Serial provisioning (used by batch_flash.py)
  bool checkSerial() {
    if (!Serial.available()) return false;

    String line = Serial.readStringUntil('\n');
    line.trim();

    if (line.startsWith("PROVISION:")) {
      // Format: PROVISION:serial,hub_ssid,hub_pass,hub_ip,hub_port,zone
      line = line.substring(10);
      int p1 = line.indexOf(',');
      int p2 = line.indexOf(',', p1+1);
      int p3 = line.indexOf(',', p2+1);
      int p4 = line.indexOf(',', p3+1);
      int p5 = line.indexOf(',', p4+1);

      if (p1 < 0 || p2 < 0 || p3 < 0 || p4 < 0 || p5 < 0) {
        Serial.println("PROVISION:ERROR:Invalid format");
        return false;
      }

      String serial   = line.substring(0, p1);
      String ssid     = line.substring(p1+1, p2);
      String pass     = line.substring(p2+1, p3);
      String ip       = line.substring(p3+1, p4);
      uint16_t port   = line.substring(p4+1, p5).toInt();
      String zone     = line.substring(p5+1);

      _cfg->provision(serial.c_str(), ssid.c_str(), pass.c_str(),
                      ip.c_str(), port, zone.c_str());

      Serial.printf("PROVISION:OK:%s\n", serial.c_str());
      return true;
    }

    if (line == "STATUS") {
      Serial.printf("STATUS:%s,%s,%s,%s,%d,%s,%s,%s\n",
                    _cfg->cfg.serial, _cfg->cfg.mac, _cfg->cfg.fw_version,
                    _cfg->cfg.hub_ssid, _cfg->cfg.hub_port,
                    _cfg->cfg.zone, _cfg->isProvisioned() ? "PROVISIONED" : "UNPROVISIONED",
                    _cfg->cfg.provisioned ? "true" : "false");
      return false;
    }

    if (line == "FACTORY_RESET") {
      Serial.println("FACTORY_RESET:OK");
      delay(100);
      _cfg->factoryReset();
      return false;
    }

    return false;
  }

private:
  ConfigManager* _cfg;
  WebServer _server{80};
  String _apName;

  void _setupRoutes() {
    // Config page
    _server.on("/", HTTP_GET, [this]() {
      _server.send(200, "text/html", _configPage());
    });

    // JSON status
    _server.on("/status", HTTP_GET, [this]() {
      JsonDocument doc;
      doc["serial"] = _cfg->cfg.serial;
      doc["mac"] = _cfg->cfg.mac;
      doc["firmware"] = _cfg->cfg.fw_version;
      doc["provisioned"] = _cfg->cfg.provisioned;
      doc["hub_ssid"] = _cfg->cfg.hub_ssid;
      doc["hub_ip"] = _cfg->cfg.hub_ip;
      doc["hub_port"] = _cfg->cfg.hub_port;
      doc["zone"] = _cfg->cfg.zone;
      doc["boot_count"] = _cfg->cfg.boot_count;
      String resp;
      serializeJson(doc, resp);
      _server.send(200, "application/json", resp);
    });

    // Provision endpoint
    _server.on("/provision", HTTP_POST, [this]() {
      String serial = _server.arg("serial");
      String ssid   = _server.arg("hub_ssid");
      String pass   = _server.arg("hub_pass");
      String ip     = _server.arg("hub_ip");
      uint16_t port = _server.arg("hub_port").toInt();
      String zone   = _server.arg("zone");

      if (serial.isEmpty() || ssid.isEmpty()) {
        _server.send(400, "application/json", "{\"error\":\"serial and hub_ssid required\"}");
        return;
      }
      if (port == 0) port = 8080;
      if (ip.isEmpty()) ip = "192.168.4.1";
      if (zone.isEmpty()) zone = "default";

      _cfg->provision(serial.c_str(), ssid.c_str(), pass.c_str(),
                      ip.c_str(), port, zone.c_str());

      _server.send(200, "application/json",
        "{\"status\":\"ok\",\"serial\":\"" + serial + "\",\"message\":\"Provisioned. Reboot to connect to hub.\"}");
    });

    // Test WiFi
    _server.on("/test-wifi", HTTP_POST, [this]() {
      String ssid = _server.arg("hub_ssid");
      String pass = _server.arg("hub_pass");

      WiFi.mode(WIFI_AP_STA);
      WiFi.begin(ssid.c_str(), pass.c_str());

      int tries = 0;
      while (WiFi.status() != WL_CONNECTED && tries < 20) {
        delay(500); tries++;
      }

      if (WiFi.status() == WL_CONNECTED) {
        String resp = "{\"status\":\"connected\",\"ip\":\"" + WiFi.localIP().toString() +
                      "\",\"rssi\":" + String(WiFi.RSSI()) + "}";
        _server.send(200, "application/json", resp);
        WiFi.disconnect();
      } else {
        _server.send(200, "application/json", "{\"status\":\"failed\",\"error\":\"Could not connect\"}");
      }
      WiFi.mode(WIFI_AP);
    });

    // Reboot
    _server.on("/reboot", HTTP_POST, [this]() {
      _server.send(200, "application/json", "{\"status\":\"rebooting\"}");
      delay(500);
      ESP.restart();
    });
  }

  String _configPage() {
    return R"rawliteral(
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>AgriVision Camera Setup</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,sans-serif;background:#f0f4e8;padding:16px}
    .card{background:#fff;border-radius:12px;padding:20px;margin-bottom:16px;box-shadow:0 1px 4px rgba(0,0,0,.08)}
    h1{color:#1e3a2f;font-size:20px;margin-bottom:4px}
    h2{color:#1e3a2f;font-size:14px;margin-bottom:12px}
    .sub{color:#6b7280;font-size:12px}
    label{display:block;font-size:12px;font-weight:600;color:#374151;margin-bottom:4px;margin-top:10px}
    input,select{width:100%;padding:10px;border:1px solid #d1d5db;border-radius:8px;font-size:14px}
    button{width:100%;padding:12px;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;margin-top:12px}
    .btn-primary{background:#1e3a2f;color:#fff}
    .btn-test{background:#f3f4f6;color:#374151}
    .status{padding:8px 12px;border-radius:6px;font-size:12px;margin-top:8px}
    .ok{background:#dcfce7;color:#166534}
    .err{background:#fee2e2;color:#991b1b}
    .info{background:#e0f2fe;color:#075985}
    #result{display:none}
  </style>
</head>
<body>
  <div class="card">
    <h1>🌱 AgriVision Camera Setup</h1>
    <p class="sub">MAC: )rawliteral" + String(_cfg->cfg.mac) + R"rawliteral( | FW: )rawliteral" + String(_cfg->cfg.fw_version) + R"rawliteral(</p>
  </div>

  <div class="card">
    <h2>📋 Camera Identity</h2>
    <label>Camera Serial</label>
    <input id="serial" placeholder="CAM-A3F7C001" value=")rawliteral" + String(_cfg->cfg.serial) + R"rawliteral(">
    <label>Zone / Location</label>
    <input id="zone" placeholder="North Field" value=")rawliteral" + String(_cfg->cfg.zone) + R"rawliteral(">
  </div>

  <div class="card">
    <h2>📡 Hub Connection</h2>
    <label>Hub WiFi SSID</label>
    <input id="hub_ssid" placeholder="AgriVision-HUB" value=")rawliteral" + String(_cfg->cfg.hub_ssid) + R"rawliteral(">
    <label>Hub WiFi Password</label>
    <input id="hub_pass" type="password" placeholder="Password" value="">
    <label>Hub IP Address</label>
    <input id="hub_ip" placeholder="192.168.4.1" value=")rawliteral" + String(_cfg->cfg.hub_ip) + R"rawliteral(">
    <label>Hub Port</label>
    <input id="hub_port" type="number" placeholder="8080" value=")rawliteral" + String(_cfg->cfg.hub_port) + R"rawliteral(">
    <button class="btn-test" onclick="testWifi()">🔍 Test WiFi Connection</button>
  </div>

  <div id="result"></div>

  <button class="btn-primary" onclick="provision()">✅ Save & Provision</button>
  <button class="btn-test" onclick="reboot()" style="margin-top:8px">🔄 Reboot Camera</button>

  <script>
    async function provision(){
      let r=document.getElementById('result');
      r.style.display='block';
      r.className='status info';
      r.textContent='Saving...';
      try{
        let res=await fetch('/provision',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},
          body:new URLSearchParams({
            serial:document.getElementById('serial').value,
            hub_ssid:document.getElementById('hub_ssid').value,
            hub_pass:document.getElementById('hub_pass').value,
            hub_ip:document.getElementById('hub_ip').value,
            hub_port:document.getElementById('hub_port').value,
            zone:document.getElementById('zone').value
          })});
        let d=await res.json();
        if(d.status==='ok'){r.className='status ok';r.textContent='✅ '+d.message;}
        else{r.className='status err';r.textContent='❌ '+d.error;}
      }catch(e){r.className='status err';r.textContent='❌ '+e.message;}
    }
    async function testWifi(){
      let r=document.getElementById('result');
      r.style.display='block';r.className='status info';r.textContent='Testing WiFi...';
      try{
        let res=await fetch('/test-wifi',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},
          body:new URLSearchParams({hub_ssid:document.getElementById('hub_ssid').value,hub_pass:document.getElementById('hub_pass').value})});
        let d=await res.json();
        if(d.status==='connected'){r.className='status ok';r.textContent='✅ Connected! IP:'+d.ip+' RSSI:'+d.rssi+'dBm';}
        else{r.className='status err';r.textContent='❌ '+d.error;}
      }catch(e){r.className='status err';r.textContent='❌ '+e.message;}
    }
    async function reboot(){if(confirm('Reboot camera?'))await fetch('/reboot',{method:'POST'});location.reload();}
  </script>
</body>
</html>
)rawliteral";
  }
};

#endif
