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
    saveOuraMetrics(metrics);
    const historical = getHistoricalMetrics(7);

    console.log('[2/3] generating prompt ');
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    
    const dayLabel = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' });
    const promptMetrics = {
      ...metrics,
      activityData: Array.isArray(metrics.activityData) ? metrics.activityData.slice(0, 5) : metrics.activityData,
      stressData: Array.isArray(metrics.stressData) ? metrics.stressData.slice(0, 5) : metrics.stressData,
      workoutData: Array.isArray(metrics.workoutData) ? metrics.workoutData.slice(0, 5) : metrics.workoutData
    };

        const prompt = `
      Eres el núcleo lógico de sysctl_david_bot, un sistema experto en optimización del rendimiento humano, neurobiología aplicada al desarrollo de software y recuperación en deportes de contacto (boxeo).

        PERFIL Y OBJETIVOS DEL USUARIO:
        1. Rendimiento Laboral/Académico: Alta carga cognitiva, programación (Full-Stack), retención de conceptos complejos. Requiere optimizar el sueño REM y enfoque matutino.
        2. Constancia en Boxeo: Entrenamiento de alta intensidad que demanda una recuperación óptima del Sistema Nervioso Central (SNC) para evitar lesiones y sobreentrenamiento.
        3. Higiene del Sueño: El usuario duerme actualmente una media crítica de ~6:15 - 6:30 horas. El objetivo prioritario es aumentar el tiempo total de sueño y estabilizar la consistencia.

        MÉTRICAS DE ENTRADA:
        - Telemetría de Hoy: ${JSON.stringify(promptMetrics)}
        - Histórico Reciente: ${JSON.stringify(historical)}

        REGLAS DE FORMATO ESTRICTAS (TELEGRAM HTML):
        - Usa exclusivamente tags HTML válidos (<b>, <i>, <code>). Prohibido Markdown.
        - Sé directo, técnico, analítico y punzante. Sin rodeos motivacionales.

        ESTRUCTURA OBLIGATORIA DEL MENSAJE:

        ⚡ <b>SYSCTL REPORT · ${dayLabel}</b>
        
        📊 <b>MÉTRICAS CLAVE</b>
        • Tiempo Total Sueño: <code>[Horas:Minutos]</code> (Objetivo: >7:30h)
        • HRV: <code>[Valor] ms</code> (Línea base: [Media_HRV]ms)
        • RHR: <code>[Valor] lpm</code> (Línea base: [Media_RHR]lpm)
        • Eficiencia de Sueño: <code>[Valor]%</code>

        🧠 <b>ANÁLISIS COGNITIVO (Trabajo/Estudio)</b>
        [Analiza el sueño REM, la latencia, la eficiencia, el estrés diario y la recuperación nocturna. Determina el estado de la corteza prefrontal para afrontar tareas complejas de programación hoy. Si el sueño es < 6:30h o el estrés está alto, advierte sobre la degradación del foco y el riesgo de cometer errores de sintaxis o lógica].

        🥊 <b>ESTADO DEL SNC (Boxeo)</b>
        [Analiza HRV, sueño profundo, carga de actividad, estrés diario y workouts recientes. Cruza estos datos con el esfuerzo de los días anteriores. Dictamina si el sistema neuromuscular está listo para un entrenamiento explosivo de boxeo o si el riesgo de fatiga de reacción es alto].

        📈 <b>ACCIÓN RECOMENDADA PARA CORREGIR EL SUEÑO</b>
        → [Da una sola instrucción hiper-concreta para la noche de hoy que ataque el problema de las 6:15 horas de sueño. Si hay workouts o estrés altos, prioriza recuperación sobre intensidad. Ej: "Hoy la eficiencia bajó al X%. Para compensar el déficit y llegar a las 7h reales, adelanta el toque de queda digital 30 min e ingresa a la cama estrictamente a las Y horas"].
      REGLAS DE FORMATO ESTRICTAS:
      1. Devuelve la respuesta utilizando formato HTML plano válido para Telegram.
      2. Solo están permitidas las etiquetas: <b>, <i>, <code>, <a>, <strong>, <em>.
      3. Está TOTALMENTE PROHIBIDO usar la etiqueta <br> o <br />. Para los saltos de línea, usa saltos de línea reales (intros o \n) en el texto de tu respuesta.
      4. Está PROHIBIDO usar Markdown (no uses asteriscos, guiones bajos ni hashes ###).
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
