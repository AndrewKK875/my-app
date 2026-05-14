# Havalgame — Mobile Optimization Skills

Источники: GitHub (ThreeJS-Optimization-List, carphysics2d, cannon-racer, micro-racing, HexGL и др.)  
Цель: стабильные 60fps на iPhone 12-16, Galaxy S21-S25, Pixel 6-9, и 30fps на бюджетных Android.

---

## 1. РЕНДЕРЕР

### Отключить антиалиасинг на мобильных
```javascript
const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent);
const renderer = new THREE.WebGLRenderer({
  antialias: !isMobile,
  powerPreference: "high-performance"
});
```
На Retina/AMOLED разница незаметна, а прирост FPS значительный.

### Ограничить pixelRatio
```javascript
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
```
Galaxy S21+ имеет pixelRatio=4 (16x пикселей). Ограничение до 2 даёт +30fps.

### Адаптивный масштаб разрешения
```javascript
const scale = fps < 30 ? 0.75 : 1.0;
renderer.setPixelRatio(scale * Math.min(window.devicePixelRatio, 2));
```

---

## 2. КАМЕРА

### Адаптивный frustum под экран
```javascript
const isMobile = window.innerWidth <= 768;
const camera = new THREE.PerspectiveCamera(
  isMobile ? 50 : 40,   // FOV
  aspect,
  0.1,
  isMobile ? 1200 : 1800 // far plane
);
```
Меньший frustum = меньше объектов в draw calls.

### Frustum Culling (включён по умолчанию)
```javascript
mesh.frustumCulled = true; // не рендерить за камерой
```

---

## 3. ОСВЕЩЕНИЕ

### Иерархия производительности (от быстрого к медленному)
1. `AmbientLight` — без теней, быстрее всего
2. `HemisphereLight` — небо/земля, без теней
3. `DirectionalLight` (без теней)
4. `DirectionalLight` (с тенями) — +1 рендер
5. `SpotLight` (с тенями) — +1 рендер
6. `PointLight` (с тенями) — **×6 рендеров, избегать на мобильных**

### Оптимальная схема освещения для мобильных
```javascript
const sun = new THREE.DirectionalLight('#fff', 1.5);
sun.castShadow = true;
sun.shadow.mapSize.set(512, 512); // не 1024, не 2048
const sky = new THREE.HemisphereLight('#87CEEB', '#8B7355', 0.6);
const fill = new THREE.AmbientLight('#fff', 0.2);
```

### Обновление теней по требованию
```javascript
renderer.shadowMap.autoUpdate = false;
// Включать только когда объекты двигаются:
renderer.shadowMap.needsUpdate = true;
```

---

## 4. ГЕОМЕТРИЯ И МЕШИ

### LOD — уровни детализации
```javascript
const lod = new THREE.LOD();
lod.addLevel(highPolyMesh, 0);    // 0–100 юнитов
lod.addLevel(medPolyMesh, 100);   // 100–200 юнитов
lod.addLevel(lowPolyMesh, 200);   // 200+ юнитов
scene.add(lod);
```
Улучшает FPS на 30-40% в больших сценах.

### Instancing — деревья, камни, декорации
```javascript
const mesh = new THREE.InstancedMesh(geometry, material, 1000);
for (let i = 0; i < 1000; i++) {
  matrix.setPosition(x, y, z);
  mesh.setMatrixAt(i, matrix);
}
// 1000 объектов = 1 draw call
```

### Полигональный бюджет
| Устройство | Треугольники |
|---|---|
| iPhone 12-16 / Galaxy S21-25 | до 100k |
| Pixel 6-9 | до 80k |
| Бюджетный Android | до 30k |
| **Цель для Havalgame** | **30-50k** |

---

## 5. МАТЕРИАЛЫ

### Иерархия (от быстрого к медленному)
1. `MeshBasicMaterial` — без освещения
2. `MeshLambertMaterial`
3. `MeshPhongMaterial` ← **оптимальный выбор для игры**
4. `MeshStandardMaterial` — дорогой, избегать на мобильных

### Переиспользование материалов
```javascript
// Создать один раз, использовать везде
const roadMaterial = new THREE.MeshPhongMaterial({ color: 0x8B7355 });
const treeMaterial = new THREE.MeshPhongMaterial({ color: 0x2D5A27 });
```
Каждый уникальный материал = перекомпиляция шейдера.

---

## 6. ТЕКСТУРЫ

### Сжатые текстуры (KTX2/Basis)
```javascript
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader';
const ktx2Loader = new KTX2Loader();
ktx2Loader.setTranscoderPath('basis/');
const texture = await ktx2Loader.loadAsync('terrain.ktx2');
```
60-80% экономия памяти. ASTC для iOS, ETC2 для Android — автоматически.

### Максимальные размеры текстур
| Платформа | Размер |
|---|---|
| Флагман iPhone/Android | 1024×1024 |
| Бюджетный Android | 512×512 |
| Terrain tileable | 512×512 |

### Mipmaps
```javascript
texture.generateMipmaps = true;
texture.minFilter = THREE.LinearMipmapLinearFilter;
```

---

## 7. GLB / GLTF МОДЕЛИ

### Draco сжатие (90% меньше геометрии)
```javascript
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('draco/');
gltfLoader.setDRACOLoader(dracoLoader);
```

### Оптимизация через gltfpack
```bash
gltfpack -c input.glb -o output.glb
```

