import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { TILE_SIZE, BOARD_HALF } from './player.js';

export const vehicles = [];

// ─── Templates (loaded once, cloned per spawn) ───────────────────────────────
const TEMPLATES = { tank300: null, f7: null, dargo: null, jolion: null, poer: null };

const MODEL_FILES = {
  tank300: 'assets/models/tank300.glb',
  f7:      'assets/models/F7.glb',
  dargo:   'assets/models/Dargo.glb',
  jolion:  'assets/models/Jolion.glb',
  poer:    'assets/models/poer.glb',
};

const TARGET_SIZE = 1.8;

function normalizeTemplate(model) {
  const box   = new THREE.Box3().setFromObject(model);
  const size  = box.getSize(new THREE.Vector3());
  model.scale.setScalar(TARGET_SIZE / Math.max(size.x, size.y, size.z));
  box.setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  model.position.x -= center.x;
  model.position.z -= center.z;
  model.position.y -= box.min.y;
  model.traverse(c => {
    if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; }
  });
  // Canonical: все модели смотрят по +X при rotation.y = Math.PI
  model.rotation.y = Math.PI;
}

export function preloadModels() {
  const draco = new DRACOLoader();
  draco.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/draco/');
  const loader = new GLTFLoader();
  loader.setDRACOLoader(draco);
  const promises = Object.entries(MODEL_FILES).map(([key, file]) =>
    new Promise(resolve => {
      loader.load(file, (gltf) => {
        normalizeTemplate(gltf.scene);
        TEMPLATES[key] = gltf.scene;
        resolve();
      }, null, () => resolve());
    })
  );
  return Promise.all(promises);
}

// ─── Constants ────────────────────────────────────────────────────────────────
const VEHICLE_WIDTH = 1.0;
const HALF_ROAD     = (BOARD_HALF + 3) * TILE_SIZE;
const MODEL_KEYS    = ['tank300', 'f7', 'dargo', 'jolion', 'poer'];

// ─── Spawn ────────────────────────────────────────────────────────────────────
export function spawnVehiclesForRow(scene, rowData) {
  const { direction, speed } = rowData;
  const z      = -rowData.index * 1.5;
  const count  = 2 + Math.floor(Math.random() * 3);
  const slotW  = (HALF_ROAD * 2) / count;
  const minGap = VEHICLE_WIDTH * 1.4;

  for (let i = 0; i < count; i++) {
    const slotStart = -HALF_ROAD + i * slotW;
    const maxOffset = Math.max(0, slotW - minGap);
    const x         = slotStart + minGap * 0.5 + Math.random() * maxOffset;

    const key  = MODEL_KEYS[Math.floor(Math.random() * MODEL_KEYS.length)];
    const mesh = buildGLB(key, direction);
    mesh.position.set(x, 0, z);
    scene.add(mesh);
    vehicles.push({ mesh, row: rowData.index, speed, direction, width: VEHICLE_WIDTH });
  }
}

// ─── Update & cleanup ─────────────────────────────────────────────────────────
export function updateVehicles(delta) {
  for (const v of vehicles) {
    v.mesh.position.x += v.speed * v.direction * delta;
    const edge = HALF_ROAD + v.width;
    if (v.direction > 0 && v.mesh.position.x >  edge) v.mesh.position.x = -edge;
    if (v.direction < 0 && v.mesh.position.x < -edge) v.mesh.position.x =  edge;
  }
}

export function removeVehiclesForRow(scene, rowIndex) {
  for (let i = vehicles.length - 1; i >= 0; i--) {
    if (vehicles[i].row === rowIndex) {
      scene.remove(vehicles[i].mesh);
      vehicles.splice(i, 1);
    }
  }
}

// ─── Builder ──────────────────────────────────────────────────────────────────
function buildGLB(key, direction) {
  const pivot = new THREE.Group();
  const tmpl  = TEMPLATES[key];
  if (tmpl) pivot.add(tmpl.clone(true));
  if (direction === -1) pivot.rotation.y = Math.PI;
  return pivot;
}
