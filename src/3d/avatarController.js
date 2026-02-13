import * as THREE from "three";
import { attachOptionalModel } from "./assets.js";
import { ASSET_CALIBRATION } from "./assetCalibration.js";

function findClip(clips = [], names = []) {
  const lowered = names.map((item) => item.toLowerCase());
  return clips.find((clip) => lowered.includes(clip.name.toLowerCase())) || null;
}

function setAvatarMoveState(avatar, moving) {
  const motion = avatar.userData.motion;
  if (!motion || !motion.walkAction || !motion.idleAction) {
    return;
  }

  if (motion.isMoving === moving) {
    return;
  }

  motion.isMoving = moving;
  if (moving) {
    motion.walkAction.reset().fadeIn(0.18).play();
    motion.idleAction.fadeOut(0.15);
  } else {
    motion.idleAction.reset().fadeIn(0.18).play();
    motion.walkAction.fadeOut(0.15);
  }
}

export function createAvatar(scene) {
  const avatar = new THREE.Group();
  const fallbackRig = new THREE.Group();

  const torso = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.42, 1.1, 8, 16),
    new THREE.MeshStandardMaterial({ color: 0x4ac4ff, metalness: 0.18, roughness: 0.36 })
  );
  torso.castShadow = true;
  torso.position.y = 1.2;

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.32, 20, 20),
    new THREE.MeshStandardMaterial({ color: 0xf0f4ff, metalness: 0.05, roughness: 0.52 })
  );
  head.position.y = 2.15;
  head.castShadow = true;

  fallbackRig.add(torso, head);
  avatar.add(fallbackRig);
  avatar.position.set(-22, 0, -22);
  avatar.userData.motion = {
    mixer: null,
    idleAction: null,
    walkAction: null,
    isMoving: false
  };
  scene.add(avatar);

  void attachOptionalModel({
    path: "/assets/player_avatar.glb",
    parent: avatar,
    fallback: fallbackRig,
    transform(model) {
      model.position.copy(ASSET_CALIBRATION.player_avatar.position);
      model.scale.setScalar(ASSET_CALIBRATION.player_avatar.scale);
    },
    onLoaded(model) {
      const clips = model.userData.__animations || [];
      if (!clips.length) {
        return;
      }

      const mixer = new THREE.AnimationMixer(model);
      const idleClip = findClip(clips, ["idle", "idle_01", "idle_loop"]);
      const walkClip = findClip(clips, ["walk", "walk_01", "run", "jog"]);
      if (!idleClip || !walkClip) {
        return;
      }

      const idleAction = mixer.clipAction(idleClip);
      const walkAction = mixer.clipAction(walkClip);
      idleAction.play();
      walkAction.stop();

      avatar.userData.motion = {
        mixer,
        idleAction,
        walkAction,
        isMoving: false
      };
    }
  });

  return avatar;
}

export function createMoveInput() {
  const keys = new Set();

  const onDown = (e) => keys.add(e.key.toLowerCase());
  const onUp = (e) => keys.delete(e.key.toLowerCase());

  window.addEventListener("keydown", onDown);
  window.addEventListener("keyup", onUp);

  return {
    keys,
    dispose() {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    }
  };
}

export function stepAvatar(avatar, keys, delta, bounds = 28) {
  const forward = Number(keys.has("w") || keys.has("arrowup")) - Number(keys.has("s") || keys.has("arrowdown"));
  const strafe = Number(keys.has("d") || keys.has("arrowright")) - Number(keys.has("a") || keys.has("arrowleft"));
  const speed = 8.6;
  const motion = avatar.userData.motion;

  const move = new THREE.Vector3(strafe, 0, forward);
  if (move.lengthSq() > 0) {
    move.normalize().multiplyScalar(speed * delta);
    avatar.position.add(move);
    avatar.position.x = THREE.MathUtils.clamp(avatar.position.x, -bounds, bounds);
    avatar.position.z = THREE.MathUtils.clamp(avatar.position.z, -bounds, bounds);

    const targetYaw = Math.atan2(move.x, move.z);
    avatar.rotation.y = THREE.MathUtils.lerp(avatar.rotation.y, targetYaw, 0.22);
    setAvatarMoveState(avatar, true);
  } else {
    setAvatarMoveState(avatar, false);
  }

  if (motion?.mixer) {
    motion.mixer.update(delta);
  }
}
