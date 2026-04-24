import * as THREE from 'three';
import { TILE_SIZE, BOARD_HALF } from './player.js';

export const vehicles = [];

const CAR_COLORS   = [0xE53935, 0x1E88E5, 0xFDD835, 0x43A047, 0x8E24AA, 0xF06292];
const TRUCK_COLORS = [0xFB8C00, 0x00ACC1, 0x6D4C41];
const BUS_COLORS   = [0xFFEB3B, 0xFF7043, 0x26C6DA];

const HALF_WIDTH = (BOARD_HALF + 3) * TILE_SIZE;

const VEHICLE_WIDTHS = { car: 1.0, truck: 1.5, bus: 2.0 };

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

function createCar(color) {
  const group = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.3, 0.55),
    new THREE.MeshLambertMaterial({ color })
  );
  body.position.y = 0.2;
  body.castShadow = true;
  group.add(body);

  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(0.52, 0.25, 0.48),
    new THREE.MeshLambertMaterial({ color: 0xADD8E6 })
  );
  cabin.position.set(0, 0.42, 0);
  cabin.castShadow = true;
  group.add(cabin);

  addWheels(group, 0.85, 0.55);
  return group;
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
