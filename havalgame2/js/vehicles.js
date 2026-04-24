import * as THREE from 'three';
import { TILE_SIZE, BOARD_HALF } from './player.js';

export const vehicles = [];

// Tank 300 реальные цвета: пустынный бежевый, оливковый, серебро, чёрный, белый, хаки
const CAR_COLORS   = [0xC4A862, 0x4A5E3A, 0xA8A8A8, 0x222222, 0xF0EFE8, 0x7B8B6F];
const TRUCK_COLORS = [0xFB8C00, 0x00ACC1, 0x6D4C41];
const BUS_COLORS   = [0xFFEB3B, 0xFF7043, 0x26C6DA];

const HALF_WIDTH = (BOARD_HALF + 3) * TILE_SIZE;

const VEHICLE_WIDTHS = { car: 1.1, truck: 1.5, bus: 2.0 };

function pickType() {
  const r = Math.random();
  if (r < 0.55) return 'car';
  if (r < 0.80) return 'truck';
  return 'bus';
}

function pickColor(type) {
  const map = { car: CAR_COLORS, truck: TRUCK_COLORS, bus: BUS_COLORS };
  const arr = map[type];
  return arr[Math.floor(Math.random() * arr.length)];
}

export function spawnVehiclesForRow(scene, rowData) {
  const type    = pickType();
  const count   = type === 'bus' ? 1 + Math.floor(Math.random() * 2) : 2 + Math.floor(Math.random() * 3);
  const spacing = (HALF_WIDTH * 2) / count;

  for (let i = 0; i < count; i++) {
    const color = pickColor(type);
    const x = -HALF_WIDTH + i * spacing + Math.random() * spacing * 0.6;
    const z = -rowData.index * 1.5;

    const mesh = type === 'truck' ? createTruck(color)
               : type === 'bus'   ? createBus(color)
               : createCar(color);
    mesh.position.set(x, 0, z);
    if (rowData.direction === -1) mesh.rotation.y = Math.PI;
    scene.add(mesh);

    vehicles.push({
      mesh,
      row:       rowData.index,
      speed:     rowData.speed,
      direction: rowData.direction,
      width:     VEHICLE_WIDTHS[type],
    });
  }
}

export function updateVehicles(delta) {
  for (const v of vehicles) {
    v.mesh.position.x += v.speed * v.direction * delta;
    if (v.direction > 0 && v.mesh.position.x >  HALF_WIDTH + v.width) v.mesh.position.x = -HALF_WIDTH - v.width;
    if (v.direction < 0 && v.mesh.position.x < -HALF_WIDTH - v.width) v.mesh.position.x =  HALF_WIDTH + v.width;
  }
}

export function removeVehiclesForRow(scene, rowIndex) {
  for (let i = vehicles.length - 1; i >= 0; i--) {
    if (vehicles[i].row === rowIndex) {
      scene.remove(vehicles[i].mesh);
      vehicles[i].mesh.traverse(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      });
      vehicles.splice(i, 1);
    }
  }
}

