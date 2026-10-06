const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const code = fs.readFileSync(path.join(__dirname, '../dist/auto-forecast.js'), 'utf8');
function setup() {
  const host = {dataset:{},innerHTML:''};
  const ctx = vm.createContext({document:{addEventListener(){},getElementById:()=>host},window:{addEventListener(){}},setInterval(){},selectForecast(){},escapeHTML:s=>String(s).replaceAll('<','&lt;').replaceAll('>','&gt;')});
  vm.runInContext(code,ctx);
  return {ctx,host};
}
const report = {issued_at:'2026-10-06T09:51:13+02:00',linked_report_html:'reports/day/forecast.html',revision:'a',label:'Poetto'};
test('report available for exactly 24 hours, including across midnight',()=>{
  const {ctx}=setup();
  ctx.updateLatestReport({forecasts:[report]});
  const issued=Date.parse(report.issued_at);
  assert.equal(ctx.availableLatestReport(issued-1),null);
  assert.ok(ctx.availableLatestReport(issued));
  assert.ok(ctx.availableLatestReport(issued+86400000-1));
  assert.equal(ctx.availableLatestReport(issued+86400000),null);
});
test('latest production wins over forecast date; missing timestamp and unsafe paths are excluded',()=>{
  const {ctx}=setup();
  ctx.updateLatestReport({forecasts:[{...report,issued_at:'2026-10-05T09:00:00+02:00',date:'2026-10-10'},report]});
  assert.equal(ctx.availableLatestReport(Date.parse(report.issued_at)).revision,'a');
  for(const linked_report_html of ['https://example.com/report.html','reports/../index.html','javascript:alert(1)']) {
    ctx.updateLatestReport({forecasts:[{...report,linked_report_html}]});
    assert.equal(ctx.availableLatestReport(Date.parse(report.issued_at)),null);
  }
  ctx.updateLatestReport({forecasts:[{...report,issued_at:undefined}]});
  assert.equal(ctx.availableLatestReport(),null);
});
test('popup embeds HTML and provides link, then removes both after expiry',()=>{
  const {ctx,host}=setup();
  ctx.updateLatestReport({forecasts:[{...report,issued_at:new Date(Date.now()-1000).toISOString()}]});
  assert.match(host.innerHTML,/<iframe/);
  assert.match(host.innerHTML,/href="reports\/day\/forecast.html\?v=a"/);
  assert.match(host.innerHTML,/sandbox=""/);
  const previous=host.innerHTML;
  ctx.renderLatestForecastHTML();
  assert.equal(host.innerHTML,previous);
  ctx.updateLatestReport({forecasts:[{...report,issued_at:new Date(Date.now()-86400001).toISOString()}]});
  assert.doesNotMatch(host.innerHTML,/<iframe|href=/);
  assert.match(host.innerHTML,/ultime 24 ore/);
});
