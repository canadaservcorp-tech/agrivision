const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPTS = {
  en: `You are Agrivision Agricultural Advisor, an expert AI assistant for farmers. You provide practical, actionable advice on crop management, disease prevention, pest control, irrigation, soil health, and regulatory compliance.

Context rules:
- Always give specific, practical recommendations
- Reference local climate and soil conditions when available
- Warn about risks from current weather forecasts when relevant
- Suggest organic/sustainable alternatives when applicable
- If you don't know something specific to the farmer's region, say so
- Keep responses concise but thorough
- For disease identification, recommend confirming with the Agrivision camera module`,

  fr: `Vous êtes le Conseiller Agricole Agrivision, un assistant IA expert pour les agriculteurs. Vous fournissez des conseils pratiques et concrets sur la gestion des cultures, la prévention des maladies, la lutte antiparasitaire, l'irrigation, la santé des sols et la conformité réglementaire.

Règles:
- Donnez toujours des recommandations spécifiques et pratiques
- Référencez les conditions climatiques et pédologiques locales si disponibles
- Avertissez des risques liés aux prévisions météorologiques actuelles
- Suggérez des alternatives biologiques/durables quand applicable
- Si vous ne connaissez pas quelque chose de spécifique, dites-le
- Gardez les réponses concises mais complètes`,

  ar: `أنت مستشار Agrivision الزراعي، مساعد ذكاء اصطناعي خبير للمزارعين. تقدم نصائح عملية وقابلة للتنفيذ حول إدارة المحاصيل والوقاية من الأمراض ومكافحة الآفات والري وصحة التربة والامتثال التنظيمي.`,

  tr: `Siz Agrivision Tarım Danışmanısınız, çiftçiler için uzman bir yapay zeka asistanısınız. Ürün yönetimi, hastalık önleme, zararlı kontrolü, sulama, toprak sağlığı ve mevzuata uyum konularında pratik ve uygulanabilir tavsiyeler sunarsınız.`
};

class AdvisoryService {

  async getResponse(messages, farmContext, language = 'en') {
    try {
      // Build system prompt with farm context
      let systemPrompt = SYSTEM_PROMPTS[language] || SYSTEM_PROMPTS.en;

      if (farmContext) {
        systemPrompt += `\n\nCurrent farm context:
- Farm: ${farmContext.farm_name} (${farmContext.farm_code})
- Location: ${farmContext.region}, ${farmContext.country_code}
- Area: ${farmContext.total_area_ha} hectares
- Primary crops: ${(farmContext.primary_crops || []).join(', ')}
- Soil type: ${farmContext.soil_type || 'unknown'}
- Climate zone: ${farmContext.climate_zone || 'unknown'}`;

        if (farmContext.latest_forecast?.risk_scores) {
          const risks = farmContext.latest_forecast.risk_scores;
          systemPrompt += `\n\nCurrent weather risks:
- Frost: ${Math.round(risks.frost_risk * 100)}%
- Drought: ${Math.round(risks.drought_risk * 100)}%
- Flood: ${Math.round(risks.flood_risk * 100)}%
- Heat stress: ${Math.round(risks.heat_stress_risk * 100)}%
- Disease conditions: ${Math.round(risks.disease_risk * 100)}%`;
        }

        if (farmContext.active_anomalies?.length) {
          systemPrompt += `\n\nActive alerts: ${farmContext.active_anomalies.map(
            a => `${a.severity.toUpperCase()} ${a.anomaly_type}: ${a.description}`
          ).join('; ')}`;
        }
      }

      // Format messages for Claude API
      const apiMessages = messages
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => ({ role: m.role, content: m.content }));

      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: systemPrompt,
        messages: apiMessages
      });

      const text = response.content
        .filter(block => block.type === 'text')
        .map(block => block.text)
        .join('\n');

      // Extract topic from first exchange
      let topic = null;
      if (messages.length <= 2) {
        topic = messages[0]?.content?.substring(0, 100);
      }

      return {
        text,
        tokens: response.usage?.input_tokens + response.usage?.output_tokens || 0,
        topic,
        sources: [],
        actions: this.extractActions(text)
      };
    } catch (err) {
      console.error('Advisory AI error:', err);
      
      // Fallback response
      const fallbacks = {
        en: 'I apologize, I\'m temporarily unable to process your question. Please try again in a moment, or contact support.',
        fr: 'Désolé, je ne peux temporairement pas traiter votre question. Veuillez réessayer dans un moment.',
        ar: 'عذراً، لا أستطيع معالجة سؤالك مؤقتاً. يرجى المحاولة مرة أخرى.',
        tr: 'Özür dilerim, sorunuzu geçici olarak işleyemiyorum. Lütfen biraz sonra tekrar deneyin.'
      };

      return {
        text: fallbacks[language] || fallbacks.en,
        tokens: 0,
        topic: null,
        sources: [],
        actions: []
      };
    }
  }

  extractActions(text) {
    const actions = [];
    const actionKeywords = [
      { pattern: /spray|appliqu|pulvéris/i, action: 'schedule_spraying' },
      { pattern: /irrigat|arros|water/i, action: 'adjust_irrigation' },
      { pattern: /harvest|récolt|récolte/i, action: 'plan_harvest' },
      { pattern: /test|analys|soil sample/i, action: 'order_soil_test' },
      { pattern: /camera|scan|photo|image/i, action: 'trigger_camera_scan' },
      { pattern: /alert|warn|monitor/i, action: 'set_monitoring_alert' }
    ];

    actionKeywords.forEach(({ pattern, action }) => {
      if (pattern.test(text)) actions.push(action);
    });

    return [...new Set(actions)];
  }
}

module.exports = new AdvisoryService();
