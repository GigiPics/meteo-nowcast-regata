// Vercel Serverless Function — marea per QUALUNQUE località.
//
// Due dati distinti:
//  1) COEFFICIENTE DI MAREA: valore astronomico (riferito a Brest) ~uguale in
//     tutto il mondo nella stessa data. Lo prendo da una stazione fissa di
//     tides4fishing → vale ovunque senza mappare le località. (Scraping: se il
//     sito cambia HTML va aggiornato il parsing; degrada a null.)
//  2) TABELLE LOCALI (alte/basse con orari e altezze): dipendono dal luogo →
//     WorldTides API per lat/lon. Richiede env var WORLDTIDES_KEY su Vercel.
//
// Uso: GET /api/tide?lat=40.66&lon=14.75

const COEF_STATION = 'https://tides4fishing.com/it/campania/salerno'; // stazione fissa per il coefficiente globale

function scalaFromCoef(c) {
  if (c == null) return null;
  return c >= 95 ? 'molto alto' : c >= 70 ? 'alto' : c >= 40 ? 'medio' : 'basso';
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const lat = parseFloat(req.query.lat);
  const lon = parseFloat(req.query.lon);
  const out = { coefficient: null, scala: null, tides: null, range_m: null, fonte: {} };

  // 1) Coefficiente astronomico (globale) — stazione fissa
  try {
    const r = await fetch(COEF_STATION, {
      headers: { 'user-agent': 'Mozilla/5.0 (compatible; SailWeather/1.0)', 'accept-language': 'it-IT,it;q=0.9' },
    });
    if (r.ok) {
      const html = await r.text();
      const m = html.match(/txt_coeficiente_valor['"]>\s*(\d{1,3})\s*</);
      if (m) { out.coefficient = Number(m[1]); out.scala = scalaFromCoef(out.coefficient); out.fonte.coefficiente = 'tides4fishing'; }
    }
  } catch { /* degrada: coefficient resta null */ }

  // 2) Tabelle locali via WorldTides (serve la chiave)
  const key = process.env.WORLDTIDES_KEY;
  if (key && isFinite(lat) && isFinite(lon)) {
    try {
      const url = `https://www.worldtides.info/api/v3?extremes&lat=${lat}&lon=${lon}&days=1&key=${encodeURIComponent(key)}`;
      const wt = await fetch(url).then(r => r.json());
      if (wt && Array.isArray(wt.extremes) && wt.extremes.length) {
        out.tides = wt.extremes.map(e => ({
          type: /high/i.test(e.type) ? 'alta' : 'bassa',
          time: e.date,                                   // ISO (UTC) — formattato lato client
          height: Math.round(e.height * 100) / 100,       // metri sul datum WorldTides
        }));
        const highs = wt.extremes.filter(e => /high/i.test(e.type)).map(e => e.height);
        const lows  = wt.extremes.filter(e => /low/i.test(e.type)).map(e => e.height);
        if (highs.length && lows.length) out.range_m = Math.round((Math.max(...highs) - Math.min(...lows)) * 100) / 100;
        out.fonte.tabelle = 'worldtides';
      } else if (wt && wt.error) {
        out.wt_error = wt.error;                           // es. chiave non valida / crediti esauriti
      }
    } catch (e) { out.wt_error = String(e); }
  } else if (!key) {
    out.wt_note = 'WORLDTIDES_KEY non impostata: coefficiente ok, tabelle locali assenti.';
  }

  res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=1800');
  return res.status(200).json(out);
}
