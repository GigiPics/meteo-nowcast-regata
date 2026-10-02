const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const read = name => fs.readFileSync(path.join(__dirname,'../dist',name),'utf8');
function setup() {
  const nodes = new Map();
  const node = id => {
    if (!nodes.has(id)) nodes.set(id,{style:{},dataset:{},open:false,value:'',textContent:'',innerHTML:''});
    return nodes.get(id);
  };
  const context = vm.createContext({console,Date,AbortController,AbortSignal,DOMException,setTimeout,clearTimeout,fetch,requestAnimationFrame:fn=>fn(),
    document:{getElementById:node},
    areaCenter:{lat:0,lng:0},jsonData:null,jsonLayer:{clearLayers(){}},todayISO:()=> '2026-10-02',refreshMapSize(){},setStatus(){},
    L:{circleMarker:()=>({addTo:()=>({bindPopup(){}})})},fmtTs:ts=>ts});
  vm.runInContext(read('currwind.js'),context);
  vm.runInContext(read('auto-currwind.js').split('// Poll only while visible.')[0],context);
  const run = code => vm.runInContext(code,context);
  return {context,run};
}
test('late response for an old center cannot replace the new field',async()=>{
  const {run}=setup();
  run("let requests=[]; currwindClient.readDay=()=>new Promise(resolve=>requests.push(resolve));");
  const first=run('loadMeasures()');
  run('areaCenter={lat:20,lng:20}');
  const second=run('loadMeasures()');
  run("requests[1]({sessioni:null,venti:{a:{lat:20,lon:20,spd:7,ts:'2026-10-02T12:00:00'}}})");
  await second;
  run("requests[0]({sessioni:null,venti:{a:{lat:0,lon:0,spd:99,ts:'2026-10-02T12:00:00'}}})");
  await first;
  assert.equal(run('jsonData.wind[0].speed'),7);
  assert.equal(run('jsonData.meta.ingest_stats.center.lat'),20);
});
test('date change invalidates markers immediately, empty refresh clears previous records',async()=>{
  const {run}=setup();
  run("currwindClient.readDay=async()=>({sessioni:null,venti:{a:{lat:0,lon:0,spd:7,ts:'2026-10-02T12:00:00'}}})");
  await run('loadMeasures()');
  assert.equal(run('jsonData.wind.length'),1);
  run("setMeasuresDate('2026-10-01'); clearTimeout(measuresTimer)");
  assert.equal(run('jsonData'),null);
  run('currwindClient.readDay=async()=>({sessioni:null,venti:null})');
  await run('loadMeasures()');
  assert.equal(run('jsonData.wind.length'),0);
  assert.equal(run('measuresState.kind'),'empty');
});
test('network errors clear data and remain distinct from no measurements',async()=>{
  const {run}=setup();
  run("jsonData={wind:[{}]}; currwindClient.readDay=async()=>{throw new Error('Offline')}");
  await run('loadMeasures()');
  assert.equal(run('jsonData'),null);
  assert.equal(run('measuresState.kind'),'error');
});
test('removing the area invalidates a pending response',async()=>{
  const {run}=setup();
  run('let finish; currwindClient.readDay=()=>new Promise(resolve=>{finish=resolve})');
  const request=run('loadMeasures()');
  run('areaCenter=null; scheduleMeasures(); finish({sessioni:null,venti:null})');
  await request;
  assert.equal(run('jsonData'),null);
  assert.equal(run('measuresState.kind'),'idle');
});
