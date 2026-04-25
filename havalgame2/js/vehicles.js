import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { TILE_SIZE, BOARD_HALF } from './player.js';

export const vehicles = [];

// ─── Shared geometries (created once, reused) ────────────────────────────────
const GEO = {
  // Car body parts
  carBody:    new THREE.BoxGeometry(1.0,  0.38, 0.62),
  carRoof:    new THREE.BoxGeometry(0.62, 0.26, 0.58),
  carGlass:   new THREE.BoxGeometry(0.05, 0.22, 0.52),
  carGrille:  new THREE.BoxGeometry(0.05, 0.20, 0.52),
  carBumper:  new THREE.BoxGeometry(0.06, 0.10, 0.62),
  carLight:   new THREE.BoxGeometry(0.05, 0.08, 0.14),
  // Truck
  truckCargo: new THREE.BoxGeometry(1.10, 0.48, 0.56),
  truckCabin: new THREE.BoxGeometry(0.46, 0.44, 0.52),
  // Bus
  busBody:    new THREE.BoxGeometry(1.85, 0.52, 0.60),
  busWindows: new THREE.BoxGeometry(1.45, 0.18, 0.62),
  busFront:   new THREE.BoxGeometry(0.06, 0.52, 0.60),
  // Voxel wheel (box — matches reference style)
  wheel:      new THREE.BoxGeometry(0.14, 0.24, 0.24),
};

// ─── Shared materials ─────────────────────────────────────────────────────────
const MAT = {
  dark:   new THREE.MeshLambertMaterial({ color: 0x1a1a1a }),
  glass:  new THREE.MeshLambertMaterial({ color: 0x7EC8E3, transparent: true, opacity: 0.80 }),
  chrome: new THREE.MeshLambertMaterial({ color: 0xCCCCCC }),
  light:  new THREE.MeshLambertMaterial({ color: 0xFFFDE7 }),
  wheel:  new THREE.MeshLambertMaterial({ color: 0x212121 }),
  rim:    new THREE.MeshLambertMaterial({ color: 0x9E9E9E }),
};

// ─── GLB SUV (loaded once, cloned per instance) ───────────────────────────────
let suvTemplate = null;

export function preloadSUV() {
  return new Promise((resolve) => {
    const loader = new GLTFLoader();
    loader.load(
      'assets/models/player.glb',
      (gltf) => {
        const model = gltf.scene;
        const box   = new THREE.Box3().setFromObject(model);
        const size  = box.getSize(new THREE.Vector3());
        const scale = 0.9 / Math.max(size.x, size.z);
        model.scale.setScalar(scale);
        box.setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        model.position.x -= center.x;
        model.position.z -= center.z;
        model.position.y -= box.min.y;
        model.traverse(c => {
          if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; }
        });
        suvTemplate = model;
        resolve();
      },
      null,
      () => resolve()
    );
  });
}

// ─── Vehicle colors ───────────────────────────────────────────────────────────
const COLORS = {
  car:   [0xE53935, 0x1E88E5, 0x43A047, 0xFDD835, 0xFB8C00, 0x8E24AA, 0xFFFFFF, 0x222222],
  truck: [0xFB8C00, 0x00ACC1, 0x6D4C41, 0x546E7A],
  bus:   [0xFFEB3B, 0xFF7043, 0x26C6DA, 0xEC407A],
};

