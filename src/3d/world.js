import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { QUALITY_PRESETS, WORLD_ADAPTIVE_QUALITY } from "../config/gameConfig.js";
import { createMissionZones, setMissionZoneActive } from "./missionZones.js";
import { createAvatar, createMoveInput, stepAvatar } from "./avatarController.js";
import { attachOptionalModel, configureAssetPipeline } from "./assets.js";
import { createPerfMonitor } from "./perfMonitor.js";
import { ASSET_CALIBRATION } from "./assetCalibration.js";

const QUALITY_ORDER = ["high", "balanced", "chromebook"];
const downgradeLog = [];

function getNextQualityMode(currentMode) {
  const idx = QUALITY_ORDER.indexOf(currentMode);
  if (idx < 0 || idx >= QUALITY_ORDER.length - 1) {
    return null;
  }
  return QUALITY_ORDER[idx + 1];
}

function makeAsphaltTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d");

  const gradient = ctx.createLinearGradient(0, 0, 1024, 1024);
  gradient.addColorStop(0, "#202734");
  gradient.addColorStop(1, "#151b25");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1024, 1024);

  for (let i = 0; i < 7600; i += 1) {
    const x = Math.random() * 1024;
    const y = Math.random() * 1024;
    const alpha = Math.random() * 0.18;
    const size = 1 + Math.random() * 2;
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.fillRect(x, y, size, size);
  }

  ctx.strokeStyle = "rgba(99,121,166,0.33)";
  ctx.lineWidth = 10;
  for (let lane = 1; lane < 5; lane += 1) {
    ctx.beginPath();
    ctx.moveTo(0, lane * 200);
    ctx.lineTo(1024, lane * 200 + 40);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(8, 8);
  texture.anisotropy = 8;
  return texture;
}

function addSkyDome(scene) {
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(180, 32, 32),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: {
        cTop: { value: new THREE.Color(0x152e6b) },
        cMid: { value: new THREE.Color(0x10244b) },
        cBottom: { value: new THREE.Color(0x05060b) }
      },
      vertexShader: `
        varying vec3 vPos;
        void main() {
          vPos = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vPos;
        uniform vec3 cTop;
        uniform vec3 cMid;
        uniform vec3 cBottom;
        void main() {
          float h = normalize(vPos).y;
          vec3 col = mix(cBottom, cMid, smoothstep(-0.4, 0.18, h));
          col = mix(col, cTop, smoothstep(0.16, 0.95, h));
          gl_FragColor = vec4(col, 1.0);
        }
      `
    })
  );
  scene.add(sky);
}

function addStreetLights(scene) {
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x4c5f8e, metalness: 0.8, roughness: 0.24 });
  const glowMat = new THREE.MeshStandardMaterial({
    color: 0xbbe2ff,
    emissive: 0x89dcff,
    emissiveIntensity: 1.1,
    metalness: 0.1,
    roughness: 0.28
  });

  const positions = [
    [-22, -21],
    [-8, -20],
    [8, -17],
    [20, -10],
    [21, 4],
    [12, 15],
    [-3, 21],
    [-18, 16]
  ];

  const groups = [];
  positions.forEach(([x, z]) => {
    const group = new THREE.Group();

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 4.8, 10), poleMat);
    pole.position.set(0, 2.4, 0);
    pole.castShadow = true;

    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 12), glowMat);
    lamp.position.set(0, 4.9, 0);

    const light = new THREE.PointLight(0xa8dcff, 0.6, 8.5, 2);
    light.position.set(0, 4.7, 0);

    group.position.set(x, 0, z);
    group.add(pole, lamp, light);
    scene.add(group);
    groups.push(group);
  });

  return groups;
}

function addArena(scene) {
  const fallbackArena = new THREE.Mesh(
    new THREE.CylinderGeometry(5.6, 6.8, 2.8, 48),
    new THREE.MeshStandardMaterial({
      color: 0x8ec4ff,
      emissive: 0x58a0ff,
      emissiveIntensity: 0.42,
      metalness: 0.62,
      roughness: 0.24
    })
  );
  fallbackArena.position.set(0, 1.5, 0);
  fallbackArena.castShadow = true;
  fallbackArena.receiveShadow = true;
  scene.add(fallbackArena);

  attachOptionalModel({
    path: "/assets/arena_main.glb",
    parent: scene,
    fallback: fallbackArena,
    transform(model) {
      model.position.copy(ASSET_CALIBRATION.arena_main.position);
      model.scale.setScalar(ASSET_CALIBRATION.arena_main.scale);
    }
  });
}

