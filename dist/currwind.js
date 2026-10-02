/* CurrWindNav: read-only daily import. No observations or tokens are persisted. */
(function (root) {
  'use strict';
  const database = 'https://currwindnav-60ee3-default-rtdb.europe-west1.firebasedatabase.app';
  const apiKey = 'AIzaSyB1OGhoWw1CsKoH78VJGDwBzjXZBp2dXso'; // public CurrWindNav config
  const validCoords = (lat, lon) => Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
  const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value) && !isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
  function distance(a, b) {
    const rad = x => x * Math.PI / 180;
    const s = Math.sin(rad(b.lat-a.lat)/2)**2 + Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(rad(b.lon-a.lon)/2)**2;
    return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, s))) / 1.852;
  }
  function coords(r, type) {
    if (type === 'wind') return validCoords(r.lat, r.lon) ? {lat:r.lat, lon:r.lon, coord_source:'latlon'} : null;
    if (validCoords(r.midLat, r.midLon)) return {lat:r.midLat, lon:r.midLon, coord_source:'midLat_midLon'};
    if (!validCoords(r.lat1, r.lon1) || !validCoords(r.lat2, r.lon2)) return null;
    const delta = ((r.lon2-r.lon1+540)%360)-180;
    return {lat:(r.lat1+r.lat2)/2, lon:((r.lon1+delta/2+540)%360)-180, coord_source:'midpoint'};
  }
  function normalize({sessioni, venti, markers, center, date}) {
    if (!validDate(date) || !validCoords(center?.lat, center?.lon)) throw new Error('Data o centro campo non valido');
    const stats = {raw_current:0, raw_wind:0, duplicates_removed:0, invalid_records:0, no_coordinates:0, out_of_range:0, wrong_date:0, valid_current:0, valid_wind:0, radius_nm:10, center:{...center}, date};
    const seen = new Set();
    function list(source, type) {
      const result = [];
      for (const raw of Object.values(source || {})) {
        stats['raw_'+type]++;
        let r;
        try { r = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { stats.invalid_records++; continue; }
        if (!r || typeof r !== 'object' || Array.isArray(r)) { stats.invalid_records++; continue; }
        const c = coords(r, type);
        const ts = r.ts ?? r.timestamp ?? r.time;
        const speed = type === 'wind' ? (r.spd ?? r.speed) : r.speed;
        const key = r.id != null && r.id !== '' ? `${type}|id:${r.id}` : JSON.stringify([type,ts,c?.lat,c?.lon,r.dir,speed]);
        if (seen.has(key)) { stats.duplicates_removed++; continue; }
        seen.add(key);
        if (!c) { stats.no_coordinates++; continue; }
        // The Firebase node uses local calendar dates; never convert offset timestamps to UTC dates.
        const recordDate = typeof ts === 'string' && /^\d{4}-\d{2}-\d{2}/.test(ts) ? ts.slice(0,10) : null;
        if (recordDate && recordDate !== date) { stats.wrong_date++; continue; }
        const nm = distance(center,c);
        if (nm > 10 + 1e-9) { stats.out_of_range++; continue; }
        result.push({...r,...c,ts,speed,observed_type:type,distance_nm_from_forecast_center:nm,distance_km_from_forecast_center:nm*1.852});
      }
      stats['valid_'+type] = result.length;
      return result;
    }
    const measurements = list(sessioni, 'current'), wind = list(venti, 'wind');
    const fieldMarkers = Object.values(markers || {}).filter(m => m && validCoords(m.lat,m.lon) && distance(center,m) <= 10);
    return {type:'currwind_export',version:1,meta:{from:date,to:date,ingest_source:'direct_currwindnav_firebase',ingest_stats:stats,speed_unit:'mt_min',wind_speed_unit:'kn'},markers:fieldMarkers,measurements,wind};
  }
  function createClient(fetcher = root.fetch.bind(root)) {
    let auth = null, login = null;
    async function token() {
      if (auth && Date.now() < auth.expires) return auth.idToken;
      if (!login) login = (async () => {
        const refresh = auth?.refreshToken;
        const response = await fetcher(refresh ? `https://securetoken.googleapis.com/v1/token?key=${apiKey}` : `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`, {
          method:'POST', headers:{'Content-Type':'application/json'},
          body:JSON.stringify(refresh ? {grant_type:'refresh_token',refresh_token:refresh} : {returnSecureToken:true}), signal:AbortSignal.timeout(15000)
        });
        if (!response.ok) throw new Error('Accesso CurrWindNav non disponibile');
        const data = await response.json();
        auth = {idToken:data.idToken || data.id_token, refreshToken:data.refreshToken || data.refresh_token, expires:Date.now() + (Number(data.expiresIn || data.expires_in)-60)*1000};
        if (!auth.idToken) throw new Error('Autenticazione CurrWindNav incompleta');
        return auth.idToken;
      })().finally(() => { login = null; });
      return login;
    }
    async function read(node, date, signal) {
      const url = `${database}/${node}/${date}.json`;
      let response = await fetcher(url, {cache:'no-store',signal});
      if (response.status === 401 || response.status === 403) {
        const idToken = await token();
        if (signal?.aborted) throw new DOMException('Aborted','AbortError');
        response = await fetcher(`${url}?auth=${encodeURIComponent(idToken)}`,{cache:'no-store',signal});
      }
      if (!response.ok) throw new Error(`Lettura ${node} non disponibile (HTTP ${response.status})`);
      const data = await response.json();
      if (data !== null && (typeof data !== 'object' || data.error)) throw new Error(`Risposta ${node} non valida`);
      return data;
    }
    return {async readDay(date, signal) {
      if (!validDate(date)) throw new Error('Data non valida');
      const [sessioni,venti] = await Promise.all([read('sessioni',date,signal),read('venti',date,signal)]);
      return {sessioni,venti};
    }};
  }
  root.CurrWind = {normalize,validCoords,validDate,distance,createClient};
})(globalThis);
