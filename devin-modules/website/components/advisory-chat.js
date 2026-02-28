/* ============================================================
 * AGRIVISION ADVISORY CHAT WIDGET
 * Embeddable GenAI chatbot for website
 * Add to page: <script src="components/advisory-chat.js"></script>
 *              <div id="agrivision-chat"></div>
 * ============================================================ */

class AgrivisionChat {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.apiUrl = options.apiUrl || '/api/v1/advisory';
    this.language = options.language || 'en';
    this.farmId = options.farmId || null;
    this.chatId = null;
    this.messages = [];
    this.isOpen = false;

    this.labels = {
      en: { title: 'Farm Advisor', placeholder: 'Ask about crops, diseases, weather...', send: 'Send' },
      fr: { title: 'Conseiller Agricole', placeholder: 'Posez vos questions sur les cultures, maladies...', send: 'Envoyer' },
      ar: { title: 'المستشار الزراعي', placeholder: '...اسأل عن المحاصيل والأمراض', send: 'إرسال' },
      tr: { title: 'Tarım Danışmanı', placeholder: 'Ürünler, hastalıklar hakkında sorun...', send: 'Gönder' },
    };

    this.render();
  }

  render() {
    const l = this.labels[this.language] || this.labels.en;

    this.container.innerHTML = `
      <div id="av-chat-toggle" style="position:fixed;bottom:24px;right:24px;width:60px;height:60px;
        background:#1B5E20;border-radius:50%;cursor:pointer;display:flex;align-items:center;
        justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,0.3);z-index:9999;transition:transform 0.2s">
        <svg width="28" height="28" fill="white" viewBox="0 0 24 24">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
        </svg>
      </div>
      <div id="av-chat-panel" style="display:none;position:fixed;bottom:96px;right:24px;width:380px;
        max-height:520px;background:white;border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,0.15);
        z-index:9999;overflow:hidden;font-family:system-ui,-apple-system,sans-serif">
        <div style="background:#1B5E20;color:white;padding:16px 20px;display:flex;align-items:center;justify-content:space-between">
          <div>
            <div style="font-weight:700;font-size:16px">${l.title}</div>
            <div style="font-size:11px;opacity:0.8">Powered by Agrivision AI</div>
          </div>
          <button id="av-chat-close" style="background:none;border:none;color:white;font-size:20px;cursor:pointer">&times;</button>
        </div>
        <div id="av-chat-messages" style="height:340px;overflow-y:auto;padding:16px"></div>
        <div style="padding:12px;border-top:1px solid #eee;display:flex;gap:8px">
          <input id="av-chat-input" type="text" placeholder="${l.placeholder}" 
            style="flex:1;border:1px solid #ddd;border-radius:20px;padding:10px 16px;font-size:14px;outline:none">
          <button id="av-chat-send" style="background:#1B5E20;color:white;border:none;border-radius:20px;
            padding:10px 18px;cursor:pointer;font-size:14px;font-weight:600">${l.send}</button>
        </div>
      </div>`;

    // Event listeners
    document.getElementById('av-chat-toggle').addEventListener('click', () => this.toggle());
    document.getElementById('av-chat-close').addEventListener('click', () => this.toggle());
    document.getElementById('av-chat-send').addEventListener('click', () => this.send());
    document.getElementById('av-chat-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.send();
    });
  }

  toggle() {
    this.isOpen = !this.isOpen;
    document.getElementById('av-chat-panel').style.display = this.isOpen ? 'block' : 'none';
    const toggle = document.getElementById('av-chat-toggle');
    toggle.style.transform = this.isOpen ? 'rotate(90deg)' : '';
    if (this.isOpen && !this.messages.length) this.showWelcome();
  }

  showWelcome() {
    const msgs = document.getElementById('av-chat-messages');
    const questions = this.language === 'fr'
      ? ['Comment identifier le mildiou?', 'Quand planter au Québec?', 'Optimiser mon irrigation']
      : ['How to identify blight?', 'When to plant in my region?', 'Optimize my irrigation'];

    msgs.innerHTML = `<div style="text-align:center;padding:20px;color:#666">
      <div style="font-size:32px;margin-bottom:8px">🌱</div>
      <div style="font-size:14px;margin-bottom:16px">${this.language === 'fr' ? 'Comment puis-je vous aider?' : 'How can I help?'}</div>
      ${questions.map(q => `<button onclick="document.getElementById('av-chat-input').value='${q}';document.getElementById('av-chat-send').click()" 
        style="display:block;width:100%;margin:6px 0;padding:8px 12px;background:#E8F5E9;border:1px solid #C8E6C9;
        border-radius:8px;cursor:pointer;font-size:13px;text-align:left;color:#2E7D32">${q}</button>`).join('')}
    </div>`;
  }

  async send() {
    const input = document.getElementById('av-chat-input');
    const text = input.value.trim();
    if (!text) return;

    input.value = '';
    this.addMessage('user', text);
    this.addMessage('assistant', '<div class="av-typing">●●●</div>', true);

    try {
      const res = await fetch(`${this.apiUrl}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text, chat_id: this.chatId,
          farm_id: this.farmId, language: this.language
        })
      });

      const data = await res.json();
      // Remove typing indicator
      document.querySelector('.av-typing')?.closest('.av-msg')?.remove();

      if (data.success) {
        this.chatId = data.data.chat_id;
        this.addMessage('assistant', data.data.response);
      } else {
        this.addMessage('assistant', 'Sorry, something went wrong. Please try again.');
      }
    } catch (e) {
      document.querySelector('.av-typing')?.closest('.av-msg')?.remove();
      this.addMessage('assistant', 'Connection error. Please check your network.');
    }
  }

  addMessage(role, content, isTemp = false) {
    const msgs = document.getElementById('av-chat-messages');
    const isUser = role === 'user';
    const div = document.createElement('div');
    div.className = 'av-msg';
    div.style.cssText = `margin-bottom:12px;display:flex;justify-content:${isUser ? 'flex-end' : 'flex-start'}`;
    div.innerHTML = `<div style="max-width:80%;padding:10px 14px;border-radius:14px;font-size:14px;line-height:1.5;
      ${isUser ? 'background:#1B5E20;color:white;border-bottom-right-radius:4px' : 'background:#f0f0f0;color:#333;border-bottom-left-radius:4px'}">
      ${content}</div>`;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
    if (!isTemp) this.messages.push({ role, content });
  }
}

