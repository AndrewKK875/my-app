const XLSX = require('xlsx');
const fs = require('fs');

function readAll(filename) {
  const wb = XLSX.readFile(filename);
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws, { defval: null });
}

const data2024 = readAll('expenses_2024.xlsx');
const data2025 = readAll('expenses_2025.xlsx');
const all = [...data2024, ...data2025];

// === Create combined Excel ===
const wb = XLSX.utils.book_new();
const ws = XLSX.utils.json_to_sheet(all.map(r => ({
  'Год': r['Год'],
  'Месяц': r['Месяц'],
  'Расходы': r['Расходы'],
  'Основная категория расходов': r['Основная категория расходов'],
  'Комментарий': r['Комментарий']
})));

// Column widths
ws['!cols'] = [
  { wch: 6 },
  { wch: 12 },
  { wch: 14 },
  { wch: 30 },
  { wch: 65 }
];

XLSX.utils.book_append_sheet(wb, ws, 'Расходы');
XLSX.writeFile(wb, 'expenses_all.xlsx');
console.log('expenses_all.xlsx created');

// === Analysis ===
const r24 = data2024.map(r => r['Расходы']);
const r25 = data2025.map(r => r['Расходы']);

const sum = arr => arr.reduce((a, b) => a + b, 0);
const avg = arr => sum(arr) / arr.length;
const min = arr => Math.min(...arr);
const max = arr => Math.max(...arr);

const total24 = sum(r24);
const total25 = sum(r25);
const avg24 = avg(r24);
const avg25 = avg(r25);
const growth = ((total25 - total24) / total24 * 100).toFixed(1);

const months = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];

function fmt(n) { return n.toLocaleString('ru-RU'); }

// Month rows
const rows = months.map((m, i) => {
  const v24 = r24[i];
  const v25 = r25[i];
  const diff = ((v25 - v24) / v24 * 100).toFixed(1);
  const sign = diff > 0 ? '+' : '';
  return `| ${m} | ${fmt(v24)} | ${fmt(v25)} | ${sign}${diff}% |`;
}).join('\n');

// Quarterly
const q = (arr, s) => sum(arr.slice(s, s+3));
const q24 = [q(r24,0), q(r24,3), q(r24,6), q(r24,9)];
const q25 = [q(r25,0), q(r25,3), q(r25,6), q(r25,9)];
const qNames = ['Q1 (Янв–Мар)', 'Q2 (Апр–Июн)', 'Q3 (Июл–Сен)', 'Q4 (Окт–Дек)'];
const qRows = qNames.map((n, i) => {
  const diff = ((q25[i] - q24[i]) / q24[i] * 100).toFixed(1);
  return `| ${n} | ${fmt(q24[i])} | ${fmt(q25[i])} | +${diff}% |`;
}).join('\n');

// Peak/low months
const maxIdx24 = r24.indexOf(max(r24));
const minIdx24 = r24.indexOf(min(r24));
const maxIdx25 = r25.indexOf(max(r25));
const minIdx25 = r25.indexOf(min(r25));

// Month-over-month growth within each year
function momTrend(arr) {
  return arr.slice(1).map((v, i) => {
    const pct = ((v - arr[i]) / arr[i] * 100).toFixed(1);
    const sign = pct > 0 ? '+' : '';
    return `${months[i+1]}: ${sign}${pct}%`;
  }).join(', ');
}

// Category totals across both years
const catMap = {};
all.forEach(r => {
  const cat = r['Основная категория расходов'];
  catMap[cat] = (catMap[cat] || 0) + r['Расходы'];
});
const catSorted = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
const catRows = catSorted.map(([cat, val]) => `| ${cat} | ${fmt(val)} |`).join('\n');

