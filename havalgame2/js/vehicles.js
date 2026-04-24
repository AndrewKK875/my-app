import * as THREE from 'three';
import { TILE_SIZE, BOARD_HALF } from './player.js';

export const vehicles = [];

const CAR_COLORS   = [0xE53935, 0x1E88E5, 0xFDD835, 0x43A047, 0x8E24AA, 0xF06292];
const TRUCK_COLORS = [0xFB8C00, 0x00ACC1, 0x6D4C41];

const HALF_WIDTH = (BOARD_HALF + 3) * TILE_SIZE;

export function spawnVehiclesForRow(scene, rowData) {
  const count = 2 + Math.floor(Math.random() * 3);
  const isTruck = Math.random() < 0.3;
  const spacing = (HALF_WIDTH * 2) / count;

  for (let i = 0; i < count; i++) {
    const type  = isTruck ? 'truck' : 'car';
    const color = type === 'truck'
      ? TRUCK_COLORS[Math.floor(Math.random() * TRUCK_COLORS.length)]
      : CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)];

    const x = -HALF_WIDTH + i * spacing + Math.random() * spacing * 0.6;
    const z = -rowData.index * 1.5; // ROW_SIZE = 1.5

    const mesh = type === 'truck' ? createTruck(color) : createCar(color);
    mesh.position.set(x, 0, z);
    if (rowData.direction === -1) mesh.rotation.y = Math.PI;
    scene.add(mesh);

    vehicles.push({
      mesh,
      row:       rowData.index,
      speed:     rowData.speed,
      direction: rowData.direction,
      width:     type === 'truck' ? 1.5 : 1.0,
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
