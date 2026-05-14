# История и документация — Brand Analytics Dashboard

_Последнее обновление: 14 мая 2026_

---

## Описание проекта

Автоматический дашборд для мониторинга упоминаний бренда через Brand Analytics Statistical API.
Данные обновляются раз в сутки через GitHub Actions и отображаются на GitHub Pages.

---

## Архитектура

```
репозиторий/
├── .github/
│   └── workflows/
│       └── ba-update.yml       ← GitHub Actions (обновление данных всех брендов)
├── ba-linni/                   ← Линнимакс (ID: 14015636)
│   ├── dashboard/
│   │   ├── index.html          ← дашборд
│   │   ├── fetch_data.js       ← скрипт сбора данных
│   │   └── data/               ← JSON-файлы (генерируются автоматически)
│   │       ├── index.json
│   │       ├── 2025-12.json
│   │       └── ...
│   ├── generate_report.js      ← генератор Excel-отчёта (запуск вручную)
│   ├── test_api.js             ← тест подключения к API
│   ├── doc.json                ← OpenAPI-документация BA Stat API
│   ├── package.json
│   └── history.md
├── ba-tikk/                    ← Тиккурила (ID: 14078430)
│   └── ... (аналогичная структура)
└── ba-[новый бренд]/           ← шаблон для нового бренда
    └── ... (скопировать из ba-tikk)
```

---

## API Brand Analytics

| Параметр | Значение |
|---|---|
| Хост | `https://brandanalytics.ru` |
| Авторизация | query-параметр `?token=КЛЮЧ` |
| Ключ | хранится в GitHub Secrets → `BA_API_KEY` |
| Документация | `doc.json` в каждой папке бренда |

### Основные эндпоинты

| Эндпоинт | Описание | Обязательные параметры |
|---|---|---|
| `/v1/statistic/` | Проверка авторизации | `themeId` |
| `/v1/statistic/messagecount/` | Количество сообщений | `themeId`, `timeFrom`, `timeTo` |
| `/v1/statistic/tonality/` | Тональность | `themeId`, `timeFrom`, `timeTo` |
| `/v1/statistic/tophubs/` | Топ площадок | `themeId`, `timeFrom`, `timeTo`, `params[size]` |
| `/v1/statistic/hubtypes/` | Типы площадок | `themeId`, `timeFrom`, `timeTo` |
| `/v1/dictionary/langs` | Справочник языков | — |

> **Важно:** `tophubs` по умолчанию отдаёт 1 площадку. Передавать `params[size]=100` для всех.

---

## Данные по брендам

| Папка | Бренд | Theme ID | Дашборд |
|---|---|---|---|
| `ba-linni` | Линнимакс | `14015636` | https://andrewkk875.github.io/my-app/ba-linni/dashboard/ |
| `ba-tikk` | Тиккурила | `14078430` | https://andrewkk875.github.io/my-app/ba-tikk/dashboard/ |

---

## Как добавить новый бренд (шаг за шагом)

### 1. Найти Theme ID
Открыть нужную тему в личном кабинете Brand Analytics → ID в URL:
```
brandanalytics.ru/topics/[THEME_ID]/dashboard
```

### 2. Скопировать папку
```
Скопировать ba-tikk/ → ba-[название]/
```

### 3. Заменить THEME_ID
В трёх файлах заменить `14078430` на новый ID:
- `ba-[название]/dashboard/fetch_data.js` — строка `const THEME_ID = ...`
- `ba-[название]/generate_report.js` — строка `const THEME_ID = ...`
- `ba-[название]/test_api.js` — строка `const THEME_ID = ...`

### 4. Переименовать дашборд
В `ba-[название]/dashboard/index.html` заменить:
- `<title>Тиккурила — Brand Analytics</title>` → название бренда
- `Тиккурила — сводный дашборд по упоминаниям` → название бренда

### 5. Добавить job в GitHub Actions
В `.github/workflows/ba-update.yml` добавить новый блок по аналогии с `tikkurila`:

```yaml
  [название]:
    name: [Бренд] (ID [THEME_ID])
    runs-on: ubuntu-latest
    needs: tikkurila          # ← имя предыдущего job
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
        with:
          ref: main
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Загрузить данные
        env:
          BA_API_KEY: ${{ secrets.BA_API_KEY }}
        run: node ba-[название]/dashboard/fetch_data.js
      - name: Сохранить данные
        run: |
          git config user.name  "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git pull origin main
          git add ba-[название]/dashboard/data/
          git diff --cached --quiet || git commit -m "chore: [Бренд] — обновление данных $(date -u '+%Y-%m-%d %H:%M UTC')"
          git push
```

### 6. Закоммитить и запушить
```bash
git add ba-[название]/ .github/workflows/ba-update.yml
git commit -m "Add [Бренд] dashboard (ID [THEME_ID])"
git push origin main
```

### 7. Проверить
- GitHub Actions: https://github.com/AndrewKK875/my-app/actions
- Дашборд: https://andrewkk875.github.io/my-app/ba-[название]/dashboard/

---

## Расписание обновлений

- **Каждый день в 9:00 МСК** (6:00 UTC)
- Ручной запуск: GitHub Actions → Run workflow
- При каждом push в main

---

## Важные замечания

- API-ключ хранится **только** в GitHub Secrets (`BA_API_KEY`) — никогда не коммитить в код
- В скриптах использовать `process.env.BA_API_KEY`
- Файлы `index.html` писать/копировать **только через Write-инструмент** (не через PowerShell) — иначе BOM-кодировка ломает кириллицу
- `node_modules/` в `.gitignore` — устанавливать локально через `npm install` в нужной папке
- Данные начинаются с даты создания темы в BA (не раньше)
