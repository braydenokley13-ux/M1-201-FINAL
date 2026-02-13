import * as THREE from "three";
import { attachOptionalModel } from "./assets.js";
import { ASSET_CALIBRATION, MISSION_THEME_BY_INDEX } from "./assetCalibration.js";

export const MISSION_ZONE_POSITIONS = [
  new THREE.Vector3(-18, 0, -18),
  new THREE.Vector3(-7, 0, -16),
  new THREE.Vector3(4, 0, -13),
  new THREE.Vector3(15, 0, -9),
  new THREE.Vector3(17, 0, 2),
  new THREE.Vector3(9, 0, 12),
  new THREE.Vector3(-2, 0, 16),
  new THREE.Vector3(-14, 0, 10)
];

export function createMissionZones(scene) {
  const zones = [];

  const ringGeometry = new THREE.TorusGeometry(2.2, 0.17, 18, 48);
  const padGeometry = new THREE.CylinderGeometry(2.1, 2.1, 0.3, 32);

  MISSION_ZONE_POSITIONS.forEach((pos, idx) => {
    const group = new THREE.Group();
    const theme = MISSION_THEME_BY_INDEX[idx % MISSION_THEME_BY_INDEX.length];

    const padMat = new THREE.MeshStandardMaterial({
      color: theme.pad,
      metalness: 0.2,
      roughness: 0.35,
      emissive: new THREE.Color(0x0f2342),
      emissiveIntensity: 0.35
    });

    const ringMat = new THREE.MeshStandardMaterial({
      color: theme.ring,
      metalness: 0.25,
      roughness: 0.28,
      emissive: theme.emissive,
      emissiveIntensity: 0.72
    });

    const pad = new THREE.Mesh(padGeometry, padMat);
    pad.position.set(0, 0.14, 0);
    pad.receiveShadow = true;

    const ring = new THREE.Mesh(ringGeometry, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, 0.45, 0);
    ring.castShadow = true;

    const beacon = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 3.8, 8),
      new THREE.MeshStandardMaterial({
        color: theme.beacon,
        emissive: theme.emissive,
        emissiveIntensity: 0.58,
        metalness: 0.1,
        roughness: 0.2
      })
    );
    beacon.position.set(0, 2.1, 0);
    beacon.castShadow = true;

    const labelSprite = createMissionLabelSprite(`M${idx + 1}`);
    labelSprite.position.set(0, 4.3, 0);
    labelSprite.scale.set(3.6, 1.2, 1);

    group.add(pad, ring, beacon, labelSprite);
    group.position.copy(pos);
    group.userData = { missionIndex: idx, active: false };

    scene.add(group);
    zones.push(group);

    attachOptionalModel({
      path: "/assets/mission_kiosk.glb",
      parent: group,
      fallback: beacon,
      transform(model) {
        model.position.copy(ASSET_CALIBRATION.mission_kiosk.position);
        model.scale.setScalar(ASSET_CALIBRATION.mission_kiosk.scale);
      }
    });
  });

  return zones;
}

export function setMissionZoneActive(zones, activeIdx) {
  zones.forEach((zone, idx) => {
    const isActive = idx === activeIdx;
    zone.userData.active = isActive;

    zone.traverse((child) => {
      if (child.isMesh && child.material?.emissiveIntensity !== undefined) {
        child.material.emissiveIntensity = isActive ? 1.15 : 0.25;
        child.material.color.setHex(isActive ? 0x79ffd6 : 0x5ca08a);
      }
    });
  });
}

export function avatarNearActiveZone(avatarPos, zones, activeIdx, radius = 2.8) {
  const active = zones[activeIdx];
  if (!active) return false;
  return avatarPos.distanceTo(active.position) <= radius;
}

function createMissionLabelSprite(text) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 96;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "rgba(12, 18, 38, 0.78)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "rgba(151, 233, 213, 0.95)";
  ctx.lineWidth = 5;
  ctx.strokeRect(6, 6, canvas.width - 12, canvas.height - 12);
  ctx.font = "bold 48px Trebuchet MS";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#dff8ff";
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
  return new THREE.Sprite(mat);
}
