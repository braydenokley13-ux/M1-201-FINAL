import * as THREE from "three";

export const ASSET_CALIBRATION = {
  arena_main: {
    position: new THREE.Vector3(0, 0.12, 0),
    scale: 2.35
  },
  mission_kiosk: {
    position: new THREE.Vector3(0, 0.45, 0),
    scale: 0.9
  },
  city_tower_set: {
    scale: 1.5
  },
  player_avatar: {
    position: new THREE.Vector3(0, 0, 0),
    scale: 1.15
  }
};

export const MISSION_THEME_BY_INDEX = [
  { pad: 0x4ed9b7, ring: 0x8effda, beacon: 0xbdefff, emissive: 0x59f4be },
  { pad: 0x6fd7ff, ring: 0x8fc7ff, beacon: 0xd2e8ff, emissive: 0x73c1ff },
  { pad: 0x7cd48a, ring: 0x95f2a5, beacon: 0xd6ffe3, emissive: 0x5fef94 },
  { pad: 0xe0c06a, ring: 0xffde91, beacon: 0xfff2d1, emissive: 0xf3c85f },
  { pad: 0xec9d71, ring: 0xffbb95, beacon: 0xffe2cf, emissive: 0xff9e64 },
  { pad: 0xd68af3, ring: 0xf0b3ff, beacon: 0xf8e1ff, emissive: 0xd48cff },
  { pad: 0x91a3ff, ring: 0xb8c2ff, beacon: 0xdbe0ff, emissive: 0x96a9ff },
  { pad: 0x7dd1ff, ring: 0x93f0ff, beacon: 0xe0fbff, emissive: 0x64d8ff }
];
