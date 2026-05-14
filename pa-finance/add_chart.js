const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const ExcelJS = require('exceljs');

const months = ['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек'];

const data2024 = [86500,84200,138900,87800,91200,89500,156400,102300,88400,94700,90200,149800];
const data2025 = [98500,94200,142800,101300,106700,112400,174900,128600,116500,109800,137400,168200];

async function run() {
  // --- Render chart image ---
  const canvas = new ChartJSNodeCanvas({ width: 900, height: 480, backgroundColour: 'white' });

  const chartConfig = {
    type: 'bar',
    data: {
      labels: months,
      datasets: [
        {
          label: '2024',
          data: data2024,
          backgroundColor: 'rgba(31, 78, 121, 0.80)',
          borderColor: 'rgba(31, 78, 121, 1)',
          borderWidth: 1,
          borderRadius: 3,
        },
        {
          label: '2025',
          data: data2025,
          backgroundColor: 'rgba(70, 130, 180, 0.80)',
          borderColor: 'rgba(70, 130, 180, 1)',
          borderWidth: 1,
          borderRadius: 3,
        },
      ],
    },
    options: {
      responsive: false,
      plugins: {
        title: {
          display: true,
          text: 'Расходы по месяцам: 2024 vs 2025',
          font: { size: 16, weight: 'bold' },
          color: '#1F4E79',
          padding: { bottom: 16 },
        },
        legend: {
          position: 'top',
          labels: { font: { size: 13 } },
        },
      },
      scales: {
        y: {
          beginAtZero: false,
          min: 70000,
          ticks: {
            callback: v => (v / 1000) + 'K ₽',
            font: { size: 11 },
          },
          grid: { color: 'rgba(0,0,0,0.07)' },
          title: { display: true, text: 'Сумма (₽)', font: { size: 12 } },
        },
        x: {
          ticks: { font: { size: 12 } },
          grid: { display: false },
        },
      },
    },
  };

  const imageBuffer = await canvas.renderToBuffer(chartConfig);

  // --- Open existing workbook ---
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile('expenses_all.xlsx');

  // Remove sheet if it already exists
  const existing = wb.getWorksheet('Анализ_график');
  if (existing) wb.removeWorksheet(existing.id);

  const ws = wb.addWorksheet('Анализ_график', {
    pageSetup: { orientation: 'landscape' },
  });

  // Column widths
  ws.getColumn(1).width = 6;
  ws.getColumn(2).width = 58;
  ws.getColumn(3).width = 20;

  // --- Embed chart image ---
  const imgId = wb.addImage({ buffer: imageBuffer, extension: 'png' });
  ws.addImage(imgId, { tl: { col: 1, row: 1 }, br: { col: 9, row: 22 } });

  // --- Styles ---
  const styleH1 = { font: { bold: true, size: 15, color: { argb: 'FF1F4E79' } } };
  const styleH2 = { font: { bold: true, size: 12, color: { argb: 'FF2E75B6' } } };
  const styleBold = { font: { bold: true, size: 11 } };
  const styleNormal = { font: { size: 11 } };
  const styleBullet = { font: { size: 11 }, alignment: { wrapText: true, vertical: 'top' } };

  function setRow(rowNum, col, text, style) {
    const cell = ws.getCell(rowNum, col);
    cell.value = text;
    Object.assign(cell, style || {});
    if (style) Object.assign(cell, style);
    cell.font = style?.font || {};
    cell.alignment = style?.alignment || {};
  }

  let r = 24;

  // Title
  ws.getCell(r, 2).value = 'Рекомендации на основе анализа расходов';
  ws.getCell(r, 2).font = styleH1.font;
  r += 2;

  const recs = [
    {
      title: '1. Планировать бюджет на отпуск заранее',
      body: 'Июль — стабильно самый дорогой месяц оба года (156 400 ₽ и 174 900 ₽). Расходы на путешествие выросли на 11.8%. Рекомендуется откладывать ~15 000–20 000 ₽/месяц в январе–июне специально под отпуск, чтобы не создавать кассовый разрыв.',
    },
    {
      title: '2. Зарезервировать декабрьский бюджет',
      body: 'Декабрь — второй по величине пик: 149 800 ₽ (2024) и 168 200 ₽ (2025). Q4 в целом вырос с 334 700 ₽ до 415 400 ₽ (+24.1%). Стоит заложить отдельный «праздничный» резерв ещё в сентябре.',
    },
    {
      title: '3. Выделить статью на обучение',
      body: 'Март — стабильный месяц оплаты курсов оба года (138 900 ₽ и 142 800 ₽). Это не случайный всплеск, а повторяющийся паттерн. Лучше включить обучение в ежегодный план и резервировать сумму заранее.',
    },
    {
      title: '4. Контролировать рост регулярной базы',
      body: 'Минимальные месяцы выросли с 84–92 тыс. ₽ до 94–101 тыс. ₽. Регулярные расходы и подписки дорожают. Рекомендуется раз в квартал делать ревизию подписок и сервисов — отключать неиспользуемые.',
    },
    {
      title: '5. Готовиться к дорогой осени',
      body: 'Сентябрь–ноябрь 2025 обошёлся в 363 700 ₽ против 273 300 ₽ в 2024 (+33.1%). Ноябрь 2025 — +52.3% из-за техники. Крупные покупки лучше планировать на менее затратные месяцы (апрель–июнь) или формировать накопительный фонд.',
    },
    {
      title: '6. Общая траектория: рост +18.4% год к году',
      body: 'Если тренд сохранится, расходы в 2026 могут составить ~1 766 000 ₽ (среднемесячно ~147 000 ₽). Для управления ростом полезно установить годовой лимит и отслеживать отклонения ежеквартально.',
    },
  ];

  recs.forEach(({ title, body }) => {
    ws.getCell(r, 2).value = title;
    ws.getCell(r, 2).font = styleH2.font;
    r++;
    ws.getCell(r, 2).value = body;
    ws.getCell(r, 2).font = styleNormal.font;
    ws.getCell(r, 2).alignment = { wrapText: true, vertical: 'top' };
    ws.getRow(r).height = 52;
    r += 2;
  });

  await wb.xlsx.writeFile('expenses_all.xlsx');
  console.log('Done: sheet "Анализ_график" added to expenses_all.xlsx');
}

run().catch(console.error);