// Auto-init if container exists
document.addEventListener('DOMContentLoaded', () => {
  const el = document.getElementById('agrivision-chat');
  if (el) {
    window.agrivisionChat = new AgrivisionChat('agrivision-chat', {
      language: el.dataset.language || 'en',
      farmId: el.dataset.farmId || null,
    });
  }
});


/* ============================================================
 * CARBON CALCULATOR WIDGET
 * Embeddable carbon footprint estimation tool
 * Add: <div id="agrivision-carbon" data-farm-id="xxx"></div>
 *      <script src="components/carbon-calculator.js"></script>
 * ============================================================ */

class CarbonCalculator {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.apiUrl = options.apiUrl || '/api/v1/compliance';
    this.farmId = options.farmId || this.container?.dataset?.farmId;
    this.render();
  }

  render() {
    this.container.innerHTML = `
      <div style="max-width:600px;margin:0 auto;font-family:system-ui;padding:24px;
        background:white;border-radius:16px;box-shadow:0 2px 12px rgba(0,0,0,0.08)">
        <h2 style="color:#1B5E20;margin:0 0 20px">🌿 Carbon Footprint Calculator</h2>
        
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">
          <div>
            <label style="font-size:13px;color:#666;display:block;margin-bottom:4px">Fuel Usage (litres/year)</label>
            <input id="cc-fuel" type="number" value="500" min="0" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:8px">
          </div>
          <div>
            <label style="font-size:13px;color:#666;display:block;margin-bottom:4px">Fertilizer (kg/year)</label>
            <input id="cc-fertilizer" type="number" value="200" min="0" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:8px">
          </div>
          <div>
            <label style="font-size:13px;color:#666;display:block;margin-bottom:4px">Farm Area (hectares)</label>
            <input id="cc-area" type="number" value="10" min="0.1" step="0.1" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:8px">
          </div>
          <div>
            <label style="font-size:13px;color:#666;display:block;margin-bottom:4px">Transport (km/year)</label>
            <input id="cc-transport" type="number" value="5000" min="0" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:8px">
          </div>
        </div>

        <button id="cc-calc" style="width:100%;padding:12px;background:#1B5E20;color:white;border:none;
          border-radius:8px;font-size:16px;cursor:pointer;font-weight:600">Calculate</button>
        
        <div id="cc-results" style="margin-top:20px;display:none">
          <div style="text-align:center;padding:20px;background:#E8F5E9;border-radius:12px;margin-bottom:16px">
            <div style="font-size:36px;font-weight:700;color:#1B5E20" id="cc-total">0</div>
            <div style="color:#666;font-size:14px">kg CO₂e / year</div>
            <div style="color:#888;font-size:12px" id="cc-per-ha"></div>
          </div>
          <div id="cc-breakdown"></div>
        </div>
      </div>`;

    document.getElementById('cc-calc').addEventListener('click', () => this.calculate());
  }

  calculate() {
    const fuel = parseFloat(document.getElementById('cc-fuel').value) || 0;
    const fertilizer = parseFloat(document.getElementById('cc-fertilizer').value) || 0;
    const area = parseFloat(document.getElementById('cc-area').value) || 1;
    const transport = parseFloat(document.getElementById('cc-transport').value) || 0;

    const breakdown = {
      'Machinery (fuel)': Math.round(fuel * 2.68),
      'Fertilizer': Math.round(fertilizer * 6.8),
      'Transport': Math.round(transport * 0.21),
      'Energy (est.)': Math.round(area * 150),
    };

    const total = Object.values(breakdown).reduce((a, b) => a + b, 0);

    document.getElementById('cc-results').style.display = 'block';
    document.getElementById('cc-total').textContent = total.toLocaleString();
    document.getElementById('cc-per-ha').textContent = `${Math.round(total / area)} kg CO₂e per hectare`;

    document.getElementById('cc-breakdown').innerHTML = Object.entries(breakdown).map(([k, v]) => {
      const pct = Math.round(v / total * 100);
      return `<div style="margin-bottom:8px">
        <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:2px">
          <span>${k}</span><span>${v.toLocaleString()} kg (${pct}%)</span>
        </div>
        <div style="height:8px;background:#eee;border-radius:4px;overflow:hidden">
          <div style="height:100%;width:${pct}%;background:#2E7D32;border-radius:4px"></div>
        </div>
      </div>`;
    }).join('');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const el = document.getElementById('agrivision-carbon');
  if (el) window.carbonCalculator = new CarbonCalculator('agrivision-carbon');
});
