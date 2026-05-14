const ExcelJS = require('exceljs');

const EUR_RUB = 95; // assumed rate
const fmt = (n) => Math.round(n);

async function run() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile('expenses_all.xlsx');

  const existing = wb.getWorksheet('Испания_2026');
  if (existing) wb.removeWorksheet(existing.id);

  const ws = wb.addWorksheet('Испания_2026', { pageSetup: { orientation: 'landscape' } });

  // ── Column widths ──────────────────────────────────────
  ws.getColumn(1).width = 3;
  ws.getColumn(2).width = 36;
  ws.getColumn(3).width = 16;
  ws.getColumn(4).width = 18;
  ws.getColumn(5).width = 14;
  ws.getColumn(6).width = 14;
  ws.getColumn(7).width = 14;

  // ── Colors & style helpers ─────────────────────────────
  const DARK  = 'FF1F4E79';
  const MID   = 'FF2E75B6';
  const LIGHT = 'FFD6E4F0';
  const GOLD  = 'FFFFC000';
  const GREEN = 'FF375623';
  const BGGREEN = 'FFE2EFDA';
  const RED   = 'FFC00000';
  const BGRED = 'FFFCE4D6';
  const WHITE = 'FFFFFFFF';
  const BGHEAD = 'FF1F4E79';

  function hdr(ws, row, col, value, bgArgb, fgArgb, sz, span) {
    const c = ws.getCell(row, col);
    c.value = value;
    c.font = { bold: true, size: sz || 11, color: { argb: fgArgb || WHITE } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb || BGHEAD } };
    c.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    c.border = {
      top: { style: 'thin', color: { argb: 'FFAAAAAA' } },
      bottom: { style: 'thin', color: { argb: 'FFAAAAAA' } },
      left: { style: 'thin', color: { argb: 'FFAAAAAA' } },
      right: { style: 'thin', color: { argb: 'FFAAAAAA' } },
    };
    if (span) ws.mergeCells(row, col, row, col + span - 1);
    return c;
  }

  function dataCell(ws, row, col, value, bold, bg, fg, fmt, wrap) {
    const c = ws.getCell(row, col);
    c.value = value;
    c.font = { bold: !!bold, size: 11, color: { argb: fg || 'FF000000' } };
    if (bg) c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
    c.alignment = { vertical: 'middle', wrapText: !!wrap, horizontal: typeof value === 'number' ? 'right' : 'left' };
    c.border = {
      top: { style: 'thin', color: { argb: 'FFDDDDDD' } },
      bottom: { style: 'thin', color: { argb: 'FFDDDDDD' } },
      left: { style: 'thin', color: { argb: 'FFDDDDDD' } },
      right: { style: 'thin', color: { argb: 'FFDDDDDD' } },
    };
    if (fmt) c.numFmt = fmt;
    return c;
  }

  function sectionTitle(row, text) {
    ws.mergeCells(row, 2, row, 7);
    const c = ws.getCell(row, 2);
    c.value = text;
    c.font = { bold: true, size: 13, color: { argb: WHITE } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DARK } };
    c.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    ws.getRow(row).height = 22;
    return row + 1;
  }

  function gap(row) {
    ws.getRow(row).height = 8;
    return row + 1;
  }

  let r = 1;

  // ══════════════════════════════════════════════════════
  // TITLE BLOCK
  // ══════════════════════════════════════════════════════
  ws.mergeCells(r, 2, r, 7);
  const titleCell = ws.getCell(r, 2);
  titleCell.value = 'Прогноз расходов на 2026 год — переезд в Испанию';
  titleCell.font = { bold: true, size: 17, color: { argb: DARK } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws.getRow(r).height = 30;
  r++;

  ws.mergeCells(r, 2, r, 7);
  const subCell = ws.getCell(r, 2);
  subCell.value = `Курс: 1 EUR = ${EUR_RUB} ₽ (прогнозный, консервативный)   ·   Город: средний (Валенсия / Малага / Аликанте)   ·   Образ жизни: умеренный`;
  subCell.font = { italic: true, size: 10, color: { argb: 'FF555555' } };
  subCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws.getRow(r).height = 18;
  r++;
  r = gap(r);

  // ══════════════════════════════════════════════════════
  // 1. ЕЖЕМЕСЯЧНЫЙ БЮДЖЕТ ПО КАТЕГОРИЯМ
  // ══════════════════════════════════════════════════════
  r = sectionTitle(r, '1. Ежемесячный бюджет по категориям (базовый месяц)');

  hdr(ws, r, 2, 'Категория расходов',    BGHEAD, WHITE, 11);
  hdr(ws, r, 3, 'Сумма (EUR)',            BGHEAD, WHITE, 11);
  hdr(ws, r, 4, 'Сумма (₽)',             BGHEAD, WHITE, 11);
  hdr(ws, r, 5, 'Комментарий',           BGHEAD, WHITE, 11, 3);
  ws.getRow(r).height = 20;
  r++;

  const categories = [
    ['Аренда жилья (1BR, средний город)',  850,  'Валенсия ~700–900 €, Малага ~750–950 €, Барселона от 1 200 €'],
    ['Продукты питания',                   380,  'Mercadona, Lidl — сопоставимо с РФ или дешевле'],
    ['Транспорт (метро, автобус, такси)',   110,  'Месячный проездной ~40 €, такси и каршеринг'],
    ['Коммунальные платежи',               145,  'Электричество, вода, газ (летом выше из-за кондиционера)'],
    ['Связь (телефон + интернет)',          55,   'Тариф с 5G ~20 €, домашний интернет ~35 €'],
    ['Медицинская страховка (privada)',     130,  'Обязательна для ВНЖ; Sanitas/Adeslas ~100–160 €/мес'],
    ['Досуг, кафе, рестораны',             230,  'Меню дня ~12–15 €; бар, кино, прогулки'],
    ['Подписки и сервисы',                  60,  'Netflix, Spotify, Adobe, рабочие инструменты'],
    ['Одежда (усреднённо)',                 95,   'Zara, Mango — сопоставимо с РФ'],
    ['Обучение испанского языка',           130,  'Группа в языковой школе; онлайн ~60–80 €'],
    ['Непредвиденные расходы',             120,   'Ремонт, врач, штрафы и прочее'],
  ];

  let totalBaseEUR = 0;
  categories.forEach(([cat, eur, note], i) => {
    const rub = fmt(eur * EUR_RUB);
    totalBaseEUR += eur;
    const bg = i % 2 === 0 ? 'FFFAFAFA' : WHITE;
    dataCell(ws, r, 2, cat,  false, bg);
    dataCell(ws, r, 3, eur,  false, bg, null, '#,##0 "€"');
    dataCell(ws, r, 4, rub,  false, bg, null, '#,##0 "₽"');
    ws.mergeCells(r, 5, r, 7);
    dataCell(ws, r, 5, note, false, bg, '444444');
    ws.getRow(r).height = 18;
    r++;
  });

  // Total row
  const totalBaseRUB = fmt(totalBaseEUR * EUR_RUB);
  hdr(ws, r, 2, 'ИТОГО в месяц (база)',  LIGHT, DARK, 12);
  hdr(ws, r, 3, `${totalBaseEUR.toLocaleString('ru')} €`,  LIGHT, DARK, 12);
  hdr(ws, r, 4, `${totalBaseRUB.toLocaleString('ru')} ₽`,  LIGHT, DARK, 12);
  ws.mergeCells(r, 5, r, 7);
  hdr(ws, r, 5, 'Без учёта отпуска, праздников и крупных покупок', LIGHT, DARK, 10);
  ws.getRow(r).height = 20;
  r++;
  r = gap(r);

  // ══════════════════════════════════════════════════════
  // 2. ПОМЕСЯЧНЫЙ ПРОГНОЗ НА 2026
  // ══════════════════════════════════════════════════════
  r = sectionTitle(r, '2. Помесячный прогноз расходов на 2026 год');

  hdr(ws, r, 2, 'Месяц',                BGHEAD, WHITE, 11);
  hdr(ws, r, 3, 'Расходы (EUR)',        BGHEAD, WHITE, 11);
  hdr(ws, r, 4, 'Расходы (₽)',         BGHEAD, WHITE, 11);
  hdr(ws, r, 5, 'Основная категория',  BGHEAD, WHITE, 11);
  hdr(ws, r, 6, 'Факторы роста',       BGHEAD, WHITE, 11, 2);
  ws.getRow(r).height = 20;
  r++;

  const monthly = [
    ['Январь',   2450, 'Регулярные расходы',    'Послепраздничные траты, продукты, транспорт'],
    ['Февраль',  2200, 'Регулярные расходы',    'Спокойный месяц, базовые платежи'],
    ['Март',     2750, 'Обучение',              'Оплата курсов испанского, языковая школа'],
    ['Апрель',   2350, 'Регулярные расходы',    'Пасха (Semana Santa) — небольшой рост'],
    ['Май',      2500, 'Подписки и сервисы',    'Продление рабочих подписок, летние покупки'],
    ['Июнь',     2700, 'Регулярные расходы',    'Подготовка к отпуску, рост трат перед летом'],
    ['Июль',     4400, 'Путешествие',           'Отпуск по Европе — перелёты, отели, питание'],
    ['Август',   3100, 'Отдых и досуг',         'Продолжение сезона, пляжные расходы, поездки'],
    ['Сентябрь', 2700, 'Обучение и подписки',  'Новый семестр испанского, рабочие сервисы'],
    ['Октябрь',  2400, 'Регулярные расходы',    'Осенние покупки одежды, стабильный месяц'],
    ['Ноябрь',   2650, 'Крупная покупка',       'Black Friday, техника, обновление инструментов'],
    ['Декабрь',  3450, 'Подарки и праздники',   'Рождество, Новый год, подарки, путешествие домой'],
  ];

  let totalYearEUR = 0;
  monthly.forEach(([month, eur, cat, factor], i) => {
    const rub = fmt(eur * EUR_RUB);
    totalYearEUR += eur;
    let bg = i % 2 === 0 ? 'FFFAFAFA' : WHITE;
    let fg = null;
    if (eur >= 4000) { bg = BGRED; }
    else if (eur >= 3000) { bg = 'FFFFF2CC'; }
    dataCell(ws, r, 2, month,  false, bg);
    dataCell(ws, r, 3, eur,    false, bg, fg, '#,##0 "€"');
    dataCell(ws, r, 4, rub,    false, bg, fg, '#,##0 "₽"');
    dataCell(ws, r, 5, cat,    false, bg);
    ws.mergeCells(r, 6, r, 7);
    dataCell(ws, r, 6, factor, false, bg, '444444');
    ws.getRow(r).height = 18;
    r++;
  });

  const totalYearRUB = fmt(totalYearEUR * EUR_RUB);
  const avgMonthEUR = Math.round(totalYearEUR / 12);
  const avgMonthRUB = fmt(avgMonthEUR * EUR_RUB);
  hdr(ws, r, 2, 'ИТОГО за 2026 год',  LIGHT, DARK, 12);
  hdr(ws, r, 3, `${totalYearEUR.toLocaleString('ru')} €`, LIGHT, DARK, 12);
  hdr(ws, r, 4, `${totalYearRUB.toLocaleString('ru')} ₽`, LIGHT, DARK, 12);
  ws.mergeCells(r, 5, r, 7);
  hdr(ws, r, 5, `Среднемесячно: ${avgMonthEUR.toLocaleString('ru')} € / ${avgMonthRUB.toLocaleString('ru')} ₽`, LIGHT, DARK, 11);
  ws.getRow(r).height = 20;
  r++;
  r = gap(r);

  // ══════════════════════════════════════════════════════
  // 3. ЕДИНОРАЗОВЫЕ РАСХОДЫ НА ПЕРЕЕЗД
  // ══════════════════════════════════════════════════════
  r = sectionTitle(r, '3. Единоразовые расходы на переезд (первый год)');

  hdr(ws, r, 2, 'Статья',              BGHEAD, WHITE, 11);
  hdr(ws, r, 3, 'Сумма (EUR)',         BGHEAD, WHITE, 11);
  hdr(ws, r, 4, 'Сумма (₽)',          BGHEAD, WHITE, 11);
  hdr(ws, r, 5, 'Комментарий',        BGHEAD, WHITE, 11, 3);
  ws.getRow(r).height = 20;
  r++;

  const oneTime = [
    ['Перелёт + провоз багажа',          600,  'Прямой рейс или с пересадкой, груз'],
    ['Депозит за аренду (1–2 мес.)',     1700, 'Обычно залог = 1–2 месяца аренды'],
    ['Обустройство жилья',               1800, 'Мебель, посуда, бытовая техника, текстиль'],
    ['Документы (NIE/TIE, нотариус)',     500, 'Апостиль, переводы, госпошлины, нотариус'],
    ['Открытие счёта + стартовые траты', 300,  'Sim-карта, транспортная карта, первые покупки'],
    ['Запас на непредвиденное',          1500, 'Рекомендуется иметь «подушку» на 1–2 мес.'],
  ];

  let totalOneTimeEUR = 0;
  oneTime.forEach(([item, eur, note], i) => {
    const rub = fmt(eur * EUR_RUB);
    totalOneTimeEUR += eur;
    const bg = i % 2 === 0 ? 'FFFAFAFA' : WHITE;
    dataCell(ws, r, 2, item, false, bg);
    dataCell(ws, r, 3, eur,  false, bg, null, '#,##0 "€"');
    dataCell(ws, r, 4, rub,  false, bg, null, '#,##0 "₽"');
    ws.mergeCells(r, 5, r, 7);
    dataCell(ws, r, 5, note, false, bg, '444444');
    ws.getRow(r).height = 18;
    r++;
  });

  const totalOneTimeRUB = fmt(totalOneTimeEUR * EUR_RUB);
  hdr(ws, r, 2, 'ИТОГО единоразово',  LIGHT, DARK, 12);
  hdr(ws, r, 3, `${totalOneTimeEUR.toLocaleString('ru')} €`, LIGHT, DARK, 12);
  hdr(ws, r, 4, `${totalOneTimeRUB.toLocaleString('ru')} ₽`, LIGHT, DARK, 12);
  ws.mergeCells(r, 5, r, 7);
  hdr(ws, r, 5, 'Нужно иметь до переезда + стартовый запас', LIGHT, DARK, 11);
  ws.getRow(r).height = 20;
  r++;
  r = gap(r);

  // ══════════════════════════════════════════════════════
  // 4. СРАВНЕНИЕ: РОССИЯ 2025 vs ИСПАНИЯ 2026
  // ══════════════════════════════════════════════════════
  r = sectionTitle(r, '4. Сравнение: Россия 2025 vs Испания 2026');

  hdr(ws, r, 2, 'Показатель',          BGHEAD, WHITE, 11);
  hdr(ws, r, 3, 'Россия 2025 (₽)',     BGHEAD, WHITE, 11);
  hdr(ws, r, 4, 'Испания 2026 (₽)',    BGHEAD, WHITE, 11);
  hdr(ws, r, 5, 'Испания 2026 (EUR)',  BGHEAD, WHITE, 11);
  hdr(ws, r, 6, 'Разница (₽)',         BGHEAD, WHITE, 11);
  hdr(ws, r, 7, 'Изменение',           BGHEAD, WHITE, 11);
  ws.getRow(r).height = 20;
  r++;

  const comparison = [
    ['Итого за год',         1491300, totalYearRUB,    totalYearEUR],
    ['Среднемесячно',         124275, avgMonthRUB,     avgMonthEUR],
    ['Июль (отпуск)',         174900, fmt(4400*EUR_RUB), 4400],
    ['Декабрь (праздники)',   168200, fmt(3450*EUR_RUB), 3450],
    ['Март (обучение)',       142800, fmt(2750*EUR_RUB), 2750],
    ['Минимальный месяц',      94200, fmt(2200*EUR_RUB), 2200],
  ];

  comparison.forEach(([label, ru, es, esEur], i) => {
    const diff = es - ru;
    const pct = ((diff / ru) * 100).toFixed(1);
    const bg = i % 2 === 0 ? 'FFFAFAFA' : WHITE;
    const diffColor = diff > 0 ? RED : GREEN;
    dataCell(ws, r, 2, label,         false, bg);
    dataCell(ws, r, 3, ru,            false, bg, null, '#,##0 "₽"');
    dataCell(ws, r, 4, es,            false, bg, null, '#,##0 "₽"');
    dataCell(ws, r, 5, esEur,         false, bg, null, '#,##0 "€"');
    dataCell(ws, r, 6, diff,          true,  bg, diffColor, '+#,##0 "₽";-#,##0 "₽"');
    dataCell(ws, r, 7, `${diff>0?'+':''}${pct}%`, true, bg, diffColor);
    ws.getRow(r).height = 18;
    r++;
  });

  r = gap(r);

  // ══════════════════════════════════════════════════════
  // 5. РЕКОМЕНДАЦИИ
  // ══════════════════════════════════════════════════════
  r = sectionTitle(r, '5. Рекомендации по расходам при переезде');

  const recs = [
    ['Выбирать город с умом',
     'Валенсия, Малага, Аликанте — на 30–40% дешевле Барселоны и Мадрида по аренде. Для старта это критично: разница только по жилью — 300–500 € в месяц.'],
    ['Сформировать финансовую подушку заранее',
     `До переезда иметь минимум 6 000 € (≈ ${fmt(6000*EUR_RUB).toLocaleString('ru')} ₽): покрыть единоразовые расходы + запас на 2 месяца без дохода.`],
    ['Оформить страховку до получения TIE',
     'Privada-страховка (Sanitas, Adeslas, Asisa) обязательна для ВНЖ и ВНЖ инвестора. Оформлять ДО подачи документов на ВНЖ.'],
    ['Учить испанский до переезда',
     'Уровень A2–B1 сократит расходы: легче торговаться за аренду, общаться с коммунальщиками, налоговой. Экономия — косвенная, но значительная.'],
    ['Учесть налоговое резидентство',
     'После 183 дней в Испании вы становитесь налоговым резидентом. Нужна консультация fiscal/asesor — доходы из РФ декларируются в Испании. Заложить €200–300 на налогового консультанта.'],
    ['Следить за курсом EUR/RUB',
     'Прогноз построен по курсу 95 ₽/€. При ослаблении рубля до 110–120 ₽ годовые расходы вырастут до 3,5–3,9 млн ₽. Рекомендуется хранить часть средств в EUR заранее.'],
    ['Ревизия подписок перед переездом',
     'Часть российских сервисов (Яндекс, 1С и др.) недоступна или не нужна в Испании. Отписаться заранее, пересмотреть стек инструментов — потенциальная экономия 3 000–6 000 ₽/мес.'],
  ];

  recs.forEach(([title, body], i) => {
    ws.mergeCells(r, 2, r, 7);
    const tc = ws.getCell(r, 2);
    tc.value = `${i+1}. ${title}`;
    tc.font = { bold: true, size: 11, color: { argb: MID } };
    tc.alignment = { vertical: 'middle', indent: 1 };
    ws.getRow(r).height = 18;
    r++;

    ws.mergeCells(r, 2, r, 7);
    const bc = ws.getCell(r, 2);
    bc.value = body;
    bc.font = { size: 11 };
    bc.alignment = { vertical: 'top', wrapText: true, indent: 2 };
    const bg = i % 2 === 0 ? 'FFFAFAFA' : WHITE;
    bc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
    ws.getRow(r).height = 46;
    r++;
  });

  r = gap(r);

  // ══════════════════════════════════════════════════════
  // 6. ВЫВОДЫ
  // ══════════════════════════════════════════════════════
  r = sectionTitle(r, '6. Выводы — что изменится при переезде');

  const conclusions = [
    ['Расходы вырастут в ~2 раза (в рублях)',
     `Годовая сумма: 1 491 300 ₽ (РФ 2025) → ~${totalYearRUB.toLocaleString('ru')} ₽ (Испания 2026). Главный драйвер — аренда жильяи пересчёт всех трат в евро. В EUR расходы составят ~${totalYearEUR.toLocaleString('ru')} € в год.`],
    ['Структура расходов изменится принципиально',
     'В России доля регулярных трат ~60–65%. В Испании аренда займёт ~30% бюджета. Появятся новые статьи: страховка, NIE-расходы, языковые курсы. Исчезнут: ряд российских сервисов.'],
    ['Европейские путешествия станут доступнее',
     'Авиаперелёты внутри Европы от 20–50 €. Bюджет на отпуск можно увеличить, не увеличивая его кратно. Это качественное улучшение lifestyle при тех же деньгах.'],
    ['Необходим стартовый капитал',
     `До переезда нужно иметь минимум ${totalOneTimeEUR.toLocaleString('ru')} € (≈ ${totalOneTimeRUB.toLocaleString('ru')} ₽) единоразово + 3-месячный запас на жизнь (~${fmt(avgMonthEUR*3).toLocaleString('ru')} €). Итого стартовый буфер: ~${fmt(totalOneTimeEUR + avgMonthEUR*3).toLocaleString('ru')} € (≈ ${fmt((totalOneTimeEUR + avgMonthEUR*3)*EUR_RUB).toLocaleString('ru')} ₽).`],
    ['Финансовая устойчивость требует дохода в EUR',
     'При доходе в рублях переезд уязвим к курсовым колебаниям. Устойчивая схема: доход в EUR (фриланс, работодатель ЕС) или стабильный конвертируемый доход. При доходе 4 000–5 000 €/мес — переезд финансово комфортен.'],
  ];

  conclusions.forEach(([title, body], i) => {
    ws.mergeCells(r, 2, r, 7);
    const tc = ws.getCell(r, 2);
    tc.value = `${i+1}. ${title}`;
    tc.font = { bold: true, size: 11, color: { argb: DARK } };
    tc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BGGREEN } };
    tc.alignment = { vertical: 'middle', indent: 1 };
    ws.getRow(r).height = 18;
    r++;

    ws.mergeCells(r, 2, r, 7);
    const bc = ws.getCell(r, 2);
    bc.value = body;
    bc.font = { size: 11 };
    bc.alignment = { vertical: 'top', wrapText: true, indent: 2 };
    bc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F9F2' } };
    ws.getRow(r).height = 52;
    r++;
  });

  // ── Footer ─────────────────────────────────────────────
  r = gap(r);
  ws.mergeCells(r, 2, r, 7);
  const footer = ws.getCell(r, 2);
  footer.value = `Прогноз составлен на основе данных расходов 2024–2025. Курс EUR/RUB = ${EUR_RUB} ₽ (прогнозный). Цены актуальны для умеренного образа жизни в среднем испанском городе.`;
  footer.font = { italic: true, size: 9, color: { argb: 'FF888888' } };
  footer.alignment = { horizontal: 'left', indent: 1 };

  await wb.xlsx.writeFile('expenses_all.xlsx');
  console.log('Done: sheet "Испания_2026" added');
  console.log(`Итого год Испания: ${totalYearEUR} € / ${totalYearRUB.toLocaleString('ru')} ₽`);
  console.log(`Единоразово на переезд: ${totalOneTimeEUR} € / ${totalOneTimeRUB.toLocaleString('ru')} ₽`);
}

run().catch(console.error);
