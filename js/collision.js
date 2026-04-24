import * as THREE from 'three';
import { vehicles } from './vehicles.js';

const _playerBox  = new THREE.Box3();
const _vehicleBox = new THREE.Box3();

export function checkCollision(player) {
  _playerBox.setFromObject(player.mesh);
  _playerBox.min.addScalar(0.12);
  _playerBox.max.subScalar(0.12);

  for (const v of vehicles) {
    _vehicleBox.setFromObject(v.mesh);
    if (_playerBox.intersectsBox(_vehicleBox)) return true;
  }
  return false;
}
