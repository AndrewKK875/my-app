# История и документация — Brand Analytics Dashboard

_Последнее обновление: 15 мая 2026_

---

## Описание проекта

Автоматический дашборд для мониторинга упоминаний бренда через Brand Analytics Statistical API.
Данные обновляются раз в сутки через GitHub Actions и отображаются на GitHub Pages.

---

## Данные по брендам

| Папка | Бренд | Theme ID | Дашборд |
|---|---|---|---|
| `ba-linni` | Линнимакс | `14015636` | https://andrewkk875.github.io/my-app/ba-linni/dashboard/ |
| `ba-tikk` | Тиккурила | `14078430` | https://andrewkk875.github.io/my-app/ba-tikk/dashboard/ |
| `ba-liaz` | Лиаз | `14187919` | https://andrewkk875.github.io/my-app/ba-liaz/dashboard/ |
| `ba-exeed` | Эксид+Экслантикс | `14158990` | https://andrewkk875.github.io/my-app/ba-exeed/dashboard/ |

---

## Известные проблемы и решения

| Проблема | Причина | Решение |
|---|---|---|
| Кракозябры в дашборде | BOM в файле (PowerShell добавляет) | Создавать/редактировать файлы только через Write-инструмент |
| `rejected (fetch first)` в Actions | Конфликт двух параллельных push | `git pull --no-rebase -X ours` перед `git push` |
| `local changes overwritten` в Actions | pull до commit | Всегда: `add` → `commit` → `pull` → `push` |
| `tophubs` отдаёт 1 площадку | Default size=1 в API | Передавать `params[size]=100` |
| Node.js 20 deprecated в Actions | GitHub переходит на Node 24 | Использовать `node-version: '24'` + добавить `env: FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true` на уровне воркфлоу |

---

## Безопасность

- API-ключ хранится **только** в GitHub Secrets (`BA_API_KEY`) — никогда не коммитить в код
- В скриптах использовать `process.env.BA_API_KEY`
- `node_modules/` в `.gitignore`
- `.claude/` в `.gitignore`
- `.env` в `.gitignore`
