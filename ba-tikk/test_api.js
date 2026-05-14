const https = require('https');

const API_KEY = process.env.BA_API_KEY || '';
const HOST = 'api.brandanalytics.ru';

const paths = [
  // РЎС‚Р°РЅРґР°СЂС‚РЅС‹Рµ РїСѓС‚Рё РјРѕРЅРёС‚РѕСЂРёРЅРіРѕРІС‹С… РїР»Р°С‚С„РѕСЂРј
  '/api/topics',
  '/api/v1/topics',
  '/api/v2/topics',
  '/v1/topics',
  '/v2/topics',
  '/v3/topics',
  '/topics',
  '/api/projects',
  '/v1/projects',
  '/api/mentions',
  '/v1/mentions',
  '/api/search',
  '/v1/search',
  '/api/statistics',
  '/v1/statistics',
  '/api/stat',
  '/v1/stat',
  '/api/posts',
  '/v1/posts',
  '/api/v1/',
  '/api/',
  '/v1/',
];

// РџРѕРїСЂРѕР±СѓРµРј СЂР°Р·РЅС‹Рµ С„РѕСЂРјР°С‚С‹ Р°РІС‚РѕСЂРёР·Р°С†РёРё РґР»СЏ РєР°Р¶РґРѕРіРѕ РїСѓС‚Рё
const authHeaders = [
  { 'Authorization': `Bearer ${API_KEY}` },
  { 'Authorization': `Token ${API_KEY}` },
  { 'X-API-Key': API_KEY },
  { 'X-Auth-Token': API_KEY },
];

function request(path, headers) {
  return new Promise((resolve) => {
    const opts = {
      hostname: HOST,
      path,
      method: 'GET',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', ...headers }
    };
    const req = https.request(opts, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => resolve({ path, status: res.statusCode, body: body.slice(0, 300) }));
    });
    req.on('error', (e) => resolve({ path, status: null, body: e.message }));
    req.end();
  });
}

(async () => {
  // РЎРЅР°С‡Р°Р»Р° РїСЂРѕР№РґС‘Рј РІСЃРµ РїСѓС‚Рё СЃ Bearer (СЃР°РјС‹Р№ С‡Р°СЃС‚С‹Р№)
  const results = [];
  for (const path of paths) {
    const r = await request(path, authHeaders[0]);
    results.push(r);
    if (r.status && r.status !== 404) {
      console.log(`вњ“ [${r.status}] ${path}`);
      console.log(`  ${r.body.replace(/\n/g,' ').slice(0,200)}`);
    }
  }

  // Р•СЃР»Рё РЅРёС‡РµРіРѕ РЅРµ РЅР°С€Р»Рё СЃ Bearer вЂ” РїРѕРїСЂРѕР±СѓРµРј РґСЂСѓРіРёРµ СЃС…РµРјС‹ Р°РІС‚РѕСЂРёР·Р°С†РёРё РЅР° РєРѕСЂРЅРµ
  const found = results.filter(r => r.status && r.status !== 404);
  if (found.length === 0) {
    console.log('\nBearer РЅРµ РґР°Р» СЂРµР·СѓР»СЊС‚Р°С‚РѕРІ. РџСЂРѕР±СѓРµРј РґСЂСѓРіРёРµ СЃС…РµРјС‹ Р°РІС‚РѕСЂРёР·Р°С†РёРё...');
    for (const h of authHeaders) {
      const r = await request('/api/topics', h);
      console.log(`[${r.status}] /api/topics  headers: ${JSON.stringify(h)}`);
      if (r.status !== 404) console.log(`  ${r.body.slice(0,200)}`);
    }
    // РџРѕРїСЂРѕР±СѓРµРј token РІ query string
    for (const param of ['token', 'api_key', 'apikey', 'key', 'access_token']) {
      const r = await request(`/api/topics?${param}=${API_KEY}`, {});
      console.log(`[${r.status}] /api/topics?${param}=***`);
      if (r.status !== 404) console.log(`  ${r.body.slice(0,200)}`);
    }
  }
})();
