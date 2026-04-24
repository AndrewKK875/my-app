import * as THREE from 'three';
import { TILE_SIZE, ROW_SIZE, BOARD_HALF } from './player.js';
import { spawnVehiclesForRow, removeVehiclesForRow } from './vehicles.js';

export const rows = [];

const ROWS_AHEAD  = 25;
const ROWS_BEHIND = 6;
let nextRowIndex  = 0;

const GRASS_COLORS = [0x5DBB63, 0x4CAF50];
const ROAD_COLOR   = 0x607060;
const ROW_WIDTH    = (BOARD_HALF * 2 + 3) * TILE_SIZE;

export function createInitialRows(scene) {
  for (let i = 0; i < ROWS_AHEAD; i++) addRow(scene, i);
  nextRowIndex = ROWS_AHEAD;
}

export function generateRowsAhead(scene, currentRow) {
  while (nextRowIndex < currentRow + ROWS_AHEAD) {
    addRow(scene, nextRowIndex++);
  }
  while (rows.length > 0 && rows[0].index < currentRow - ROWS_BEHIND) {
    const old = rows.shift();
    if (old.type === 'road') removeVehiclesForRow(scene, old.index);
    scene.remove(old.group);
  }
}

export function isTreeAt(rowIndex, tile) {
  const row = rows.find(r => r.index === rowIndex);
  return row ? row.trees.has(tile) : false;
}

function addRow(scene, index) {
  const type = pickType(index);
  const group = new THREE.Group();
  const z = -index * ROW_SIZE;
  const rowData = { index, type, group, trees: new Set() };

  const groundColor = type === 'road'
    ? ROAD_COLOR
    : GRASS_COLORS[index % 2];

  const ground = new THREE.Mesh(
    new THREE.BoxGeometry(ROW_WIDTH, 0.2, ROW_SIZE),
    new THREE.MeshLambertMaterial({ color: groundColor })
  );
  ground.position.set(0, -0.1, z);
  ground.receiveShadow = true;
  group.add(ground);

  if (type === 'road') {
    addRoadMarkings(group, z, ROW_WIDTH);
    rowData.direction = Math.random() < 0.5 ? 1 : -1;
    rowData.speed = [2.5, 3.5, 5][Math.floor(Math.random() * 3)];
    spawnVehiclesForRow(scene, rowData);
  }

  if (type === 'forest') {
    placeForestTrees(group, rowData, z);
  }

  scene.add(group);
  rows.push(rowData);
}

function pickType(index) {
  if (index < 3) return 'grass';
  const r = Math.random();
  if (r < 0.35) return 'forest';
  if (r < 0.70) return 'road';
  return 'grass';
}

// Создаём текстуру с надписью один раз и переиспользуем
const havalTexture = createHavalTexture();

function createHavalTexture() {
  const canvas = document.createElement('canvas');
  canvas.width  = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 512, 128);
  ctx.font = 'bold 72px Arial Black, Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // Обводка
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 6;
  ctx.strokeText('HAVAL', 256, 64);
  // Заливка
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.fillText('HAVAL', 256, 64);
  const tex = new THREE.CanvasTexture(canvas);
  return tex;
}

function addRoadMarkings(group, z, width) {
  const mat = new THREE.MeshLambertMaterial({ color: 0xCCCCCC });
  const dashCount = Math.floor(width / 1.2);
  const dashGeo = new THREE.BoxGeometry(0.5, 0.01, 0.1);
  for (let i = 0; i < dashCount; i++) {
    const dash = new THREE.Mesh(dashGeo, mat);
    dash.position.set(-width / 2 + i * 1.2 + 0.6, 0.01, z);
    group.add(dash);
  }

  // Надпись HAVAL на дороге
  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(width * 0.7, ROW_SIZE * 0.7),
    new THREE.MeshBasicMaterial({ map: havalTexture, transparent: true, depthWrite: false })
  );
  plane.rotation.x = -Math.PI / 2;
  plane.position.set(0, 0.02, z);
  group.add(plane);
}

function placeForestTrees(group, rowData, z) {
  const tiles = [];
  for (let t = -BOARD_HALF; t <= BOARD_HALF; t++) tiles.push(t);
  shuffle(tiles);
  const count = 2 + Math.floor(Math.random() * 3);
  for (let i = 0; i < count; i++) {
    const tile = tiles[i];
    rowData.trees.add(tile);
    const tree = createTree();
    tree.position.set(tile * TILE_SIZE, 0, z);
    group.add(tree);
  }
}

function createTree() {
  const group = new THREE.Group();
  const h = 0.9 + Math.random() * 0.5;

  const trunk = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, h * 0.4, 0.22),
    new THREE.MeshLambertMaterial({ color: 0x8B5E3C })
  );
  trunk.position.y = h * 0.2;
  trunk.castShadow = true;
  group.add(trunk);

  const foliage = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, h * 0.75, 0.7),
    new THREE.MeshLambertMaterial({ color: 0x2D7A27 })
  );
  foliage.position.y = h * 0.62;
  foliage.castShadow = true;
  group.add(foliage);

  return group;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
