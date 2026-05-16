const https = require('https');
const fs = require('fs');
const path = require('path');

const TOKEN = process.env.BA_API_KEY;
const THEME_ID = 14078430;
const DATA_DIR = path.join(__dirname, 'data');

if (!TOKEN) { console.error('BA_API_KEY не задан'); process.exit(1); }
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function apiGet(urlPath, params) {
  return new Promise((resolve, reject) => {
    const qs = new URLSearchParams({ token: TOKEN, themeId: THEME_ID, ...params }).toString();
    https.get(`https://brandanalytics.ru${urlPath}?${qs}`, { headers: { Accept: 'application/json' } }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch (e) { reject(new Error('JSON error: ' + body.slice(0, 200))); }
      });
    }).on('error', reject);
  });
}

function sumTone(histogram) {
  let positive = 0, neutral = 0, negative = 0;
  for (const v of Object.values(histogram || {})) {
    positive += v.tone?.positive || 0;
    neutral  += v.tone?.neutral  || 0;
    negative += v.tone?.negative || 0;
  }
  return { positive, neutral, negative };
}

// Все месяцы с декабря 2025 до текущего
function getMonths() {
  const months = [];
  const start = new Date(2025, 11, 1); // декабрь 2025
  const now = new Date();
  let cur = new Date(start);
  while (cur <= now) {
    const year = cur.getFullYear();
    const month = cur.getMonth();
    const from = new Date(year, month, 1, 0, 0, 0);
    const to = (year === now.getFullYear() && month === now.getMonth())
      ? new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
      : new Date(year, month + 1, 0, 23, 59, 59);
    const names = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
    months.push({
      key: `${year}-${String(month + 1).padStart(2, '0')}`,
      label: `${names[month]} ${year}`,
      timeFrom: Math.floor(from.getTime() / 1000),
      timeTo: Math.floor(to.getTime() / 1000),
    });
    cur.setMonth(cur.getMonth() + 1);
  }
  return months;
}

async function fetchMonth(month) {
  console.log(`Загружаю: ${month.label}...`);
  const params = { timeFrom: month.timeFrom, timeTo: month.timeTo };

  const [msgResp, tonResp, hubsResp, hubtypesResp] = await Promise.all([
    apiGet('/v1/statistic/messagecount/', params),
    apiGet('/v1/statistic/tonality/', params),
    apiGet('/v1/statistic/tophubs/', { ...params, 'params[size]': 100 }),
    apiGet('/v1/statistic/hubtypes/', params),
  ]);

  const msgCurrent = msgResp.data?.current || msgResp.data?.previous;
  const histogram = msgCurrent?.histogram || {};
  let totalMsgs = 0;
  const daily = {};
  for (const [ts, v] of Object.entries(histogram)) {
    totalMsgs += v.msgs || 0;
    const date = new Date(Number(ts) * 1000).toISOString().slice(0, 10);
    daily[date] = (daily[date] || 0) + (v.msgs || 0);
  }

  const tonCurrent = tonResp.data?.current || tonResp.data?.previous;
  const tone = sumTone(tonCurrent?.histogram);

  const dailyTone = {};
  for (const [ts, v] of Object.entries(tonCurrent?.histogram || {})) {
    const date = new Date(Number(ts) * 1000).toISOString().slice(0, 10);
    if (!dailyTone[date]) dailyTone[date] = { msgs: 0, positive: 0, neutral: 0, negative: 0 };
    dailyTone[date].msgs     += v.msgs || 0;
    dailyTone[date].positive += v.tone?.positive || 0;
    dailyTone[date].neutral  += v.tone?.neutral  || 0;
    dailyTone[date].negative += v.tone?.negative || 0;
  }

  const hubs = (hubsResp.data?.top_hubs || []).map(h => {
    const t = sumTone(h.histogram);
    return { name: h.name, msgs: h.msgs, percent: +h.percent.toFixed(2), ...t };
  });

  const hubtypes = (hubtypesResp.data?.hubtypes || []).map(t => ({
    name: t.hubtypeName,
    msgs: t.msgs,
    percent: +t.percent.toFixed(2),
    positive: t.tone?.positive || 0,
    neutral:  t.tone?.neutral  || 0,
    negative: t.tone?.negative || 0,
  }));

  return {
    key: month.key,
    label: month.label,
    updatedAt: new Date().toISOString(),
    summary: { totalMsgs, ...tone, netSentiment: tone.positive - tone.negative },
    dailyTone: Object.entries(dailyTone)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, ...v })),
    hubs,
    hubtypes,
  };
}

(async () => {
  const months = getMonths();
  const index = [];

  for (const month of months) {
    try {
      const data = await fetchMonth(month);
      if (data.summary.totalMsgs === 0) {
        console.warn(`  skip ${month.label}: API вернул 0, файл не перезаписан`);
        index.push({ key: month.key, label: month.label });
        continue;
      }
      fs.writeFileSync(path.join(DATA_DIR, `${month.key}.json`), JSON.stringify(data, null, 2));
      index.push({ key: month.key, label: month.label });
      console.log(`  ok ${month.label}: ${data.summary.totalMsgs}`);
    } catch (e) {
      console.error(`  err ${month.label}:`, e.message);
    }
  }

  fs.writeFileSync(path.join(DATA_DIR, 'index.json'), JSON.stringify({
    updatedAt: new Date().toISOString(),
    themeId: THEME_ID,
    months: index,
  }, null, 2));

  console.log('Done:', months.length + 1, 'files');
})();
