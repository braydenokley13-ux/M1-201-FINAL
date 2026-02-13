# High-Quality Asset Slots

Drop optional GLB assets here for visual upgrade passes.

## Planned files
1. `arena_main.glb`
2. `mission_kiosk.glb`
3. `city_tower_set.glb`
4. `player_avatar.glb`

## Export workflow (required)
1. Author assets in meters and Y-up.
2. Bake PBR textures to KTX2 where available.
3. Draco-compress geometry for GLB output.
4. Keep each scene origin centered for easier placement.
5. Verify animation clip names include an idle clip and a walk/run clip for `player_avatar.glb`.
6. Export final files and place in this directory.

## Runtime calibration source
- Model transform calibration is centralized in:
  - `src/3d/assetCalibration.js`
- Update that file whenever final art exports change scale/origin.
