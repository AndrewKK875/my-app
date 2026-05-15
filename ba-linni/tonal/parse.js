const fs = require('fs');
const path = require('path');

const TONAL_DIR = __dirname;
const OUT_FILE = path.join(__dirname, '../dashboard/data/messages-2026-04.json');

const files = fs.readdirSync(TONAL_DIR).filter(f => f.endsWith('.json'));
if (!files.length) { console.error('JSON-файлы не найдены'); process.exit(1); }

const raw = JSON.parse(fs.readFileSync(path.join(TONAL_DIR, files[0])));

const messages = raw.map(r => ({
  date:    new Date(r.timeCreate * 1000).toISOString().slice(0, 10),
  text:    (r.text || r.title || '').trim(),
  hub:     typeof r.hub === 'object' ? (r.hub?.name || '') : (r.hub || ''),
  hubtype: r.hubtype || '',
  url:     r.url || '',
  tone:    r.toneMark,    // 1 позитив, 0 нейтрал, -1 негатив
  views:   r.viewsCount || 0,
  likes:   r.likesCount || 0,
  author:  r.authorObject?.fullname || '',
})).sort((a, b) => a.date.localeCompare(b.date));

fs.writeFileSync(OUT_FILE, JSON.stringify(messages, null, 2));
console.log(`Готово: ${messages.length} сообщений → ${OUT_FILE}`);
