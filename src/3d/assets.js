import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const loader = new GLTFLoader();
const modelCache = new Map();

function setupMeshQuality(root) {
  root.traverse((node) => {
    if (!node.isMesh) return;
    node.castShadow = true;
    node.receiveShadow = true;
    if (node.material) {
      node.material.side = THREE.FrontSide;
      if (node.material.metalness !== undefined && node.material.roughness !== undefined) {
        node.material.metalness = Math.min(1, node.material.metalness + 0.05);
        node.material.roughness = Math.max(0.08, node.material.roughness - 0.05);
      }
      node.material.needsUpdate = true;
    }
  });
}

export async function loadModelCached(path) {
  if (modelCache.has(path)) {
    return modelCache.get(path).clone(true);
  }

  const gltf = await loader.loadAsync(path);
  const scene = gltf.scene || gltf.scenes?.[0];
  if (!scene) {
    throw new Error(`No scene found in model: ${path}`);
  }
  setupMeshQuality(scene);
  modelCache.set(path, scene);
  return scene.clone(true);
}

export async function attachOptionalModel({
  path,
  parent,
  fallback,
  transform = () => {},
  onLoaded
}) {
  try {
    const model = await loadModelCached(path);
    transform(model);
    parent.add(model);

    if (fallback && fallback.parent) {
      fallback.parent.remove(fallback);
    }

    if (onLoaded) onLoaded(model);
    return model;
  } catch {
    return null;
  }
}

// # TODO(ASSET-002): Add Draco/KTX2 compressed pipeline when external assets are finalized.