function addCityProps(scene, density) {
  const baseMat = new THREE.MeshStandardMaterial({
    color: 0x3e4d74,
    metalness: 0.45,
    roughness: 0.38
  });

  const winMat = new THREE.MeshStandardMaterial({
    color: 0x17304f,
    emissive: 0x89c7ff,
    emissiveIntensity: 0.28,
    metalness: 0.4,
    roughness: 0.2
  });

  const towers = [];
  for (let i = 0; i < density; i += 1) {
    const height = 2 + Math.random() * 8;
    const width = 1.2 + Math.random() * 2.6;
    const depth = 1.2 + Math.random() * 2.8;

    const building = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), baseMat);
    building.position.set((Math.random() - 0.5) * 74, height / 2, (Math.random() - 0.5) * 74);

    const isCenterLane = Math.abs(building.position.x) < 21 && Math.abs(building.position.z) < 21;
    if (isCenterLane) {
      i -= 1;
      continue;
    }

    building.castShadow = true;
    building.receiveShadow = true;

    const windows = new THREE.Mesh(new THREE.BoxGeometry(width * 0.86, height * 0.97, depth * 0.92), winMat);
    windows.position.y = 0.04;

    const tower = new THREE.Group();
    tower.add(building, windows);
    scene.add(tower);
    towers.push(tower);
  }

  addArena(scene);

  const heroSpots = [
    new THREE.Vector3(-29, 0, -27),
    new THREE.Vector3(27, 0, -26),
    new THREE.Vector3(29, 0, 26),
    new THREE.Vector3(-28, 0, 27)
  ];

  heroSpots.forEach((spot, idx) => {
    attachOptionalModel({
      path: "/assets/city_tower_set.glb",
      parent: scene,
      transform(model) {
        model.position.copy(spot);
        model.rotation.y = idx * (Math.PI / 2);
        model.scale.setScalar(ASSET_CALIBRATION.city_tower_set.scale);
      }
    });
  });

  return towers;
}

function createComposer(renderer, scene, camera) {
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  const bloom = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.42,
    0.64,
    0.8
  );
  composer.addPass(bloom);
  return composer;
}