const md = `# Анализ расходов 2024–2025

## Общая картина

| Показатель | 2024 | 2025 | Изменение |
|---|---|---|---|
| Итого за год | ${fmt(total24)} ₽ | ${fmt(total25)} ₽ | +${growth}% |
| Среднемесячные | ${fmt(Math.round(avg24))} ₽ | ${fmt(Math.round(avg25))} ₽ | +${((avg25-avg24)/avg24*100).toFixed(1)}% |
| Минимальный месяц | ${months[minIdx24]}: ${fmt(min(r24))} ₽ | ${months[minIdx25]}: ${fmt(min(r25))} ₽ | — |
| Максимальный месяц | ${months[maxIdx24]}: ${fmt(max(r24))} ₽ | ${months[maxIdx25]}: ${fmt(max(r25))} ₽ | — |

---

## Помесячное сравнение

| Месяц | 2024 (₽) | 2025 (₽) | Рост |
|---|---:|---:|---:|
${rows}

---

## Поквартальный разрез

| Квартал | 2024 (₽) | 2025 (₽) | Рост |
|---|---:|---:|---:|
${qRows}

---

## Топ категорий расходов (2024 + 2025 суммарно)

| Категория | Сумма (₽) |
|---|---:|
${catRows}

---

## Тренды и выводы

### 1. Устойчивый рост базовых расходов (+${growth}% год к году)
Общие расходы выросли с **${fmt(total24)} ₽** до **${fmt(total25)} ₽** — разница ${fmt(total25-total24)} ₽.
Среднемесячный платёж вырос с **${fmt(Math.round(avg24))} ₽** до **${fmt(Math.round(avg25))} ₽**.
Это выше типичного уровня инфляции, то есть реальные потребности или уровень жизни расширились.

### 2. «Дно» расходов поднялось
В 2024 самые тихие месяцы были в диапазоне **84–92 тыс. ₽**.
В 2025 минимум уже **94–101 тыс. ₽**.
Это говорит о том, что **регулярная база выросла** — подписки, сервисы, привычки дороже.

### 3. Летний пик (июль) — стабильная закономерность
Июль оба года является самым дорогим месяцем: **${fmt(r24[6])} ₽** в 2024 и **${fmt(r25[6])} ₽** в 2025.
Расходы на отпуск выросли на **${(((r25[6]-r24[6])/r24[6])*100).toFixed(1)}%** — путешествия становятся дороже или масштабнее.

### 4. Декабрь — второй по величине пик
Подарки и праздники дорожают: **${fmt(r24[11])} ₽** → **${fmt(r25[11])} ₽** (+${(((r25[11]-r24[11])/r24[11])*100).toFixed(1)}%).
Q4 в целом вырос с **${fmt(q24[3])} ₽** до **${fmt(q25[3])} ₽**.

### 5. Март = обучение (стабильный паттерн)
В оба года март — месяц оплаты курсов: **${fmt(r24[2])} ₽** и **${fmt(r25[2])} ₽**.
Это целенаправленная инвестиция в развитие, а не случайный всплеск.

### 6. Осень 2025 стала значительно дороже
Сентябрь–ноябрь 2025 суммарно: **${fmt(r25[8]+r25[9]+r25[10])} ₽** против **${fmt(r24[8]+r24[9]+r24[10])} ₽** в 2024 (+${((((r25[8]+r25[9]+r25[10])-(r24[8]+r24[9]+r24[10]))/(r24[8]+r24[9]+r24[10]))*100).toFixed(1)}%).
Ноябрь 2025 особенно выделяется (+${(((r25[10]-r24[10])/r24[10])*100).toFixed(1)}%) — крупная покупка техники.

### 7. Подписки и сервисы — новая растущая статья
В 2025 появилась отдельная категория «Подписки и сервисы», которой не было в 2024.
Это отражает переход на цифровые инструменты и рабочие платформы.

### 8. Q3 — самый дорогой квартал в обоих годах
Q3 (июль–сентябрь): **${fmt(q24[2])} ₽** (2024) и **${fmt(q25[2])} ₽** (2025).
Рост Q3 выше среднегодового — отпуск и посттуристические траты дорожают быстрее всего.

---

## Рекомендации

- **Планировать летний отпуск заранее** — это самая крупная нерегулярная статья.
- **Заложить бюджет на декабрь** — праздники стабильно обходятся ~150–170 тыс. ₽.
- **Отслеживать рост подписок** — цифровые сервисы в 2025 стали отдельной значимой статьёй.
- **Март — образование**: если курсы планируются каждый год, лучше резервировать эту сумму заранее.
`;

fs.writeFileSync('expenses_analysis.md', md, 'utf8');
console.log('expenses_analysis.md created');
