# L'Oréal Memory Match — Dev Log

Проект: мобильная веб-игра "Memory Match" в стиле L'Oréal  
Файл: `index.html` (всё в одном файле — SPA)  
Деплой: https://andrewkk875.github.io/my-app/

---

## Сессия 1 — Настройка окружения

- Установлен `gh` (GitHub CLI)
- Авторизация: `gh auth login`
- Создан репозиторий `my-app` на GitHub
- Загружен `index.html`, настроен GitHub Pages

---

## Сессия 2 — Экраны 1–5

### Экран 1 — Home (`#home-screen`)
- Логотип L'Oréal, розовый фон-полукруг, 4 продукта, кнопка Play Now
- Адаптивный: `clamp()`, `100dvh`, `env(safe-area-inset-*)`

### Экран 2 — Onboarding (`#onboarding-screen`)
- 3 шага: тапни карточку / найди пары / уложись в время
- Кнопки "Let's Go!" и "Skip"

### Экран 3 — Lobby (`#lobby-screen`)
- Статистика (лучший счёт, уровень игрока)
- Кнопки: Play, Daily Challenge, Glow Challenge
- Нижняя навигация: Home / Profile / Ranks

### Экран 4 — Daily Reward (`#reward-screen`)
- Сетка 7 дней, день 1 отмечен как сегодняшний
- Кнопка "Claim Reward"

### Экран 5 — Level Select (`#level-screen`)
- 3 карточки уровней: Easy (6 пар), Medium (12 пар), Hard (20 пар)
- Картинки продукции L'Oréal из CDN
- **Фикс**: увеличены картинки `clamp(52px → 80px, 15vw → 22vw, 70px → 110px)`

---

## Сессия 3 — Игровые экраны (6–12)

### Экран 6 — Game (`#game-screen`)
- CSS 3D flip-карточки: `transform-style: preserve-3d`, `rotateY(180deg)`
- 20 продуктов L'Oréal из официального CDN
- Адаптивная сетка по ширине экрана:

```javascript
function getResponsiveCols(level) {
  const w = window.innerWidth;
  if (w >= 1024) return { easy: 4, medium: 6, hard: 8 }[level];
  if (w >= 600)  return { easy: 4, medium: 6, hard: 8 }[level];
  if (w >= 390)  return { easy: 3, medium: 4, hard: 5 }[level];
  return               { easy: 3, medium: 4, hard: 4 }[level];
}
```

- Протестировано на 15 разрешениях (320px до 1440px)

### Экран 7 — Win (`#win-screen`)
- Трофей, счёт, звёзды (1–3), кнопки Next Level / View Products

### Экран 8 — Lose (`#lose-screen`)
- Пар найдено + попытки, кнопки Try Again / Exit

### Экран 9 — Product (`#product-screen`)
- Детальная карточка продукта после победы

### Экран 10 — Glow Challenge (`#glow-screen`)
- Прогресс-бар, 3 продукта, кнопка Play Now

### Экран 11 — Profile (`#profile-screen`)
- Аватар, статистика, 8 достижений (часть залочены)

### Экран 12 — Leaderboard (`#leaderboard-screen`)
- ТОП-8 игроков, строка "You" обновляется после побед

---

## Маршрутизация экранов

```javascript
const SCREENS = ['home-screen','onboarding-screen','lobby-screen','reward-screen',
  'level-screen','game-screen','win-screen','lose-screen','product-screen',
  'glow-screen','profile-screen','leaderboard-screen'];

function showScreen(id) {
  SCREENS.forEach(s => document.getElementById(s).style.display = 'none');
  document.getElementById(id).style.display = 'flex';
}
```

**Навигационный поток:**
```
home → onboarding → lobby → level → game → win/lose
                  ↓
          daily-challenge → reward
          glow-challenge  → glow
          nav: profile, leaderboard
```

---

## Сессия 4 — Фиксы багов

| Баг | Причина | Фикс |
|-----|---------|------|
| `git push` не работал | Нет credentials | `gh auth setup-git` |
| GitHub Pages API 422 | Неправильный формат запроса | JSON heredoc через `--input -` |
| Дубль `restart` listener | Два addEventListener | Удалён первый дубль |
| `cardsArray.length` не существует | Переименована переменная | → `LEVEL_CONFIG[currentLevel].pairs` |
| Level select → сразу игра (без lobby) | `letsgo-btn` вёл в `startGame()` | → `showScreen('lobby-screen')` |