---

## 8. ФИЗИКА (Cannon.js)

### Режим сна для неактивных тел
```javascript
body.allowSleep = true;
body.sleepSpeedLimit = 0.1;
body.sleepTimeLimit = 1.0;
```

### Физика на 30fps, рендер на 60fps
```javascript
const PHYSICS_FPS = 30;
let lastPhysics = 0;
function animate(time) {
  if (time - lastPhysics >= 1000 / PHYSICS_FPS) {
    world.step(1 / PHYSICS_FPS);
    lastPhysics = time;
  }
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
```

### Упрощённый коллайдер машины
```javascript
// Не используй точную mesh машины — используй Box или Compound
const carBody = new CANNON.Box(new CANNON.Vec3(1, 0.5, 2));
```

---

## 9. TOUCH УПРАВЛЕНИЕ

### Виртуальный джойстик
```javascript
// Основа — touchstart/touchmove/touchend
let joystickActive = false;
let joystickOrigin = { x: 0, y: 0 };
let joystickDelta = { x: 0, y: 0 };

canvas.addEventListener('touchstart', e => {
  joystickActive = true;
  joystickOrigin = { x: e.touches[0].clientX, y: e.touches[0].clientY };
});
canvas.addEventListener('touchmove', e => {
  if (!joystickActive) return;
  joystickDelta = {
    x: (e.touches[0].clientX - joystickOrigin.x) / 50,
    y: (e.touches[0].clientY - joystickOrigin.y) / 50
  };
});
canvas.addEventListener('touchend', () => {
  joystickActive = false;
  joystickDelta = { x: 0, y: 0 };
});
```

### Дросселирование touch событий
```javascript
let lastTouch = 0;
canvas.addEventListener('touchmove', e => {
  const now = Date.now();
  if (now - lastTouch < 16) return; // ~60fps
  lastTouch = now;
  // обработка
});
```

---

## 10. iOS SAFARI ФИКСЫ

```javascript
// inset не поддерживается до Safari 14.1 — использовать:
element.style.top = '0';
element.style.right = '0';
element.style.bottom = '0';
element.style.left = '0';

// overflow на контейнере
element.style.overflowX = 'clip'; // не 'hidden'

// 3D трансформации
card.style.webkitTransformStyle = 'preserve-3d';
card.style.webkitBackfaceVisibility = 'hidden';

// Перспектива для Safari
scene.style.perspective = '1000px';
```

### Viewport meta
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, 
      maximum-scale=1.0, user-scalable=no">
```

### Заблокировать нативный скролл
```css
body { touch-action: none; overflow: hidden; }
canvas { touch-action: none; }
```

### Аудио только после жеста
```javascript
// iOS требует пользовательский жест перед AudioContext
document.addEventListener('touchstart', () => {
  audioContext.resume();
}, { once: true });
```

### WebGL Context Loss
```javascript
canvas.addEventListener('webglcontextlost', e => {
  e.preventDefault();
  // приостановить анимацию
}, false);
canvas.addEventListener('webglcontextrestored', () => {
  // восстановить рендерер
}, false);
```

---

## 11. УПРАВЛЕНИЕ ПАМЯТЬЮ

### Dispose при смене сцены
```javascript
function disposeScene(scene) {
  scene.traverse(child => {
    if (child.geometry) child.geometry.dispose();
    if (child.material) {
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      mats.forEach(m => {
        if (m.map) m.map.dispose();
        m.dispose();
      });
    }
  });
}
```
Критично для iOS Safari — без dispose краш на 5-6й навигации.

---

## 12. АДАПТИВНОЕ КАЧЕСТВО

```javascript
let frameCount = 0, fps = 60;
setInterval(() => {
  fps = frameCount;
  frameCount = 0;
  if (fps < 30) {
    renderer.setPixelRatio(1);
    sun.castShadow = false;
  } else if (fps > 50) {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    sun.castShadow = true;
  }
}, 1000);
function animate() {
  frameCount++;
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
```

---

## 13. МОНИТОРИНГ (DEV режим)

```javascript
import Stats from 'three/examples/jsm/libs/stats.module';
const stats = new Stats();
if (isDev) document.body.appendChild(stats.dom);
function animate() {
  stats.begin();
  renderer.render(scene, camera);
  stats.end();
  requestAnimationFrame(animate);
}
```

---

## Целевые показатели для Havalgame

| Метрика | Флагман | Бюджетный Android |
|---|---|---|
| FPS | 60 | 30+ |
| Draw calls | < 150 | < 80 |
| Треугольники | < 100k | < 30k |
| Текстуры | 1024px | 512px |
| WebGL память | < 200MB | < 100MB |

---

## Источники

- [ThreeJS-Optimization-List](https://github.com/sboez/ThreeJS-Optimization-List)
- [carphysics2d](https://github.com/spacejack/carphysics2d)
- [cannon-racer](https://github.com/Chmood/cannon-racer)
- [micro-racing](https://github.com/Mati365/micro-racing)
- [HexGL](https://github.com/BKcore/HexGL)
- [Dust Racing 2D](https://github.com/juzzlin/DustRacing2D)
- [three-joystick](https://github.com/SimonMo88/three-joystick)
- [MDN WebGL Best Practices](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices)
- [discoverthreejs.com](https://discoverthreejs.com/tips-and-tricks/)
