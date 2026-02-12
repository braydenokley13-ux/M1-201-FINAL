import * as THREE from "three";

export function createAvatar(scene) {
  const avatar = new THREE.Group();

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

  avatar.add(torso, head);
  avatar.position.set(-22, 0, -22);
  scene.add(avatar);

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

  const move = new THREE.Vector3(strafe, 0, forward);
  if (move.lengthSq() > 0) {
    move.normalize().multiplyScalar(speed * delta);
    avatar.position.add(move);
    avatar.position.x = THREE.MathUtils.clamp(avatar.position.x, -bounds, bounds);
    avatar.position.z = THREE.MathUtils.clamp(avatar.position.z, -bounds, bounds);

    const targetYaw = Math.atan2(move.x, move.z);
    avatar.rotation.y = THREE.MathUtils.lerp(avatar.rotation.y, targetYaw, 0.22);
  }
}

// # TODO(AVATAR-001): Add walk animation clips once external player model is loaded.
