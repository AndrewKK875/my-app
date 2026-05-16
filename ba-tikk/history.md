# История и документация — Brand Analytics Dashboard

_Последнее обновление: 15 мая 2026_

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
├── ba-liaz/                    ← Лиаз (ID: 14187919)
│   └── ... (аналогичная структура)
├── ba-exeed/                   ← Эксид+Экслантикс (ID: 14158990)
│   └── ... (аналогичная структура)
└── ba-[новый бренд]/           ← шаблон для нового бренда
    └── ... (скопировать из ba-tikk)
```

---

## Правила нейминга

### Папки в корне репозитория

Формат: `[категория]-[название]` в нижнем регистре (kebab-case).

| Префикс | Назначение | Примеры |
|---|---|---|
| `ba-` | Brand Analytics | `ba-linni`, `ba-tikk`, `ba-liaz`, `ba-exeed` |
| `pa-` | Personal Analytics | `pa-finance` |
| `game-` | Игры | `game-haval-road-rush` |
| `app-` | Веб-приложения | `app-next` |

> Существующие папки (`Havalgame`, `lgame1` и др.) не переименовываются — правило применяется к **новым** папкам.

### Файлы в `dashboard/data/`

| Тип | Формат | Пример |
|---|---|---|
| Статистика (авто) | `YYYY-MM.json` | `2026-05.json` |
| Лента сообщений | `messages-YYYY-MM.json` | `messages-2026-04.json` |
| Индекс | `index.json` | — |

### Ручные экспорты в `tonal/`

Формат: `[бренд-slug]_YYYY-MM.[json|csv]`

Пример: `linnimax_2026-04.json` (вместо длинных имён с хешами из BA)

### Папки внутри бренда

| Папка | Назначение |
|---|---|
| `dashboard/` | Дашборд и скрипт сбора данных |
| `dashboard/data/` | JSON-данные (авто + ручные messages) |
| `tonal/` | Ручные экспорты из BA + конвертер |
| `screen/` | Скриншоты (не `scr/`) |

### Скрипты

Именование: глагол + существительное в `snake_case`.
Примеры: `fetch_data.js`, `generate_report.js`, `parse.js`, `test_api.js`

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

> **Ограничение:** Statistical API даёт только агрегированную статистику. Индивидуальные посты (с текстом, автором, URL) через этот API недоступны.

---

## BA Feed API (сообщения)

Используется полный Feed API Brand Analytics.

| Параметр | Значение |
|---|---|
| Хост | `https://bans-api.brandanalytics.ru` |
| Авторизация | query-параметр `?token=КЛЮЧ` (тот же `BA_API_KEY`) |
| Эндпоинт | `/ba_api/feed.listMessagesCustom` |
| Theme ID Тиккурила | `14131230` (отличается от Statistical API `14078430`) |
| Документация | `http://api.br-analytics.ru/v1/doc/` (login: brandsapi / pass: umpalumpa) |

### Параметры запроса

`GET /ba_api/feed.listMessagesCustom` — параметры: `themeId`, `timeFrom`, `timeTo`, `offset`, `limit` (макс 5000 для группы text), `fieldGroups[]=static&fieldGroups[]=text`

### Группы полей (fieldGroups)

| Группа | Макс сообщений | Что включает |
|---|---|---|
| `static` | 10 000 | id, url, даты, площадка, тональность BA, метаданные |
| `text` | 5 000 | textNorm, text, title, textSnippet |
| `counters` | 10 000 | viewsCount, likesCount, repostsCount |

### Ключевые поля ответа

| Поле | Описание |
|---|---|
| `textNorm` | Нормализованный текст без HTML (предпочтительный) |
| `text` | Исходный текст с HTML |
| `title` | Заголовок (используется как fallback для маркетплейсов) |
| `review_rating.result` | Оценка в 5-балльной шкале (из звёзд на маркетплейсе) |
| `isEmptyReviews` | `1` если отзыв без текста (только звёзды) |
| `toneMark` | Тональность по версии BA (-1/0/1) — **не используем** |

### Классификация тональности

**Отзывы без текста** (Ozon, Яндекс.Маркет) — по звёздам `review_rating.result`:
- 1–2 звезды → `-1` (негатив)
- 3 звезды → `0` (нейтрал)
- 4–5 звёзд → `1` (позитив)
- Нет звёзд → `0`

**Отзывы с текстом** — Claude Haiku через OpenRouter (`OPENROUTER_API_KEY`):
- `1` (позитив) — промо бренда, описания продуктов с позитивной подачей, акции
- `0` (нейтрал) — нейтральные упоминания, советы без эмоций
- `-1` (негатив) — жалобы, негативный опыт, критика качества

> **Статус:** `fetch_messages.js` настроен для ba-linni и ba-tikk. ba-liaz и ba-exeed — в планах.

---

## Данные по брендам

| Папка | Бренд | Theme ID | Дашборд |
|---|---|---|---|
| `ba-linni` | Линнимакс | `14015636` | https://andrewkk875.github.io/my-app/ba-linni/dashboard/ |
| `ba-tikk` | Тиккурила | `14078430` | https://andrewkk875.github.io/my-app/ba-tikk/dashboard/ |
| `ba-liaz` | Лиаз | `14187919` | https://andrewkk875.github.io/my-app/ba-liaz/dashboard/ |
| `ba-exeed` | Эксид+Экслантикс | `14158990` | https://andrewkk875.github.io/my-app/ba-exeed/dashboard/ |

