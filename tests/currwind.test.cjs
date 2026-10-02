const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
vm.runInThisContext(fs.readFileSync(path.join(__dirname,'../dist/currwind.js'),'utf8'));
const date = '2026-08-26', center = {lat:0,lon:0};
const wind = {id:'a',ts:date+'T12:00:00+02:00',lat:0,lon:0,dir:90,spd:8};

test('deduplicates by id, drops invalid coordinates/date and retains original metadata',()=>{
  const data = CurrWind.normalize({date,center,venti:[JSON.stringify({...wind,coach:'Coach',declination:2}),{...wind,spd:11},{...wind,id:'b',lat:91},{...wind,id:'c',lat:null},{...wind,id:'d',ts:'2026-08-25T12:00:00Z'},'bad json']});
  assert.equal(data.wind.length,1);
  assert.equal(data.wind[0].speed,8);
  assert.equal(data.wind[0].spd,8);
  assert.equal(data.wind[0].declination,2);
  assert.equal(data.wind[0].coach,'Coach');
  assert.equal(data.meta.ingest_stats.duplicates_removed,1);
  assert.equal(data.meta.ingest_stats.no_coordinates,2);
  assert.equal(data.meta.ingest_stats.wrong_date,1);
  assert.equal(data.meta.ingest_stats.invalid_records,1);
});
test('10 NM boundary inclusive; fingerprint fallback works',()=>{
  const lat=10*1.852/6371*180/Math.PI;
  const data=CurrWind.normalize({date,center,venti:[{...wind,id:undefined,lat},{...wind,id:undefined,lat},{...wind,id:'far',lat:lat+0.0001}]});
  assert.equal(data.wind.length,1);
  assert.equal(data.meta.ingest_stats.duplicates_removed,1);
  assert.equal(data.meta.ingest_stats.out_of_range,1);
});
test('current uses midpoint, rejects generic lat/lon and handles antimeridian',()=>{
  const data=CurrWind.normalize({date,center,sessioni:[{id:'a',midLat:0,midLon:0,lat1:40,lon1:40,lat2:41,lon2:41,speed:4},{id:'b',lat:0,lon:0,speed:5},{id:'c',lat1:0,lon1:-.01,lat2:0,lon2:.01,speed:6}]});
  assert.equal(data.measurements.length,2);
  assert.equal(data.meta.ingest_stats.no_coordinates,1);
  assert.equal(data.measurements[1].speed,6);
  const cross=CurrWind.normalize({date,center:{lat:0,lon:180},sessioni:[{lat1:0,lon1:179.99,lat2:0,lon2:-179.99,speed:5}]});
  assert.equal(cross.measurements.length,1);
});
test('a near-midnight offset timestamp keeps its local day',()=>{
  const data=CurrWind.normalize({date,center,venti:[{...wind,ts:date+'T00:15:00+02:00'}]});
  assert.equal(data.wind.length,1);
  assert.equal(CurrWind.validDate('2026-02-30'),false);
  assert.throws(()=>CurrWind.normalize({date,center:{lat:NaN,lon:0}}));
});
test('null is a valid empty day; HTTP and malformed responses are errors',async()=>{
  const empty=CurrWind.createClient(async()=>new Response('null'));
  assert.deepEqual(await empty.readDay(date),{sessioni:null,venti:null});
  await assert.rejects(()=>CurrWind.createClient(async()=>new Response('oops',{status:500})).readDay(date),/HTTP 500/);
  await assert.rejects(()=>CurrWind.createClient(async()=>new Response('"wrong"')).readDay(date),/non valida/);
});
test('permission failure uses one anonymous login, retries both reads and never writes observations',async()=>{
  const calls=[];
  const client=CurrWind.createClient(async(url,options)=>{
    calls.push({url,options});
    if(url.includes('accounts:signUp')) return Response.json({idToken:'test-token',refreshToken:'test-refresh',expiresIn:'3600'});
    if(!url.includes('?auth='))return new Response('denied',{status:401});
    return Response.json({one:JSON.stringify(wind)});
  });
  const data=await client.readDay(date);
  assert.equal(Object.keys(data.venti).length,1);
  assert.equal(calls.filter(c=>c.options.method==='POST').length,1);
  assert(calls.filter(c=>c.url.includes('firebasedatabase')).every(c=>!c.options.method && c.options.cache==='no-store'));
});
test('one failed node fails the day instead of claiming a complete empty result',async()=>{
  const client=CurrWind.createClient(async url=>url.includes('/venti/')?new Response('error',{status:503}):Response.json({one:'{}'}));
  await assert.rejects(()=>client.readDay(date),/HTTP 503/);
});