// GWM Tank 300 — бокси внедорожник
function createCar(color) {
  const group = new THREE.Group();
  const mat   = new THREE.MeshLambertMaterial({ color });
  const dark  = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
  const glass = new THREE.MeshLambertMaterial({ color: 0x88BBCC, transparent: true, opacity: 0.85 });
  const chrome = new THREE.MeshLambertMaterial({ color: 0xCCCCCC });

  // Основной кузов — высокий и широкий
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.42, 0.68), mat);
  body.position.y = 0.26;
  body.castShadow = true;
  group.add(body);

  // Крыша — почти такая же ширина (бокси стиль)
  const roof = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.28, 0.64), mat);
  roof.position.set(-0.02, 0.61, 0);
  roof.castShadow = true;
  group.add(roof);

  // Лобовое стекло (наклонное — имитация через позицию)
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.24, 0.58), glass);
  windshield.position.set(0.34, 0.59, 0);
  group.add(windshield);

  // Заднее стекло
  const rearGlass = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.24, 0.58), glass);
  rearGlass.position.set(-0.38, 0.59, 0);
  group.add(rearGlass);

  // Боковые стёкла
  const sideGlassGeo = new THREE.BoxGeometry(0.58, 0.2, 0.02);
  [-0.33, 0.33].forEach(z => {
    const sg = new THREE.Mesh(sideGlassGeo, glass);
    sg.position.set(-0.02, 0.62, z);
    group.add(sg);
  });

  // Решётка радиатора (чёрная, массивная)
  const grille = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.22, 0.56), dark);
  grille.position.set(0.535, 0.22, 0);
  group.add(grille);

  // Хромовая полоса на решётке
  const grillebar = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, 0.56), chrome);
  grillebar.position.set(0.535, 0.28, 0);
  group.add(grillebar);

  // Прямоугольные фары (пара)
  [-0.22, 0.22].forEach(z => {
    const light = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, 0.14), new THREE.MeshLambertMaterial({ color: 0xFFFFDD }));
    light.position.set(0.535, 0.36, z);
    group.add(light);
  });

  // Бампер
  const bumper = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 0.68), chrome);
  bumper.position.set(0.525, 0.1, 0);
  group.add(bumper);

  // Подножки по бокам
  [-0.36, 0.36].forEach(z => {
    const step = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.04, 0.06), dark);
    step.position.set(0, 0.06, z);
    group.add(step);
  });

  addTank300Wheels(group);
  return group;
}

function addTank300Wheels(group) {
  const tireGeo  = new THREE.CylinderGeometry(0.155, 0.155, 0.1, 10);
  const rimGeo   = new THREE.CylinderGeometry(0.09, 0.09, 0.11, 8);
  const tireMat  = new THREE.MeshLambertMaterial({ color: 0x111111 });
  const rimMat   = new THREE.MeshLambertMaterial({ color: 0x888888 });

  const xs = [-0.35, 0.35];
  const zs = [ 0.4,  -0.4];
  for (const x of xs) for (const z of zs) {
    const tire = new THREE.Mesh(tireGeo, tireMat);
    tire.rotation.z = Math.PI / 2;
    tire.position.set(x, 0.155, z);
    group.add(tire);

    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.rotation.z = Math.PI / 2;
    rim.position.set(x, 0.155, z);
    group.add(rim);
  }
}

function createTruck(color) {
  const group = new THREE.Group();

  const cargo = new THREE.Mesh(
    new THREE.BoxGeometry(1.1, 0.45, 0.55),
    new THREE.MeshLambertMaterial({ color })
  );
  cargo.position.set(-0.25, 0.28, 0);
  cargo.castShadow = true;
  group.add(cargo);

  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(0.48, 0.42, 0.52),
    new THREE.MeshLambertMaterial({ color: 0x78909C })
  );
  cabin.position.set(0.6, 0.26, 0);
  cabin.castShadow = true;
  group.add(cabin);

  addWheels(group, 1.4, 0.55);
  return group;
}

function createBus(color) {
  const group = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(1.9, 0.55, 0.6),
    new THREE.MeshLambertMaterial({ color })
  );
  body.position.y = 0.32;
  body.castShadow = true;
  group.add(body);

  // Windows strip
  const windows = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 0.2, 0.61),
    new THREE.MeshLambertMaterial({ color: 0xADD8E6 })
  );
  windows.position.set(0, 0.52, 0);
  group.add(windows);

  // Front face
  const front = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 0.55, 0.6),
    new THREE.MeshLambertMaterial({ color: 0x333333 })
  );
  front.position.set(0.97, 0.32, 0);
  group.add(front);

  addWheels(group, 1.8, 0.6);
  return group;
}

function addWheels(group, length, depth) {
  const geo = new THREE.CylinderGeometry(0.11, 0.11, 0.1, 8);
  const mat = new THREE.MeshLambertMaterial({ color: 0x222222 });
  const xs = [-length * 0.32, length * 0.32];
  const zs = [depth / 2 + 0.06, -depth / 2 - 0.06];
  for (const x of xs) for (const z of zs) {
    const w = new THREE.Mesh(geo, mat);
    w.rotation.z = Math.PI / 2;
    w.position.set(x, 0.11, z);
    group.add(w);
  }
}