---

## Как добавить новый бренд (шаг за шагом)

### 1. Найти Theme ID
Открыть нужную тему в личном кабинете Brand Analytics → ID в URL:
```
brandanalytics.ru/topics/[THEME_ID]/dashboard
```

### 2. Скопировать папку
Скопировать `ba-tikk/` → `ba-[название]/` через **Write-инструмент** (не PowerShell — иначе BOM).

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
В `.github/workflows/ba-update.yml` добавить новый блок после последнего job (сейчас `exeed`):

```yaml
  [название]:
    name: [Бренд] (ID [THEME_ID])
    runs-on: ubuntu-latest
    needs: exeed              # ← имя предыдущего job (сейчас последний: exeed)
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
        with:
          ref: main
      - uses: actions/setup-node@v4
        with:
          node-version: '24'
      - name: Загрузить данные
        env:
          BA_API_KEY: ${{ secrets.BA_API_KEY }}
        run: node ba-[название]/dashboard/fetch_data.js
      - name: Сохранить данные
        run: |
          git config user.name  "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add ba-[название]/dashboard/data/
          git diff --cached --quiet && echo "Нет изменений" && exit 0
          git commit -m "chore: [Бренд] — обновление данных $(date -u '+%Y-%m-%d %H:%M UTC')"
          git pull origin main --no-rebase -X ours
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

## Известные проблемы и решения

| Проблема | Причина | Решение |
|---|---|---|
| Кракозябры в дашборде | BOM в файле (PowerShell добавляет) | Создавать/редактировать файлы только через Write-инструмент |
| `rejected (fetch first)` в Actions | Конфликт двух параллельных push | `git pull --no-rebase -X ours` перед `git push` |
| `local changes overwritten` в Actions | pull до commit | Всегда: `add` → `commit` → `pull` → `push` |
| `tophubs` отдаёт 1 площадку | Default size=1 в API | Передавать `params[size]=100` |
| Node.js 20 deprecated в Actions | GitHub переходит на Node 24 | Использовать `node-version: '24'` + добавить `env: FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true` на уровне воркфлоу |
| BA Statistical API возвращает 0 при повторном запуске за день | Rate limit по теме | В `fetch_data.js` добавлена защита: если `totalMsgs === 0` — файл не перезаписывается |
| Расхождение количества сообщений: Statistical API (780) vs Feed API (50) | Разные Theme ID: Statistical `14078430`, Feed `14131230` — охватывают разные наборы источников | Использовать Feed API с `listMessagesCustom` для полного объёма |

---

## Безопасность

- API-ключ хранится **только** в GitHub Secrets (`BA_API_KEY`) — никогда не коммитить в код
- В скриптах использовать `process.env.BA_API_KEY`
- `node_modules/` в `.gitignore`
- `.claude/` в `.gitignore`
- `.env` в `.gitignore`

---

## История изменений

| Дата | Что сделано |
|---|---|
| 15.05.2026 | Синхронизирована документация: добавлена заметка об ограничении Statistical API. В ba-linni добавлен раздел «Лента сообщений» с тональностью (март + апрель 2026), опубликован на GitHub Pages. Методология тональности скорректирована под Brand Analytics (промо-контент → позитив). |
| 15.05.2026 | Зафиксированы правила нейминга: префиксы папок (`ba-`, `pa-`, `game-`, `app-`), форматы файлов в `data/` и `tonal/`, именование скриптов, структура папок внутри бренда. Применяется к новым файлам и папкам; существующие не переименовываются. |
| 15.05.2026 | Добавлена документация BA Feed API (`api.br-analytics.ru`): авторизация login+sig(MD5), эндпоинт сообщений, методология тональности. Theme ID Тиккурила в Feed API: `14131230`. Автоматизация `fetch_messages.js` пока настроена только для ba-linni. |
| 15.05.2026 | Создан `fetch_messages.js` для ba-tikk (Theme ID `14131230`). Данных за март и апрель в Feed API нет — аккаунт начал собирать сообщения с мая 2026. Вручную классифицированы сообщения за май: 2+ / 39○ / 0−. Лента сообщений добавлена в дашборд. Автоматизация подключена в GitHub Actions. |
| 16.05.2026 | Изучена документация полного Feed API (`bans-api.brandanalytics.ru/ba_api/`). Выявлено расхождение данных: Statistical API показывал 780 сообщений за май, Feed API — только 50. Причина: разные Theme ID и разные наборы источников. Выяснено, что пустые отзывы с маркетплейсов не имеют текста — классификация через Haiku невозможна. |
| 16.05.2026 | `fetch_messages.js` переведён на полный Feed API: эндпоинт `feed.listMessagesCustom`, авторизация через `BA_API_KEY`, лимит 5000 сообщений, текст из `textNorm`. Добавлено поле `rating` (звёзды из `review_rating.result`). Пустые отзывы теперь классифицируются по звёздам, текстовые — через Haiku. Обновлён workflow: убраны `BA_LOGIN` и `BA_SECRET_KEY` из шага Тиккурилы. |
| 16.05.2026 | Инцидент: BA Statistical API вернул 0 сообщений при повторном запуске за день (rate limit), данные Тиккурила/Лиаз/Эксид перезаписаны нулями. Данные восстановлены из git-истории (коммиты 10:45 UTC). В `fetch_data.js` Тиккурилы и Линнимакс добавлена защита: при `totalMsgs === 0` файл не перезаписывается. |
