import * as THREE from "three";
import { Avatar } from "./avatar";
import type { AvatarLook } from "./types";

/**
 * Head-and-shoulders portraits of real avatars, rendered once per look and
 * cached as images. The people list and top bar show these instead of icons.
 */

let renderer: THREE.WebGLRenderer | null = null;
let scene: THREE.Scene | null = null;
let camera: THREE.PerspectiveCamera | null = null;
const cache = new Map<string, string>();

const SIZE = 192;

function setup(): boolean {
  if (renderer) return true;
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
  } catch {
    return false;
  }
  renderer.setPixelRatio(1);
  renderer.setSize(SIZE, SIZE, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight("#fff6e6", "#8a7a62", 1.5));
  const key = new THREE.DirectionalLight("#ffe6c2", 2.4);
  key.position.set(-2, 4, 5);
  scene.add(key);
  const rim = new THREE.DirectionalLight("#bfe0ee", 0.8);
  rim.position.set(3, 2, -3);
  scene.add(rim);
  camera = new THREE.PerspectiveCamera(20, 1, 0.5, 30);
  camera.position.set(0.15, 1.72, 4.6);
  camera.lookAt(0, 1.6, 0);
  return true;
}

export function getPortrait(look: AvatarLook): string {
  const key = JSON.stringify(look);
  const hit = cache.get(key);
  if (hit) return hit;
  if (!setup() || !renderer || !scene || !camera) return "";
  const avatar = new Avatar(look);
  avatar.root.rotation.y = -0.3;
  avatar.update(0.016, 0, false, null, 0);
  scene.add(avatar.root);
  renderer.render(scene, camera);
  const url = renderer.domElement.toDataURL("image/png");
  scene.remove(avatar.root);
  avatar.dispose();
  cache.set(key, url);
  return url;
}

export function disposePortraits(): void {
  renderer?.dispose();
  renderer?.forceContextLoss();
  renderer = null;
  scene = null;
  camera = null;
  cache.clear();
}