function rndColor(type) {
  const arr = COLORS[type];
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── Vehicle widths (for collision + spacing) ─────────────────────────────────
const WIDTHS = { suv: 1.0, car: 1.1, truck: 1.65, bus: 2.0 };

const HALF_ROAD = (BOARD_HALF + 3) * TILE_SIZE; // edge of visible road

// ─── Spawn logic ──────────────────────────────────────────────────────────────
// Типы транспорта на ряд: 60% SUV+car mix, 25% truck, 15% bus
function pickRowType() {
  const r = Math.random();
  if (r < 0.60) return 'car';   // spawns SUVs + box cars mixed
  if (r < 0.85) return 'truck';
  return 'bus';
}

export function spawnVehiclesForRow(scene, rowData) {
  const rowType  = pickRowType();
  const { direction, speed } = rowData;
  const z = -rowData.index * 1.5;

  // Количество машин зависит от типа
  const maxCount = { car: 4, truck: 3, bus: 2 }[rowType];
  const count    = 2 + Math.floor(Math.random() * (maxCount - 1));

  // Tile-based placement с гарантированным зазором
  // Доступная длина полосы: HALF_ROAD * 2
  // Равномерно делим на count слотов, внутри каждого — случайный офсет
  const slotW   = (HALF_ROAD * 2) / count;
  const minGap  = WIDTHS[rowType] * 1.4; // минимальный зазор = 1.4x ширины машины

  for (let i = 0; i < count; i++) {
    const slotStart = -HALF_ROAD + i * slotW;
    // Случайный офсет внутри слота, с учётом минимального зазора по краям
    const maxOffset = Math.max(0, slotW - minGap);
    const x = slotStart + minGap * 0.5 + Math.random() * maxOffset;

    // Для car ряда — чередуем SUV и box car
    let mesh, vWidth;
    if (rowType === 'car') {
      const useSUV = suvTemplate && Math.random() > 0.4;
      mesh   = useSUV ? buildSUV(direction) : buildCar(rndColor('car'), direction);
      vWidth = WIDTHS[useSUV ? 'suv' : 'car'];
    } else if (rowType === 'truck') {
      mesh   = buildTruck(rndColor('truck'), direction);
      vWidth = WIDTHS.truck;
    } else {
      mesh   = buildBus(rndColor('bus'), direction);
      vWidth = WIDTHS.bus;
    }

    mesh.position.set(x, 0, z);
    mesh.castShadow = true;
    scene.add(mesh);

    vehicles.push({ mesh, row: rowData.index, speed, direction, width: vWidth });
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

// ─── Builders ─────────────────────────────────────────────────────────────────

// GLB SUV — pivot группа чтобы направление не конфликтовало с моделью
function buildSUV(direction) {
  const pivot = new THREE.Group();
  const clone = suvTemplate.clone(true);
  // Модель смотрит по +Z — разворачиваем чтобы ехала по +X
  clone.rotation.y = Math.PI;
  pivot.add(clone);
  if (direction === -1) pivot.rotation.y = Math.PI;
  return pivot;
}

// Box car — voxel стиль
function buildCar(color, direction) {
  const group = new THREE.Group();
  const mat   = new THREE.MeshLambertMaterial({ color });

  // Кузов
  const body = new THREE.Mesh(GEO.carBody, mat);
  body.position.y = 0.28;
  body.castShadow = true;
  group.add(body);

  // Крыша
  const roof = new THREE.Mesh(GEO.carRoof, mat);
  roof.position.set(-0.05, 0.56, 0);
  roof.castShadow = true;
  group.add(roof);

  // Лобовое стекло
  const ws = new THREE.Mesh(GEO.carGlass, MAT.glass);
  ws.position.set(0.30, 0.54, 0);
  group.add(ws);

  // Заднее стекло
  const rs = new THREE.Mesh(GEO.carGlass, MAT.glass);
  rs.position.set(-0.36, 0.54, 0);
  group.add(rs);

  // Решётка + фары
  const grille = new THREE.Mesh(GEO.carGrille, MAT.dark);
  grille.position.set(0.52, 0.22, 0);
  group.add(grille);

  [-0.20, 0.20].forEach(dz => {
    const lt = new THREE.Mesh(GEO.carLight, MAT.light);
    lt.position.set(0.52, 0.34, dz);
    group.add(lt);
  });

  // Бампер
  const bumper = new THREE.Mesh(GEO.carBumper, MAT.chrome);
  bumper.position.set(0.51, 0.08, 0);
  group.add(bumper);

  addVoxelWheels(group, 0.90, 0.60);

  if (direction === -1) group.rotation.y = Math.PI;
  return group;
}

// Грузовик
function buildTruck(color, direction) {
  const group = new THREE.Group();

  const cargo = new THREE.Mesh(GEO.truckCargo, new THREE.MeshLambertMaterial({ color }));
  cargo.position.set(-0.28, 0.30, 0);
  cargo.castShadow = true;
  group.add(cargo);

  const cabin = new THREE.Mesh(GEO.truckCabin, new THREE.MeshLambertMaterial({ color: 0x78909C }));
  cabin.position.set(0.60, 0.28, 0);
  cabin.castShadow = true;
  group.add(cabin);

  // Стекло кабины
  const cg = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 0.20, 0.46),
    MAT.glass
  );
  cg.position.set(0.83, 0.34, 0);
  group.add(cg);

  addVoxelWheels(group, 1.55, 0.56);
  if (direction === -1) group.rotation.y = Math.PI;
  return group;
}

// Автобус
function buildBus(color, direction) {
  const group = new THREE.Group();

  const body = new THREE.Mesh(GEO.busBody, new THREE.MeshLambertMaterial({ color }));
  body.position.y = 0.32;
  body.castShadow = true;
  group.add(body);

  // Полоса окон
  const wins = new THREE.Mesh(GEO.busWindows, MAT.glass);
  wins.position.set(0, 0.50, 0);
  group.add(wins);

  // Передняя морда (тёмная)
  const front = new THREE.Mesh(GEO.busFront, MAT.dark);
  front.position.set(0.94, 0.32, 0);
  group.add(front);

  // Фары автобуса
  [-0.22, 0.22].forEach(dz => {
    const lt = new THREE.Mesh(GEO.carLight, MAT.light);
    lt.position.set(0.94, 0.44, dz);
    group.add(lt);
  });

  addVoxelWheels(group, 1.80, 0.60);
  if (direction === -1) group.rotation.y = Math.PI;
  return group;
}

// Voxel колёса — BoxGeometry вместо цилиндров
function addVoxelWheels(group, length, depth) {
  const axleW = depth / 2 + 0.08;
  const positions = [
    [-length * 0.30,  axleW],
    [-length * 0.30, -axleW],
    [ length * 0.30,  axleW],
    [ length * 0.30, -axleW],
  ];
  for (const [x, z] of positions) {
    const w = new THREE.Mesh(GEO.wheel, MAT.wheel);
    w.position.set(x, 0.12, z);
    group.add(w);
  }
}
