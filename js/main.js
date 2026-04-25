import * as THREE from 'three';
import { createPlayer, updatePlayer } from './player.js';
import { createInitialRows, generateRowsAhead, isTreeAt, updateLogs } from './world.js';
import { updateVehicles, preloadModels } from './vehicles.js';
import { checkCollision } from './collision.js';
import { initControls } from './controls.js';

// ── Renderer ──────────────────────────────────────────────────────────────────
const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent);

const renderer = new THREE.WebGLRenderer({
  antialias: !isMobile,
  powerPreference: 'high-performance',
  // Needed for correct alpha on iOS Safari
  alpha: false,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// WebGL context loss — critical for iOS Safari background/foreground
renderer.domElement.addEventListener('webglcontextlost', (e) => {
  e.preventDefault();
  running = false;
}, false);
renderer.domElement.addEventListener('webglcontextrestored', () => {
  running = true;
}, false);

// ── Scene ─────────────────────────────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x6EC6F5);
scene.fog = new THREE.Fog(0x6EC6F5, 28, 52);

// ── Camera (orthographic) ─────────────────────────────────────────────────────
const viewSize = 8;
let aspect = window.innerWidth / window.innerHeight;
const camera = new THREE.OrthographicCamera(
  -viewSize * aspect, viewSize * aspect,
  viewSize, -viewSize,
  0.1, 100
);
camera.position.set(0, 15, 15);
camera.lookAt(0, 0, 0);

// ── Lighting ──────────────────────────────────────────────────────────────────
const sun = new THREE.DirectionalLight(0xFFFFFF, 1.5);
sun.position.set(5, 15, 10);
sun.castShadow = true;
sun.shadow.mapSize.set(512, 512);
sun.shadow.camera.left   = -20;
sun.shadow.camera.right  =  20;
sun.shadow.camera.top    =  20;
sun.shadow.camera.bottom = -20;
sun.shadow.camera.near   = 0.1;
sun.shadow.camera.far    = 80;
scene.add(sun);
scene.add(new THREE.HemisphereLight(0x87CEEB, 0x8B7355, 0.8));

// ── Game setup ────────────────────────────────────────────────────────────────
const player = createPlayer(scene);
initControls();

// Загружаем GLB SUV, потом генерируем мир
await preloadModels();
createInitialRows(scene);

const scoreEl     = document.getElementById('score-display');
const gameoverEl  = document.getElementById('gameover');
const finalScoreEl = document.getElementById('final-score');

let running = true;
let score   = 0;

// ── Game loop ─────────────────────────────────────────────────────────────────
let lastTime = 0;

function animate(time) {
  requestAnimationFrame(animate);
  const delta = Math.min((time - lastTime) / 1000, 0.05);
  lastTime = time;

  if (!running) return;

  updatePlayer(player, delta, isTreeAt);
  updateVehicles(delta);
  updateLogs(delta);
  generateRowsAhead(scene, player.row);

  if (player.row > score) {
    score = player.row;
    scoreEl.textContent = score;
  }

  // Smooth camera follow
  const px = player.mesh.position.x;
  const pz = player.mesh.position.z;
  camera.position.x += (px      - camera.position.x) * 0.1;
  camera.position.z += (pz + 15 - camera.position.z) * 0.1;
  camera.lookAt(px, 0, pz);

  if (checkCollision(player)) {
    running = false;
    finalScoreEl.textContent = score;
    gameoverEl.style.display = 'flex';
  }

  renderer.render(scene, camera);
}

animate(0);

// ── Resize (debounced — prevents iOS resize storm) ────────────────────────────
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    aspect = window.innerWidth / window.innerHeight;
    camera.left  = -viewSize * aspect;
    camera.right =  viewSize * aspect;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }, 100);
});

// Orientation change — iOS fires resize late
window.addEventListener('orientationchange', () => {
  setTimeout(() => {
    aspect = window.innerWidth / window.innerHeight;
    camera.left  = -viewSize * aspect;
    camera.right =  viewSize * aspect;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }, 300);
});
