// Vercel Serverless Function — proxy per Claude API (Anthropic Messages API).
//
// Perché serve: il browser non può chiamare direttamente api.anthropic.com per
// via del CORS. Questo proxy inoltra la richiesta lato server.
//
// Chiave API: la PWA la salva in localStorage e la invia nell'header
// `x-api-key` a ogni richiesta (nessuna chiave è hard-coded qui). In alternativa,
// se imposti la env var ANTHROPIC_API_KEY su Vercel, viene usata quella e la
// chiave non lascia mai il server.
//
// STREAMING: se il payload contiene `stream: true`, la risposta di Anthropic è
// SSE e va inoltrata a pezzi mentre arriva. Bufferizzarla con response.text()
// annullerebbe il vantaggio: il client aspetterebbe comunque la fine. Il client
// sa degradare da solo se questo proxy (o una CDN in mezzo) bufferizza lo stesso.
//
// Endpoint: POST /api/anthropic   con body = payload Messages API.

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

export default async function handler(req, res) {
  // CORS (utile se la PWA è servita da un dominio diverso dal proxy)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key, anthropic-version');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ANTHROPIC_API_KEY || req.headers['x-api-key'];
  if (!apiKey) {
    return res.status(401).json({ error: 'Chiave API mancante (header x-api-key o env ANTHROPIC_API_KEY).' });
  }

  try {
    const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

    let wantsStream = false;
    try { wantsStream = JSON.parse(body).stream === true; } catch { /* body non JSON: nessuno stream */ }

    const upstream = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': req.headers['anthropic-version'] || ANTHROPIC_VERSION,
      },
      body,
    });

    // ── Percorso non-streaming: come prima, risposta unica ──
    if (!wantsStream || !upstream.ok || !upstream.body) {
      const text = await upstream.text();
      res.status(upstream.status);
      res.setHeader('content-type', upstream.headers.get('content-type') || 'application/json');
      return res.send(text);
    }

    // ── Percorso streaming: inoltra i chunk man mano ──
    res.status(upstream.status);
    res.setHeader('content-type', upstream.headers.get('content-type') || 'text/event-stream');
    res.setHeader('cache-control', 'no-cache, no-transform');
    res.setHeader('x-accel-buffering', 'no');   // disattiva il buffering di eventuali proxy nginx
    if (typeof res.flushHeaders === 'function') res.flushHeaders();

    const reader = upstream.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(Buffer.from(value));
      if (typeof res.flush === 'function') res.flush();
    }
    return res.end();
  } catch (err) {
    // Se l'errore arriva a stream già iniziato non si può più cambiare lo status.
    if (res.headersSent) { try { res.end(); } catch {} return; }
    return res.status(502).json({ error: 'Errore proxy Anthropic', detail: String(err) });
  }
}
