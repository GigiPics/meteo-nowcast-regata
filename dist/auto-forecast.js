// Follow the active forecast's revisions without replacing a manual selection.
let forecastRefreshBusy = false;
let forecastManualSelection = false;
const originalSelectForecast = selectForecast;
selectForecast = async function(path) {
  forecastManualSelection = true;
  return originalSelectForecast(path);
};

async function refreshPublishedForecast() {
  if (document.hidden || forecastRefreshBusy || nowcastBusy) return;
  forecastRefreshBusy = true;
  try {
    const response = await fetch('data/forecast_index.json', {cache:'no-store'});
    if (!response.ok) return;
    const index = await response.json();
    if (!Array.isArray(index.forecasts)) return;
    forecastIndex = index.forecasts;
    updateLatestReport(index);
    const center = nowcastCenter();
    const matching = forecastIndex.find(item => {
      const fc = item.forecast_center;
      return (item.date || item.valid_date) === measuresDate && center &&
        CurrWind.validCoords(fc?.lat,fc?.lon) &&
        CurrWind.distance({lat:center.lat,lon:center.lng},fc) <= 10;
    });
    const selected = forecastManualSelection
      ? forecastIndex.find(item => item.path === activeForecastPath)
      : matching || forecastIndex.find(item => item.path === activeForecastPath);
    if (!selected) return;
    const result = await fetch(selected.path, {cache:'no-store'});
    if (!result.ok) return;
    const next = await result.json();
    if (next.schema_version !== 'forecast_context.v1' || !next.event || !next.wind) return;
    if (JSON.stringify(next) === JSON.stringify(forecastContext)) return;
    activeForecastPath = selected.path;
    forecastContext = next;
    refreshOperationalPanel();
    const dialog = document.getElementById('operationDialog');
    if (dialog?.open && dialog.dataset.view === 'forecast') renderOperation('forecast');
    showToast('Previsione ufficiale aggiornata', 3000);
  } catch (error) {
    // Offline or invalid response: retain the last successfully loaded forecast.
  } finally { forecastRefreshBusy = false; }
}
setInterval(refreshPublishedForecast, 120000);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) refreshPublishedForecast();
});
window.addEventListener('online', refreshPublishedForecast);

// Report consultation is independent from the manually selected nowcast baseline.
let latestReport = null;
function updateLatestReport(index) {
  latestReport = index.forecasts.filter(item => Number.isFinite(Date.parse(item.issued_at)))
    .sort((a,b) => Date.parse(b.issued_at) - Date.parse(a.issued_at))[0] || null;
  renderLatestForecastHTML();
}
function availableLatestReport(now = Date.now()) {
  const issued = Date.parse(latestReport?.issued_at);
  const path = latestReport?.linked_report_html;
  // Only locally published HTML reports may be embedded or linked here.
  if (!Number.isFinite(issued) || now < issued || now >= issued + 86400000 ||
      typeof path !== 'string' || !/^reports\/[a-zA-Z0-9_./-]+\.html$/.test(path) || path.split('/').includes('..')) return null;
  return {...latestReport, expires: issued + 86400000};
}
function renderLatestForecastHTML() {
  const host = document.getElementById('latestForecastHTML');
  if (!host) return;
  const report = availableLatestReport();
  const signature = report ? report.linked_report_html + report.revision + report.issued_at : 'expired';
  if (host.dataset.signature === signature) return;
  host.dataset.signature = signature;
  if (!report) {
    host.innerHTML = '<p class="detail-list">Nessun report HTML prodotto nelle ultime 24 ore. La previsione di riferimento resta consultabile qui sotto.</p>';
    return;
  }
  const url = report.linked_report_html + '?v=' + encodeURIComponent(report.revision || report.issued_at);
  const expires = new Date(report.expires).toLocaleString('it-IT', {day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
  host.innerHTML = `<a class="btn btn-accent forecast-report-link" href="${url}" target="_blank" rel="noopener noreferrer">Apri ultimo forecast HTML ↗</a>
    <p class="detail-list">${escapeHTML(report.label || 'Ultima previsione')}<br>Visibile qui fino al ${expires}. La finestra meteo è quella indicata nel report.</p>
    <iframe class="forecast-report-frame" title="Ultima previsione completa in HTML" sandbox="" src="${url}"></iframe>`;
}
setInterval(renderLatestForecastHTML, 30000);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) renderLatestForecastHTML();
});