export function createWorld(canvas, qualityMode = "high") {
  let activeQualityMode = QUALITY_PRESETS[qualityMode] ? qualityMode : "high";
  let activeQuality = QUALITY_PRESETS[activeQualityMode];
  const initialCityDensity = activeQuality.cityDensity;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  configureAssetPipeline(renderer);

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 300);
  camera.position.set(-16, 18, 18);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = false;
  controls.maxDistance = 34;
  controls.minDistance = 7;
  controls.maxPolarAngle = Math.PI * 0.48;
  controls.target.set(0, 1, 0);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const hemi = new THREE.HemisphereLight(0x90bbff, 0x111626, 0.95);
  scene.add(hemi);

  const key = new THREE.DirectionalLight(0xe6efff, 1.3);
  key.position.set(17, 28, 14);
  key.shadow.camera.near = 0.1;
  key.shadow.camera.far = 100;
  key.shadow.camera.left = -36;
  key.shadow.camera.right = 36;
  key.shadow.camera.top = 36;
  key.shadow.camera.bottom = -36;
  scene.add(key);

  addSkyDome(scene);

  const asphalt = makeAsphaltTexture();
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(90, 90),
    new THREE.MeshStandardMaterial({
      map: asphalt,
      color: 0x8fa6db,
      metalness: 0.1,
      roughness: 0.9
    })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const towers = addCityProps(scene, initialCityDensity);
  const streetLightGroups = addStreetLights(scene);

  const missionZones = createMissionZones(scene);
  setMissionZoneActive(missionZones, 0);

  const avatar = createAvatar(scene);
  const input = createMoveInput();

  let composer = null;
  const perfMonitor = createPerfMonitor(WORLD_ADAPTIVE_QUALITY);

  function applySceneDensityForMode(mode) {
    const targetDensity = QUALITY_PRESETS[mode].cityDensity;
    const visibleRatio = Math.max(0.22, Math.min(1, targetDensity / initialCityDensity));
    const targetVisibleCount = Math.max(6, Math.round(towers.length * visibleRatio));

    towers.forEach((tower, idx) => {
      tower.visible = idx < targetVisibleCount;
    });

    const streetVisible = mode !== "chromebook";
    streetLightGroups.forEach((group) => {
      group.visible = streetVisible;
    });
  }

  function rebuildComposerIfNeeded() {
    if (composer) {
      composer.dispose();
      composer = null;
    }

    if (activeQuality.missionBloom) {
      composer = createComposer(renderer, scene, camera);
    }
  }

  function applyQualityMode(nextMode) {
    const preset = QUALITY_PRESETS[nextMode];
    if (!preset) return;

    activeQualityMode = nextMode;
    activeQuality = preset;

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, activeQuality.pixelRatioMax));
    renderer.toneMappingExposure = activeQualityMode === "high" ? 1.06 : 1.0;
    renderer.shadowMap.enabled = activeQuality.shadows;

    key.castShadow = activeQuality.shadows;
    key.shadow.mapSize.set(activeQuality.shadowMapSize, activeQuality.shadowMapSize);
    key.shadow.needsUpdate = true;

    scene.fog = new THREE.FogExp2(0x0a1020, activeQuality.fogDensity);

    applySceneDensityForMode(activeQualityMode);
    rebuildComposerIfNeeded();
  }

  applyQualityMode(activeQualityMode);

  const clock = new THREE.Clock();

  function maybeAutoDowngrade() {
    const nextMode = getNextQualityMode(activeQualityMode);
    const canDowngrade = Boolean(nextMode);
    const thresholdFps = activeQuality.downshiftThresholdFps || 0;

    const perf = perfMonitor.consumeDowngradeSignal();
    if (!perf || !canDowngrade) {
      return;
    }

    const fromMode = activeQualityMode;
    applyQualityMode(nextMode);

    downgradeLog.push({
      timestamp: new Date().toISOString(),
      from: fromMode,
      to: nextMode,
      fps: perf.fps,
      runtimeMs: perf.runtimeMs
    });
  }

  function step() {
    const dt = Math.min(clock.getDelta(), 0.04);

    perfMonitor.tick(dt, activeQualityMode, activeQuality.downshiftThresholdFps || 0, Boolean(getNextQualityMode(activeQualityMode)));

    stepAvatar(avatar, input.keys, dt);

    controls.target.lerp(new THREE.Vector3(avatar.position.x, 1.4, avatar.position.z), 0.12);
    controls.update();

    for (let i = 0; i < missionZones.length; i += 1) {
      const zone = missionZones[i];
      zone.rotation.y += dt * (zone.userData.active ? 0.9 : 0.35);
      zone.position.y = Math.sin(clock.elapsedTime * 1.8 + i * 0.7) * 0.07;
    }

    maybeAutoDowngrade();

    if (composer) {
      composer.render();
    } else {
      renderer.render(scene, camera);
    }

    requestAnimationFrame(step);
  }

  step();

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, activeQuality.pixelRatioMax));
    if (composer) {
      composer.setSize(window.innerWidth, window.innerHeight);
    }
  });

  return {
    avatar,
    missionZones,
    setQualityMode(mode) {
      applyQualityMode(mode);
    },
    setActiveMission(index) {
      setMissionZoneActive(missionZones, index);
    },
    isNearMission(index, radius = 2.9) {
      if (!missionZones[index]) return false;
      return avatar.position.distanceTo(missionZones[index].position) <= radius;
    },
    getPerfStats() {
      return {
        ...perfMonitor.snapshot(),
        qualityMode: activeQualityMode,
        downgradeLog: [...downgradeLog]
      };
    },
    getDowngradeLog() {
      return [...downgradeLog];
    }
  };
}
