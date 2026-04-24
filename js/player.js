import * as THREE from 'three';

export const TILE_SIZE  = 1.2;
export const ROW_SIZE   = 1.5;
export const BOARD_HALF = 4;

const HOP_DURATION = 0.14; // seconds
const HOP_HEIGHT   = 0.65;

const moveQueue = [];

export function enqueueMove(dir) {
  if (moveQueue.length < 4) moveQueue.push(dir);
}

function dequeueMove() {
  return moveQueue.shift();
}

export function createPlayer(scene) {
  const group = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 0.6, 0.6),
    new THREE.MeshLambertMaterial({ color: 0xFFD700 })
  );
  body.position.y = 0.3;
  body.castShadow = true;
  group.add(body);

  const hat = new THREE.Mesh(
    new THREE.BoxGeometry(0.38, 0.32, 0.38),
    new THREE.MeshLambertMaterial({ color: 0xCC8800 })
  );
  hat.position.y = 0.76;
  hat.castShadow = true;
  group.add(hat);

  scene.add(group);

  return {
    mesh: group,
    row: 0,
    tile: 0,
    isMoving: false,
    startPos: new THREE.Vector3(),
    targetPos: new THREE.Vector3(),
    moveProgress: 0,
  };
}

export function updatePlayer(player, delta, isTreeAt) {
  if (!player.isMoving) {
    const dir = dequeueMove();
    if (!dir) return;

    const newRow  = player.row  + (dir === 'forward' ? 1 : dir === 'backward' ? -1 : 0);
    const newTile = player.tile + (dir === 'right'   ? 1 : dir === 'left'     ? -1 : 0);

    if (newTile < -BOARD_HALF || newTile > BOARD_HALF) return;
    if (newRow < 0) return;
    if (isTreeAt(newRow, newTile)) return;

    player.startPos.copy(player.mesh.position);
    player.row  = newRow;
    player.tile = newTile;
    player.targetPos.set(newTile * TILE_SIZE, 0, -newRow * ROW_SIZE);
    player.isMoving    = true;
    player.moveProgress = 0;

    const angles = { forward: 0, backward: Math.PI, left: Math.PI / 2, right: -Math.PI / 2 };
    player.mesh.rotation.y = angles[dir];
  } else {
    player.moveProgress += delta / HOP_DURATION;
    if (player.moveProgress >= 1) {
      player.moveProgress = 1;
      player.isMoving = false;
    }
    const t = player.moveProgress;
    player.mesh.position.x = lerp(player.startPos.x, player.targetPos.x, t);
    player.mesh.position.z = lerp(player.startPos.z, player.targetPos.z, t);
    player.mesh.position.y = Math.sin(t * Math.PI) * HOP_HEIGHT;
  }
}

function lerp(a, b, t) { return a + (b - a) * t; }
