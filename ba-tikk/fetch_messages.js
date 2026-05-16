const https = require('https');
const fs = require('fs');
const path = require('path');

const BA_API_KEY = process.env.BA_API_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const THEME_ID = 14131230;
const DATA_DIR = path.join(__dirname, 'dashboard', 'data');

if (!BA_API_KEY) { console.error('BA_API_KEY обязателен'); process.exit(1); }
if (!OPENROUTER_API_KEY) { console.error('OPENROUTER_API_KEY обязателен'); process.exit(1); }

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

function toneFromRating(ratingResult) {
  if (ratingResult === null || ratingResult === undefined) return 0;
  if (ratingResult <= 2) return -1;
  if (ratingResult <= 3) return 0;
  return 1;
}

function extractRating(reviewRating) {
  if (!reviewRating || Array.isArray(reviewRating)) return null;
  return reviewRating.result || null;
}

async function fetchMonthMessages(year, month) {
  const timeFrom = Math.floor(new Date(Date.UTC(year, month - 1, 1)).getTime() / 1000);
  const now = new Date();
  const timeTo = (year === now.getUTCFullYear() && month === now.getUTCMonth() + 1)
    ? Math.floor(now.getTime() / 1000)
    : Math.floor(new Date(Date.UTC(year, month, 0, 23, 59, 59)).getTime() / 1000);

  const all = [];
  let offset = 0;
  const LIMIT = 5000;

  while (true) {
    const qs = `token=${encodeURIComponent(BA_API_KEY)}&themeId=${THEME_ID}&timeFrom=${timeFrom}&timeTo=${timeTo}&offset=${offset}&limit=${LIMIT}&fieldGroups[]=static&fieldGroups[]=text`;
    const batch = await httpGet(`https://bans-api.brandanalytics.ru/ba_api/feed.listMessagesCustom?${qs}`);
    const arr = Array.isArray(batch) ? batch : (batch.data || batch.items || []);
    if (!arr.length) break;
    all.push(...arr);
    if (arr.length < LIMIT) break;
    offset += LIMIT;
  }

  return all.map(m => ({
    date:   new Date(m.timeCreate * 1000).toISOString().slice(0, 10),
    hub:    m.hubTitle || m.hubName || '',
    text:   cleanText(m.textNorm) || cleanText(m.text) || cleanText(m.title) || '',
    url:    m.url || '',
    views:  m.viewsCount || 0,
    likes:  m.likesCount || 0,
    rating: extractRating(m.review_rating),
  }));
}

async function classifyTone(messages) {
  if (!messages.length) return [];

  // Сообщения без текста — классифицируем по звёздам
  const withoutText = messages.filter(m => !m.text);
  const withText    = messages.filter(m => m.text);

  const preClassified = withoutText.map(m => ({
    ...m,
    tone: toneFromRating(m.rating),
  }));

  // Сообщения с текстом — классифицируем через Haiku
  const classified = [];
  const BATCH = 20;

  for (let i = 0; i < withText.length; i += BATCH) {
    const batch = withText.slice(i, i + BATCH);
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
          content: `Расставь тональность упоминаний бренда Тиккурила (краски, лакокрасочные материалы, защитные составы).

Правила:
1 = позитив: промо бренда, описания продуктов с позитивной подачей, акции, положительные отзывы
0 = нейтрал: нейтральные упоминания, отзывы без текста (только название продукта), советы без эмоций
-1 = негатив: жалобы, негативный опыт, критика качества

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

    batch.forEach((m, j) => classified.push({ ...m, tone: tones[j] ?? 0 }));

    if (i + BATCH < withText.length) await new Promise(r => setTimeout(r, 500));
  }

  return [...preClassified, ...classified];
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
