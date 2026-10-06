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
