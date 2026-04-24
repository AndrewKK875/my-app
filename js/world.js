import * as THREE from 'three';
import { TILE_SIZE, ROW_SIZE, BOARD_HALF } from './player.js';
import { spawnVehiclesForRow, removeVehiclesForRow } from './vehicles.js';

export const rows = [];

const ROWS_AHEAD  = 25;
const ROWS_BEHIND = 6;
let nextRowIndex  = 0;

// Яркая voxel палитра как в референсе
const GRASS_COLORS = [0x5BBF4E, 0x4CAF50];
const ROAD_COLOR   = 0x546E7A;
const WATER_COLORS = [0x1E88E5, 0x1976D2];
const ROW_WIDTH    = (BOARD_HALF * 2 + 3) * TILE_SIZE;

// Брёвна на воде
export const logs = [];

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
    if (old.type === 'road')  removeVehiclesForRow(scene, old.index);
    if (old.type === 'water') removeLogsForRow(scene, old.index);
    scene.remove(old.group);
  }
}

export function isTreeAt(rowIndex, tile) {
  const row = rows.find(r => r.index === rowIndex);
  return row ? row.trees.has(tile) : false;
}

export function updateLogs(delta) {
  for (const log of logs) {
    log.mesh.position.x += log.speed * log.direction * delta;
    const hw = ROW_WIDTH / 2 + log.length / 2;
    if (log.direction > 0 && log.mesh.position.x >  hw) log.mesh.position.x = -hw;
    if (log.direction < 0 && log.mesh.position.x < -hw) log.mesh.position.x =  hw;
  }
}

function removeLogsForRow(scene, rowIndex) {
  for (let i = logs.length - 1; i >= 0; i--) {
    if (logs[i].row === rowIndex) {
      scene.remove(logs[i].mesh);
      logs.splice(i, 1);
    }
  }
}

function addRow(scene, index) {
  const type = pickType(index);
  const group = new THREE.Group();
  const z = -index * ROW_SIZE;
  const rowData = { index, type, group, trees: new Set() };

  // Земля / вода
  let groundColor;
  if (type === 'road')  groundColor = ROAD_COLOR;
  else if (type === 'water') groundColor = WATER_COLORS[index % 2];
  else groundColor = GRASS_COLORS[index % 2];

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

  if (type === 'water') {
    spawnLogsForRow(scene, rowData, z);
  }

  scene.add(group);
  rows.push(rowData);
}

function pickType(index) {
  if (index < 3) return 'grass';
  const r = Math.random();
  if (r < 0.28) return 'forest';
  if (r < 0.55) return 'road';
  if (r < 0.75) return 'water';
  return 'grass';
}

// ── Дорожная разметка ─────────────────────────────────────────────────────────
function addRoadMarkings(group, z, width) {
  const mat      = new THREE.MeshLambertMaterial({ color: 0xEEEEEE });
  const dashGeo  = new THREE.BoxGeometry(0.45, 0.01, 0.12);
  const dashCount = Math.floor(width / 1.2);
  for (let i = 0; i < dashCount; i++) {
    const dash = new THREE.Mesh(dashGeo, mat);
    dash.position.set(-width / 2 + i * 1.2 + 0.6, 0.01, z);
    group.add(dash);
  }
}

// ── Брёвна на воде ────────────────────────────────────────────────────────────
const LOG_MAT   = new THREE.MeshLambertMaterial({ color: 0x8D6E63 });
const LOG_DARK  = new THREE.MeshLambertMaterial({ color: 0x6D4C41 });

function spawnLogsForRow(scene, rowData, z) {
  const direction = Math.random() < 0.5 ? 1 : -1;
  const speed     = 1.2 + Math.random() * 1.8;
  const count     = 2 + Math.floor(Math.random() * 2);
  const spacing   = ROW_WIDTH / count;

  for (let i = 0; i < count; i++) {
    const logLen  = 1.8 + Math.random() * 1.4;
    const x       = -ROW_WIDTH / 2 + i * spacing + spacing * 0.3 + Math.random() * spacing * 0.4;

    const logMesh = new THREE.Group();

    // Основное бревно
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(logLen, 0.28, 0.55),
      LOG_MAT
    );
    body.castShadow = true;
    logMesh.add(body);

    // Торцы
    [-logLen / 2, logLen / 2].forEach(dx => {
      const cap = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.28, 0.55),
        LOG_DARK
      );
      cap.position.x = dx;
      logMesh.add(cap);
    });

    logMesh.position.set(x, 0.12, z);
    scene.add(logMesh);

    logs.push({
      mesh:      logMesh,
      row:       rowData.index,
      speed,
      direction,
      length:    logLen,
    });
  }
}

// ── Деревья ───────────────────────────────────────────────────────────────────
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
  const h = 0.85 + Math.random() * 0.45;

  // Ствол — узкий вoxel блок
  const trunk = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, h * 0.38, 0.2),
    new THREE.MeshLambertMaterial({ color: 0x795548 })
  );
  trunk.position.y = h * 0.19;
  trunk.castShadow = true;
  group.add(trunk);

  // Крона — яркий куб (voxel стиль)
  const shade = Math.random() > 0.5 ? 0x388E3C : 0x43A047;
  const foliage = new THREE.Mesh(
    new THREE.BoxGeometry(0.72, h * 0.72, 0.72),
    new THREE.MeshLambertMaterial({ color: shade })
  );
  foliage.position.y = h * 0.6;
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
