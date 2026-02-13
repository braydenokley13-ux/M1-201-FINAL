import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { KTX2Loader } from "three/addons/loaders/KTX2Loader.js";

const loader = new GLTFLoader();
const dracoLoader = new DRACOLoader();
const ktx2Loader = new KTX2Loader();
const modelCache = new Map();
let assetPipelineConfigured = false;
let textureSupportConfigured = false;

dracoLoader.setDecoderPath("https://unpkg.com/three@0.161.0/examples/jsm/libs/draco/");
ktx2Loader.setTranscoderPath("https://unpkg.com/three@0.161.0/examples/jsm/libs/basis/");
loader.setDRACOLoader(dracoLoader);
loader.setKTX2Loader(ktx2Loader);

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

export function configureAssetPipeline(renderer = null) {
  if (!assetPipelineConfigured) {
    assetPipelineConfigured = true;
  }

  if (renderer && !textureSupportConfigured) {
    ktx2Loader.detectSupport(renderer);
    textureSupportConfigured = true;
  }
}

function cloneCachedModel(cached) {
  const clone = cached.scene.clone(true);
  clone.userData = {
    ...clone.userData,
    __animations: cached.animations || []
  };
  return clone;
}

export async function loadModelCached(path) {
  configureAssetPipeline();
  if (modelCache.has(path)) {
    return cloneCachedModel(modelCache.get(path));
  }

  const gltf = await loader.loadAsync(path);
  const scene = gltf.scene || gltf.scenes?.[0];
  if (!scene) {
    throw new Error(`No scene found in model: ${path}`);
  }
  setupMeshQuality(scene);
  modelCache.set(path, {
    scene,
    animations: gltf.animations || []
  });
  return cloneCachedModel(modelCache.get(path));
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
