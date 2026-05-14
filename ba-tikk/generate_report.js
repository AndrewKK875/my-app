const https = require('https');
const ExcelJS = require('./node_modules/exceljs');

const TOKEN = process.env.BA_API_KEY || '';
const THEME_ID = 14078430;

function getMonths() {
  const now = new Date();
  const months = [];
  for (let i = 2; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth();
    const from = new Date(year, month, 1, 0, 0, 0);
    const to = i === 0
      ? new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
      : new Date(year, month + 1, 0, 23, 59, 59);
    const names = ['РЇРЅРІР°СЂСЊ','Р¤РµРІСЂР°Р»СЊ','РњР°СЂС‚','РђРїСЂРµР»СЊ','РњР°Р№','РСЋРЅСЊ','РСЋР»СЊ','РђРІРіСѓСЃС‚','РЎРµРЅС‚СЏР±СЂСЊ','РћРєС‚СЏР±СЂСЊ','РќРѕСЏР±СЂСЊ','Р”РµРєР°Р±СЂСЊ'];
    months.push({
      label: `${names[month]} - ${year}`,
      timeFrom: Math.floor(from.getTime() / 1000),
      timeTo: Math.floor(to.getTime() / 1000),
    });
  }
  return months;
}

function apiGet(path, params) {
  return new Promise((resolve, reject) => {
    const qs = new URLSearchParams({ token: TOKEN, themeId: THEME_ID, ...params }).toString();
    const url = `https://brandanalytics.ru${path}?${qs}`;
    https.get(url, { headers: { Accept: 'application/json' } }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch { reject(new Error('JSON parse error: ' + body.slice(0, 200))); }
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

async function fetchMonthData(month) {
  const params = { timeFrom: month.timeFrom, timeTo: month.timeTo };

  const [msgResp, tonResp, hubsResp, hubtypesResp] = await Promise.all([
    apiGet('/v1/statistic/messagecount/', params),
    apiGet('/v1/statistic/tonality/', params),
    apiGet('/v1/statistic/tophubs/', { ...params, 'params[size]': 100 }),
    apiGet('/v1/statistic/hubtypes/', params),
  ]);

  // РЎРѕРѕР±С‰РµРЅРёСЏ
  const msgCurrent = msgResp.data?.current || msgResp.data?.previous;
  let totalMsgs = 0;
  for (const v of Object.values(msgCurrent?.histogram || {})) totalMsgs += v.msgs || 0;

  // РўРѕРЅР°Р»СЊРЅРѕСЃС‚СЊ РѕР±С‰Р°СЏ
  const tonCurrent = tonResp.data?.current || tonResp.data?.previous;
  const { positive, neutral, negative } = sumTone(tonCurrent?.histogram);

  // РџР»РѕС‰Р°РґРєРё СЃ С‚РѕРЅР°Р»СЊРЅРѕСЃС‚СЊСЋ
  const hubs = (hubsResp.data?.top_hubs || []).map(h => {
    const tone = sumTone(h.histogram);
    return {
      name: h.name,
      msgs: h.msgs,
      percent: h.percent,
      positive: tone.positive,
      neutral: tone.neutral,
      negative: tone.negative,
    };
  });

  // РўРёРїС‹ РїР»РѕС‰Р°РґРѕРє
  const hubtypes = (hubtypesResp.data?.hubtypes || []).map(t => ({
    name: t.hubtypeName,
    msgs: t.msgs,
    percent: t.percent,
    positive: t.tone?.positive || 0,
    neutral:  t.tone?.neutral  || 0,
    negative: t.tone?.negative || 0,
  }));

  return { label: month.label, totalMsgs, positive, neutral, negative, hubs, hubtypes };
}

// в”Ђв”Ђ РЎС‚РёР»Рё в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
const HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2F5597' } };
const HEADER_FONT = { bold: true, color: { argb: 'FFFFFFFF' } };
const BORDER_THIN = { bottom: { style: 'thin', color: { argb: 'FF000000' } } };
const BORDER_HAIR = { bottom: { style: 'hair', color: { argb: 'FFCCCCCC' } } };

function styleHeader(row) {
  row.eachCell(cell => {
    cell.font = HEADER_FONT;
    cell.fill = HEADER_FILL;
    cell.alignment = { horizontal: 'center' };
    cell.border = BORDER_THIN;
  });
}

function addTitle(ws, text, cols) {
  ws.mergeCells(`A1:${String.fromCharCode(64 + cols)}1`);
  const cell = ws.getCell('A1');
  cell.value = text;
  cell.font = { bold: true, size: 13 };
  cell.alignment = { horizontal: 'center' };
  ws.addRow([]);
}

async function buildExcel(rows) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Brand Analytics API';
  wb.created = new Date();

  // в”Ђв”Ђ Р›РёСЃС‚ 1: РЎРІРѕРґРєР° в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
  const ws1 = wb.addWorksheet('РЎРІРѕРґРєР°');
  addTitle(ws1, 'Brand Analytics вЂ” СЃРІРѕРґРєР° Р·Р° 3 РјРµСЃСЏС†Р°', 6);

  styleHeader(ws1.addRow(['РњРµСЃСЏС†', 'РЎРѕРѕР±С‰РµРЅРёР№', 'РџРѕР·РёС‚РёРІ', 'РќРµР№С‚СЂР°Р»', 'РќРµРіР°С‚РёРІ', 'Net Sentiment']));

  for (const r of rows) {
    const net = r.positive - r.negative;
    const row = ws1.addRow([r.label, r.totalMsgs, r.positive, r.neutral, r.negative, net]);
    row.eachCell((cell, col) => {
      cell.alignment = { horizontal: col === 1 ? 'left' : 'center' };
      cell.border = BORDER_HAIR;
      if (col === 6) cell.font = { color: { argb: net >= 0 ? 'FF1F7A1F' : 'FFCC0000' }, bold: true };
    });
  }

  ws1.columns = [
    { width: 22 }, { width: 14 }, { width: 12 },
    { width: 12 }, { width: 12 }, { width: 16 },
  ];

  // в”Ђв”Ђ Р›РёСЃС‚ 2: РџР»РѕС‰Р°РґРєРё в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
  const ws2 = wb.addWorksheet('РџР»РѕС‰Р°РґРєРё');
  addTitle(ws2, 'Р’СЃРµ РїР»РѕС‰Р°РґРєРё СЃ С‚РѕРЅР°Р»СЊРЅРѕСЃС‚СЊСЋ РїРѕ РјРµСЃСЏС†Р°Рј', 7);

  styleHeader(ws2.addRow(['РњРµСЃСЏС†', 'РџР»РѕС‰Р°РґРєР°', 'РЎРѕРѕР±С‰РµРЅРёР№', 'Р”РѕР»СЏ %', 'РџРѕР·РёС‚РёРІ', 'РќРµР№С‚СЂР°Р»', 'РќРµРіР°С‚РёРІ']));

  for (const r of rows) {
    for (const h of r.hubs) {
      const row = ws2.addRow([r.label, h.name, h.msgs, parseFloat(h.percent.toFixed(2)), h.positive, h.neutral, h.negative]);
      row.eachCell((cell, col) => {
        cell.alignment = { horizontal: col <= 2 ? 'left' : 'center' };
        cell.border = BORDER_HAIR;
      });
    }
    ws2.addRow([]);
  }

  ws2.columns = [
    { width: 22 }, { width: 26 }, { width: 13 },
    { width: 10 }, { width: 11 }, { width: 11 }, { width: 11 },
  ];

  // в”Ђв”Ђ Р›РёСЃС‚ 3: РўРёРїС‹ РїР»РѕС‰Р°РґРѕРє в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
  const ws3 = wb.addWorksheet('РўРёРїС‹ РїР»РѕС‰Р°РґРѕРє');
  addTitle(ws3, 'РўРёРїС‹ РїР»РѕС‰Р°РґРѕРє СЃ С‚РѕРЅР°Р»СЊРЅРѕСЃС‚СЊСЋ РїРѕ РјРµСЃСЏС†Р°Рј', 7);

  styleHeader(ws3.addRow(['РњРµСЃСЏС†', 'РўРёРї РїР»РѕС‰Р°РґРєРё', 'РЎРѕРѕР±С‰РµРЅРёР№', 'Р”РѕР»СЏ %', 'РџРѕР·РёС‚РёРІ', 'РќРµР№С‚СЂР°Р»', 'РќРµРіР°С‚РёРІ']));

  for (const r of rows) {
    for (const t of r.hubtypes) {
      const row = ws3.addRow([r.label, t.name, t.msgs, parseFloat(t.percent.toFixed(2)), t.positive, t.neutral, t.negative]);
      row.eachCell((cell, col) => {
        cell.alignment = { horizontal: col <= 2 ? 'left' : 'center' };
        cell.border = BORDER_HAIR;
      });
    }
    ws3.addRow([]);
  }

  ws3.columns = [
    { width: 22 }, { width: 22 }, { width: 13 },
    { width: 10 }, { width: 11 }, { width: 11 }, { width: 11 },
  ];

  const filePath = __dirname + '/report_90days.xlsx';
  await wb.xlsx.writeFile(filePath);
  console.log('Р¤Р°Р№Р» СЃРѕС…СЂР°РЅС‘РЅ:', filePath);
}

(async () => {
  const months = getMonths();
  console.log('РџРµСЂРёРѕРґС‹:', months.map(m => m.label).join(', '));
  console.log('Р—Р°РіСЂСѓР¶Р°СЋ РґР°РЅРЅС‹Рµ...');

  const rows = await Promise.all(months.map(fetchMonthData));

  for (const r of rows) {
    console.log(`\n${r.label}: ${r.totalMsgs} СЃРѕРѕР±С‰РµРЅРёР№ | + ${r.positive} / ~ ${r.neutral} / - ${r.negative}`);
    console.log('  РџР»РѕС‰Р°РґРѕРє:', r.hubs.length, '| РўРёРїРѕРІ:', r.hubtypes.length);
  }

  await buildExcel(rows);
})();
