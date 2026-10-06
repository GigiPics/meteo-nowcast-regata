// Automatic observations and compact controls. Loaded after the application state.
let measuresDate = todayISO();
let measuresState = {kind:'idle', message:'Fissa il centro campo', stats:null, checkedAt:null};
let measuresRequest = null, measuresTimer = null, measuresGeneration = 0, measuresContext = '';
let manualMeasures = null, draggingCenter = false;
const currwindClient = CurrWind.createClient();

function measuresKey() {
  return areaCenter ? [measuresDate,areaCenter.lat,areaCenter.lng].join('|') : '';
}
function clearMeasurements() {
  jsonData = null;
  jsonLayer.clearLayers();
  document.getElementById('legend').style.display = 'none';
}
function scheduleMeasures() {
  clearTimeout(measuresTimer);
  const key = measuresKey();
  if (key !== measuresContext) {
    measuresContext = key;
    measuresGeneration++;
    measuresRequest?.abort();
    measuresRequest = null;
    clearMeasurements();
    measuresState = {kind:key?'loading':'idle',message:key?'Ricerca automatica…':'Fissa il centro campo',stats:null,checkedAt:null};
    renderOperationalPanel();
  }
  if (key) measuresTimer = setTimeout(() => loadMeasures(), 450);
}
function setMeasuresDate(value) {
  if (!CurrWind.validDate(value)) { renderOperationalPanel(); return; }
  if (value !== measuresDate) manualMeasures = null;
  measuresDate = value;
  scheduleMeasures();
  renderOperationalPanel();
}
async function loadMeasures() {
  clearTimeout(measuresTimer);
  if (!areaCenter || !CurrWind.validDate(measuresDate) || draggingCenter) return;
  const key = measuresKey(), generation = ++measuresGeneration;
  measuresContext = key;
  measuresRequest?.abort();
  const request = new AbortController();
  measuresRequest = request;
  const timeout = setTimeout(() => request.abort(), 20000);
  const center = {lat:areaCenter.lat,lon:areaCenter.lng}, date = measuresDate;
  measuresState = {...measuresState,kind:'loading',message:'Ricerca automatica…'};
  updateMeasuresStatus();
  try {
    const raw = manualMeasures || await currwindClient.readDay(date,request.signal);
    if (generation !== measuresGeneration || key !== measuresKey()) return;
    jsonData = CurrWind.normalize({...raw,center,date});
    if (manualMeasures) jsonData.meta.ingest_source = 'manual_json';
    const stats = jsonData.meta.ingest_stats;
    const count = stats.valid_current + stats.valid_wind;
    measuresState = {kind:count?'ready':'empty',message:count ? `${stats.valid_wind} vento · ${stats.valid_current} corrente · 10 NM` : 'Nessun rilevamento entro 10 NM',stats,checkedAt:new Date().toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'})};
    setStatus('', 'ready');
    await renderJSON();
  } catch (e) {
    if (generation !== measuresGeneration || key !== measuresKey()) return;
    clearMeasurements();
    measuresState = {kind:'error',message:request.signal.aborted?'Connessione scaduta · riprovo automaticamente':'Connessione non disponibile · riprovo automaticamente',detail:e.message,stats:null,checkedAt:null};
    renderOperationalPanel();
  } finally {
    clearTimeout(timeout);
    if (measuresRequest === request) measuresRequest = null;
    updateMeasuresStatus();
  }
}
function updateMeasuresStatus() {
  const el = document.getElementById('measuresStatus');
  if (el) {
    el.dataset.state = measuresState.kind;
    el.textContent = measuresState.message + (measuresDate !== todayISO() ? ' · storico' : '') + (manualMeasures ? ' · file' : '');
  }
  const dialog = document.getElementById('operationDialog');
  const sourceStatus = document.getElementById('sourceMeasuresStatus');
  if (sourceStatus) sourceStatus.textContent = measuresState.message + ' · ' + measuresDate;
  if (dialog.open && dialog.dataset.view === 'measures') {
    // Keep focus on the active button when a background update changes the details.
    const focused = document.activeElement?.id;
    renderOperation('measures');
    if (focused) document.getElementById(focused)?.focus();
  }
}
function resumeAutomaticMeasures() { manualMeasures = null; loadMeasures(); }
function escapeHTML(value) { return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

async function renderJSON() {
  jsonLayer.clearLayers();
  for (const m of jsonData?.markers || []) {
    L.circleMarker([m.lat,m.lon],{radius:9,color:'#F0A500',fillOpacity:.35}).addTo(jsonLayer)
      .bindPopup(`<b>Boa ${escapeHTML(m.zona || '')}</b>`);
  }
  for (const [type,records] of [['Corrente',jsonData?.measurements || []],['Vento',jsonData?.wind || []]]) {
    for (const r of records) {
      if (!CurrWind.validCoords(r.lat,r.lon)) continue;
      const marker = L.circleMarker([r.lat,r.lon],{radius:7,color:type==='Vento'?'#F0A500':'#00B4D8',fillOpacity:.85}).addTo(jsonLayer);
      marker.bindPopup(`<b>${type}</b><br>${escapeHTML(r.speed ?? '—')} ${type==='Vento'?'kt':'m/min'} · ${escapeHTML(r.dir ?? '—')}°<br>${escapeHTML(r.coach || '')} · ${escapeHTML(fmtTs(r.ts))}<br>${Number(r.distance_nm_from_forecast_center).toFixed(2)} NM dal centro`);
    }
  }
  renderOperationalPanel();
}
function renderOperationalPanel() {
  // Do not replace a focused date input during background refreshes.
  if (!document.getElementById('measuresDate')) {
    document.getElementById('bottomPanel').innerHTML = `
      <div class="compact-top">
        <label class="measure-date" for="measuresDate">Data rilevamenti<input id="measuresDate" type="date" onchange="setMeasuresDate(this.value)"></label>
        <div><div id="measuresStatus" role="status" aria-live="polite"></div><span id="statusText" class="status-text"></span></div>
      </div>
      <div class="compact-actions">
        <button class="btn btn-ghost" onclick="openOperation('area')">Campo</button>
        <button class="btn btn-ghost" onclick="openOperation('forecast')">Previsione</button>
        <button class="btn btn-ghost" onclick="openOperation('sources')">Fonti live</button>
        <button class="btn btn-amber" onclick="runNowcast()">Nowcast 60′</button>
      </div>`;
  }
  document.getElementById('measuresDate').value = measuresDate;
  updateMeasuresStatus();
  requestAnimationFrame(refreshMapSize);
}
function refreshOperationalPanel() { renderOperationalPanel(); }
function showAreaPanel() { renderOperationalPanel(); }
function resetBottomPanel() { renderOperationalPanel(); }
function openOperation(view) {
  renderOperation(view);
  const dialog = document.getElementById('operationDialog');
  if (!dialog.open) dialog.showModal();
  if (view === 'sources') loadLocalSources();
}
function closeOperation() { document.getElementById('operationDialog').close(); }
let localSourcesGeneration = 0;
async function loadLocalSources() {
  const generation = ++localSourcesGeneration;
  const key = measuresKey();
  if (!areaCenter) return;
  try {
    const match = await matchVenue({lat:areaCenter.lat,lng:areaCenter.lng});
    const dialog = document.getElementById('operationDialog');
    const host = document.getElementById('localSources');
    if (!host || !dialog.open || dialog.dataset.view !== 'sources' || key !== measuresKey() || generation !== localSourcesGeneration) return;
    const sources = (match.venue?.fonti_live || []).filter(source => {
      try { return ['https:','http:'].includes(new URL(source.url).protocol); } catch { return false; }
    });
    host.innerHTML = sources.length
      ? `<p class="detail-list">${escapeHTML(match.venue.nome)}</p><ul class="live-source-list">${sources.map(source => `<li><a href="${escapeHTML(source.url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(source.nome || 'Apri fonte')}</a><small>${escapeHTML(source.tipo || 'Fonte locale')}</small><p>${escapeHTML(source.uso || '')}</p></li>`).join('')}</ul>`
      : `<p class="detail-list">Nessuna webcam o stazione ancora censita${match.venue ? ' per '+escapeHTML(match.venue.nome) : ' per questo campo'}. Questo non significa che non ne esistano.</p>`;
  } catch {
    const host = document.getElementById('localSources');
    if (host && generation === localSourcesGeneration && key === measuresKey()) host.textContent = 'Elenco fonti non disponibile. Riapri Fonti live per riprovare.';
  }
}
function renderOperation(view) {
  const dialog = document.getElementById('operationDialog');
  dialog.dataset.view = view;
  const titles = {area:'Campo di regata',forecast:'Previsione di riferimento',measures:'Rilevamenti CurrWindNav',sources:'Fonti live e rilevamenti'};
  document.getElementById('operationTitle').textContent = titles[view];
  let html = '';
  if (view === 'area') {
    html = areaCenter ? `<p class="detail-list">Centro: <span id="centerVal">${fmtCoord(areaCenter.lat,'N','S')} ${fmtCoord(areaCenter.lng,'E','W')}</span></p>
      <div class="radius-row"><span>Raggio campo</span><button class="rstep" onclick="setRadius(-1)" aria-label="Riduci raggio">−</button><span id="radiusVal">${fmtRadiusKm()}</span><button class="rstep" onclick="setRadius(1)" aria-label="Aumenta raggio">+</button></div>
      <p class="detail-list">La ricerca dei rilevamenti copre sempre 10 NM dal centro, indipendentemente dal raggio del campo.</p>
      <div class="secondary-actions"><button class="btn btn-accent" onclick="closeOperation();startDraw()">Sposta centro</button><button class="btn btn-ghost" onclick="closeOperation();clearArea()">Rimuovi campo</button></div>` : '<p class="detail-list">Indica il centro geografico del campo: la ricerca partirà automaticamente.</p><button class="btn btn-accent" onclick="closeOperation();startDraw()">Fissa centro sulla mappa</button>';
  } else if (view === 'forecast') {
    html = activeForecastCard() + `<p class="detail-list">${forecastContext?.event?.valid_date !== measuresDate ? 'La data della previsione non coincide con quella dei rilevamenti.' : 'Data coerente con i rilevamenti selezionati.'}</p>
      <button class="btn btn-ghost" onclick="closeOperation();document.getElementById('screenshotInput').click()">Carica screenshot meteo</button>`;
  } else if (view === 'sources') {
    html = `<h3>CurrWindNav · entro 10 NM</h3><p class="detail-list" id="sourceMeasuresStatus">${escapeHTML(measuresState.message)} · ${measuresDate}</p>
      <div class="secondary-actions"><button class="btn btn-accent" onclick="openOperation('measures')">Vedi rilevamenti</button><a class="btn btn-ghost" href="https://currwindnav-web.vercel.app/" target="_blank" rel="noopener noreferrer">Apri CurrWindNav ↗</a></div>
      <h3 style="margin-top:22px">Webcam e stazioni locali</h3><div id="localSources"><p class="detail-list">${areaCenter ? 'Cerco le fonti censite per il campo…' : 'Fissa il centro campo sulla mappa per vedere le fonti della zona.'}</p></div>
      <p class="detail-list">I link aprono i siti delle fonti. Immagini e valori delle stazioni non vengono importati automaticamente: verifica orario, esposizione e distanza dal campo.</p>
      <button class="btn btn-ghost" onclick="closeOperation();openObs()">Annota una misura dalla stazione</button>`;
  } else {
    const st = measuresState.stats;
    html = `<p class="detail-list">${escapeHTML(measuresState.message)}<br>Data: ${measuresDate}${measuresState.checkedAt ? '<br>Ultimo controllo: '+measuresState.checkedAt : ''}</p>
      ${st ? `<p class="detail-list">Grezzi: ${st.raw_wind} vento · ${st.raw_current} corrente<br>Duplicati: ${st.duplicates_removed}<br>Senza coordinate valide: ${st.no_coordinates}<br>Fuori 10 NM: ${st.out_of_range}<br>Data diversa: ${st.wrong_date}<br>Record illeggibili: ${st.invalid_records}<br>Validi: ${st.valid_wind} vento · ${st.valid_current} corrente</p>` : ''}
      <p class="detail-list">${manualMeasures ? 'Fonte: file JSON importato. Riprendi automatico per tornare ai dati online.' : 'Aggiornamento ogni 2 minuti con l’app visibile.'} Il centro campo e la data determinano quali osservazioni usare. I dati storici sono consultabili sulla mappa e non alimentano il nowcast attuale.</p>
      <div class="secondary-actions"><button id="retryMeasures" class="btn btn-ghost" onclick="resumeAutomaticMeasures()">${manualMeasures?'Riprendi automatico':'Riprova ora'}</button><button id="manualObservation" class="btn btn-ghost" onclick="closeOperation();openObs()">Osservazione manuale</button><button id="importMeasures" class="btn btn-ghost" onclick="closeOperation();document.getElementById('fileInput').click()">Importa JSON</button></div>`;
  }
  document.getElementById('operationBody').innerHTML = html;
}

// Poll only while visible. Never infer a race area from the observations being filtered.
loadObsLog();
restoreArea();
renderOperationalPanel();
scheduleMeasures();
loadLatestForecastContext();
setInterval(() => { if (!document.hidden && !manualMeasures && !measuresRequest && !phase && !draggingCenter) loadMeasures(); }, 120000);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { clearTimeout(measuresTimer); measuresGeneration++; measuresRequest?.abort(); measuresRequest = null; }
  else if (!manualMeasures) scheduleMeasures();
});
window.addEventListener('online', () => { if (!document.hidden && !manualMeasures) scheduleMeasures(); });
