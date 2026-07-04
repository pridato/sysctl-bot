import 'dotenv/config';
import { GoogleGenAI }                           from '@google/genai';
import axios                                     from 'axios';
import { saveOuraMetrics, getHistoricalMetrics } from './database.js';
import { fetchOuraMetrics }                      from './oura.js';

const { TELEGRAM_TOKEN, TELEGRAM_CHAT_ID, GEMINI_API_KEY, OURA_PERSONAL_TOKEN } = process.env;
const urlTelegram = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;

async function runPipeline() {
  try {
    const today = new Date().toISOString().split('T')[0];

    console.log('[1/3] getting historical metrics');
    const metrics = await fetchOuraMetrics(OURA_PERSONAL_TOKEN, today);
    console.log(metrics);
    saveOuraMetrics(metrics);
    const historical = getHistoricalMetrics(7);

    console.log('[2/3] generating prompt ');
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    
    const dayLabel = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' });

    const prompt = `
      Eres el núcleo lógico de sysctl_david_bot. Tu objetivo es generar un reporte matutino ultra-compacto, directo, técnico y sin rodeos literarios.

      Analiza los datos actuales y el histórico de Oura:
      - Datos de hoy: ${JSON.stringify(metrics)}
      - Histórico (últimos días para calcular medias): ${JSON.stringify(historical)}

      REGLAS DE FORMATO ESTRICTAS:
      1. Devuelve la respuesta utilizando formato HTML plano válido para Telegram (usa <b>, <i>, <code> si es necesario).
      2. Está PROHIBIDO usar Markdown (no uses asteriscos, guiones bajos ni hashes ###).
      3. Sé extremadamente conciso. Imita exactamente la estructura del siguiente ejemplo:

      ⚡ ${dayLabel}
      📊 Telemetría
      HRV   [Valor_HRV]  (media 7d: [Media_HRV])  [Porcentaje_%_vs_media]
      RHR   [Valor_RHR]  (media 7d: [Media_RHR])  [Porcentaje_%_vs_media]
      Temp   [Valor_Temp]°C  ·  Ready  [Valor_Readiness]
      🧠 Diagnóstico
      [Breve diagnóstico del estado general basado en HRV, sueño y readiness: Ej. buena recuperación / fatiga acumulada / estado neutro]. [Explicación técnica corta de qué indican esos valores].
      → [Recomendación genérica de carga para hoy: entrenar con normalidad, bajar intensidad, o priorizar descanso].
    `;

    const apiResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    const responseText = apiResponse.text.trim();

    console.log('\n[3/3] sending message on telegram');
    const payload = {
      chat_id: TELEGRAM_CHAT_ID,
      text: responseText,
      parse_mode: "HTML"
    };
    await axios.post(urlTelegram, payload);

  } catch(error) {
    console.error(error);
  }
}

runPipeline();
