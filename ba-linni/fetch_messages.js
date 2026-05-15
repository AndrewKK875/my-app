const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const BA_LOGIN = process.env.BA_LOGIN;
const BA_SECRET_KEY = process.env.BA_SECRET_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const THEME_ID = 14159496;
const DATA_DIR = path.join(__dirname, 'dashboard', 'data');

if (!BA_LOGIN || !BA_SECRET_KEY) { console.error('BA_LOGIN и BA_SECRET_KEY обязательны'); process.exit(1); }
if (!OPENROUTER_API_KEY) { console.error('OPENROUTER_API_KEY обязателен'); process.exit(1); }

function generateSig(params, secret) {
  const prepared = {};
  for (const [k, v] of Object.entries(params)) { prepared[k] = String(v); }
  const sorted = {};
  Object.keys(prepared).sort().forEach(k => sorted[k] = prepared[k]);
  return crypto.createHash('md5').update(JSON.stringify(sorted) + secret).digest('hex');
}

function httpGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { Accept: 'application/json' } }, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => { try { resolve(JSON.parse(body)); } catch(e) { reject(new Error('JSON: ' + body.slice(0, 200))); } });
    }).on('error', reject);
  });
}

function httpPost(hostname, urlPath, body, headers) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request({
      hostname, path: urlPath, method: 'POST',
      headers: { ...headers, 'Content-Length': Buffer.byteLength(data) },
    }, res => {
      let buf = '';
      res.on('data', c => buf += c);
      res.on('end', () => { try { resolve(JSON.parse(buf)); } catch(e) { reject(new Error('JSON: ' + buf.slice(0, 200))); } });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function cleanText(t) {
  return (t || '').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
}

function msgKey(m) {
  return m.url || m.text.slice(0, 100);
}

async function fetchMonthMessages(year, month) {
  const timeFrom = Math.floor(new Date(Date.UTC(year, month - 1, 1)).getTime() / 1000);
  const now = new Date();
  const timeTo = (year === now.getUTCFullYear() && month === now.getUTCMonth() + 1)
    ? Math.floor(now.getTime() / 1000)
    : Math.floor(new Date(Date.UTC(year, month, 0, 23, 59, 59)).getTime() / 1000);

  const all = [];
  let offset = 0;
  while (true) {
    const params = { login: BA_LOGIN, themeId: THEME_ID, timeFrom, timeTo, offset, limit: 150 };
    const sig = generateSig(params, BA_SECRET_KEY);
    const qs = new URLSearchParams({ ...params, sig }).toString();
    const batch = await httpGet('https://api.br-analytics.ru/objects/feed/messages/?' + qs);
    const arr = Array.isArray(batch) ? batch : (batch.data || []);
    if (!arr.length) break;
    all.push(...arr);
    if (arr.length < 150) break;
    offset += 150;
  }

  return all.map(m => ({
    date:  new Date(m.timeCreate * 1000).toISOString().slice(0, 10),
    hub:   m.hubTitle || m.hubName || '',
    text:  cleanText(m.text),
    url:   m.url || '',
    views: m.viewsCount || 0,
    likes: m.likesCount || 0,
  }));
}

async function classifyTone(messages) {
  if (!messages.length) return [];

  const BATCH = 20;
  const result = [];

  for (let i = 0; i < messages.length; i += BATCH) {
    const batch = messages.slice(i, i + BATCH);
    const numbered = batch
      .map((m, j) => `${j + 1}. [${m.hub}] ${m.text.slice(0, 300)}`)
      .join('\n\n');

    const response = await httpPost(
      'openrouter.ai',
      '/api/v1/chat/completions',
      {
        model: 'anthropic/claude-haiku-4-5',
        max_tokens: 100,
        messages: [{
          role: 'user',
          content: `Расставь тональность упоминаний бренда Линнимакс (краски, лакокрасочные материалы).

Правила:
1 = позитив: промо бренда, описания продуктов с позитивной подачей, акции, положительные отзывы
0 = нейтрал: нейтральные упоминания, вакансии, объявления о продаже б/у, советы без эмоций
-1 = негатив: жалобы, негативный опыт, критика

Ответь ТОЛЬКО числами через запятую в том же порядке. Пример: 1,0,-1

${numbered}`,
        }],
      },
      {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      }
    );

    const text = response.choices?.[0]?.message?.content?.trim() || '';
    const tones = text.split(',').map(t => {
      const n = parseInt(t.trim(), 10);
      return isNaN(n) ? 0 : Math.max(-1, Math.min(1, n));
    });

    batch.forEach((m, j) => result.push({ ...m, tone: tones[j] ?? 0 }));

    if (i + BATCH < messages.length) await new Promise(r => setTimeout(r, 500));
  }

  return result;
}

async function run() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;
  const monthKey = `${year}-${String(month).padStart(2, '0')}`;
  const filePath = path.join(DATA_DIR, `messages-${monthKey}.json`);

  console.log(`Обновляю сообщения за ${monthKey}...`);

  let existing = [];
  if (fs.existsSync(filePath)) {
    existing = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  }
  const existingKeys = new Set(existing.map(msgKey));

  console.log('Выгружаю сообщения из BA...');
  const all = await fetchMonthMessages(year, month);
  const newMsgs = all.filter(m => !existingKeys.has(msgKey(m)));

  if (!newMsgs.length) {
    console.log('Новых сообщений нет');
    return;
  }

  console.log(`Новых: ${newMsgs.length}, классифицирую тональность...`);
  const classified = await classifyTone(newMsgs);

  const merged = [...existing, ...classified].sort((a, b) => b.date.localeCompare(a.date));
  fs.writeFileSync(filePath, JSON.stringify(merged, null, 2));
  console.log(`✓ Добавлено ${classified.length} сообщений. Итого: ${merged.length}`);
}

run().catch(e => { console.error('Ошибка:', e.message); process.exit(1); });
