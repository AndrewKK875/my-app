import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const MODEL_URL = './Meshy_AI_White_Power_Pickup_0427123658_texture.glb';

const app = document.getElementById('app');
const statusEl = document.getElementById('status');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x071018);
scene.fog = new THREE.Fog(0x071018, 18, 42);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(5, 3.2, 6);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
app.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 0.7, 0);
controls.maxPolarAngle = Math.PI * 0.48;
controls.minDistance = 3;
controls.maxDistance = 14;

scene.add(new THREE.HemisphereLight(0xa9d9ff, 0x173120, 1.5));

const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
keyLight.position.set(4, 7, 5);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(1024, 1024);
keyLight.shadow.camera.near = 0.1;
keyLight.shadow.camera.far = 30;
keyLight.shadow.camera.left = -8;
keyLight.shadow.camera.right = 8;
keyLight.shadow.camera.top = 8;
keyLight.shadow.camera.bottom = -8;
scene.add(keyLight);

const rimLight = new THREE.DirectionalLight(0x7fd9ff, 1.2);
rimLight.position.set(-5, 3, -4);
scene.add(rimLight);

const ground = new THREE.Mesh(
  new THREE.CircleGeometry(9, 80),
  new THREE.MeshStandardMaterial({ color: 0x184533, roughness: 0.95, metalness: 0.02 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const grid = new THREE.GridHelper(18, 18, 0x4fa57f, 0x244d3e);
grid.material.opacity = 0.28;
grid.material.transparent = true;
scene.add(grid);

const loader = new GLTFLoader();
loader.load(
  MODEL_URL,
  (gltf) => {
    const model = gltf.scene;

    model.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (child.material) {
          child.material.roughness = Math.min(child.material.roughness ?? 0.7, 0.8);
        }
      }
    });

    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const scale = 3 / Math.max(size.x, size.y, size.z);

    model.scale.setScalar(scale);
    model.position.sub(center.multiplyScalar(scale));
    model.position.y = 0;
    model.rotation.y = Math.PI;

    scene.add(model);
    statusEl.textContent = 'Модель загружена';
  },
  (event) => {
    if (!event.total) return;
    const percent = Math.round((event.loaded / event.total) * 100);
    statusEl.textContent = `Загрузка модели ${percent}%`;
  },
  (error) => {
    console.error(error);
    statusEl.textContent = 'Ошибка загрузки GLB';
  }
);

function resize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener('resize', resize);

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

animate();
