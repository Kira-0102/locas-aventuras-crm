export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Solo POST' });

  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(500).json({ error: 'GEMINI_API_KEY no configurada en Vercel' });

  try {
    const { messages, context } = req.body;
    if (!messages || !messages.length) return res.status(400).json({ error: 'Sin mensajes' });

    const systemPrompt = `Eres el asistente inteligente del CRM de Locas Aventuras, empresa de excursiones en Republica Dominicana.
Tienes acceso a los datos del CRM en tiempo real. Aqui estan:

${context || '{}'}

REGLAS:
- Responde en español, breve y directo (maximo 150 palabras).
- Usa numeros concretos de los datos, no inventes.
- Si te piden un mensaje para WhatsApp, redactalo listo para copiar y pegar.
- Usa **negritas** para datos importantes.
- Si no tienes la info, dilo honestamente.
- Moneda: RD$ (pesos dominicanos).
- Nombre del negocio: Locas Aventuras.
- No uses emojis excesivos, maximo 1-2 por respuesta.`;

    // Construir el contenido para Gemini
    const contents = [];
    
    // System prompt como primer mensaje del usuario
    contents.push({
      role: 'user',
      parts: [{ text: systemPrompt }]
    });
    contents.push({
      role: 'model',
      parts: [{ text: 'Entendido. Tengo acceso a los datos del CRM. ¿En qué puedo ayudarte?' }]
    });

    // Historial de conversación
    messages.forEach(m => {
      contents.push({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      });
    });

    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          generationConfig: {
            maxOutputTokens: 800,
            temperature: 0.7,
          }
        })
      }
    );

    const data = await resp.json();
    
    if (data.error) {
      return res.status(500).json({ error: data.error.message || 'Error de Gemini' });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No pude generar una respuesta.';
    return res.status(200).json({ text });

  } catch (e) {
    return res.status(500).json({ error: e.message || 'Error interno' });
  }
}