---

## Сессия 5 — Safari/iOS исправления + таймер

### Анализ 5 популярных memory-игр на GitHub
- kubowania (515★), taniarascia (122★), Marina Ferreira tutorial, sen-ltd, doragrishaeva
- **Общее у всех**: `perspective: 1000px` на контейнере, клик-события (не touch)
- **Не делают**: специальных Safari-фиксов, touch-событий

### Применённые исправления

```css
/* 1. Убрана блокировка touch в Safari */
#home-screen, #lobby-screen {
  overflow-x: clip; /* было: overflow: hidden */
}

/* 2. Фон не перехватывает тапы */
.home-pink-bg {
  pointer-events: none; /* добавлено */
}

/* 3. Кнопка Play Now всегда поверх */
.home-bottom {
  position: relative;
  z-index: 5; /* добавлено */
}

/* 4. Perspective для 3D-флипа (как у всех топ-игр) */
.grid {
  perspective: 1000px; /* добавлено */
}

/* 5. Webkit-префикс для transform-style */
.card {
  -webkit-transform-style: preserve-3d; /* добавлено */
  will-change: transform; /* добавлено */
  touch-action: manipulation; /* добавлено */
}

/* 6. inset:0 не работает в Safari <14.1 */
.front, .back {
  top: 0; right: 0; bottom: 0; left: 0; /* было: inset: 0 */
}
```

### Таймер обратного отсчёта

```javascript
const TIMER_CONFIG = { easy: 60, medium: 90, hard: 120 };

function startTimer(seconds) { /* ... */ }
function stopTimer() { /* ... */ }
// При 0 → showLose()
// При ≤10с → мигает красным (CSS animation pulse)
```

---

## Продукты L'Oréal (20 штук)

BASE URL: `https://www.loreal.com/-/media/project/loreal/brand-sites/corp/master/lcorp/4-brands/`

| # | name | label |
|---|------|-------|
| 1 | revitalift | Revitalift Serum |
| 2 | anti-fall | Anti-Fall Serum |
| 3 | ysl-perfume | YSL Perfume |
| 4 | ysl-mascara | YSL Mascara |
| 5 | kerastase | Kérastase Elixir |
| 6 | redken | Redken Treatment |
| 7 | ysl-shots | YSL Pure Shots |
| 8 | lrp-mela | La Roche-Posay Mela B3 |
| 9 | vichy-serum | Vichy Collagen Serum |
| 10 | maybelline-lip | Maybelline Lip |
| 11 | kerastase-prem | Kérastase Première |
| 12 | biotherm-glow | Biotherm Glow Gel |
| 13 | redken-pink | Redken Color |
| 14 | lrp-baume | Cicaplast Baume B5+ |
| 15 | maybelline-con | Maybelline Concealer |
| 16 | biotherm-pink | Biotherm Collagen |
| 17 | biotherm-blue | Biotherm Supreme |
| 18 | itc-cream | IT Cosmetics Cream |
| 19 | itc-serum | IT Cosmetics Serum |
| 20 | redken-gloss | Redken Gloss |

---

## Структура файла index.html (~2000 строк)

```
<head>
  <style>  ← весь CSS (~950 строк)
    #home-screen      (~150 строк)
    #reward-screen    (~160 строк)
    #level-screen     (~110 строк)
    #lobby-screen     (~180 строк)
    #onboarding-screen(~150 строк)
    #game-screen      (~130 строк)
    #win-screen / #lose-screen (~80 строк)
    #product-screen   (~40 строк)
    #glow-screen      (~40 строк)
    #profile-screen   (~40 строк)
    #leaderboard-screen (~40 строк)
  </style>
</head>
<body>
  <!-- 12 экранов HTML -->
  <script>  ← весь JS (~250 строк)
    allCards[], LEVEL_CONFIG, TIMER_CONFIG
    getResponsiveCols(), initGame(), onCardClick()
    startTimer(), stopTimer(), renderTimer()
    showScreen(), startGame(), finishGame()
    showWin(), showLose()
    addEventListener × ~20 кнопок
  </script>
</body>
```

---

## Дальнейшие идеи (не реализованы)

- [ ] Анимация конфетти на Win-экране
- [ ] Сохранение прогресса в `localStorage`
- [ ] Звуковые эффекты при флипе карточки
- [ ] Онлайн-лидерборд (Firebase/Supabase)
- [ ] PWA (иконка, offline-режим)
