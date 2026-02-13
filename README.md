# Front Office City - Module 1 (3D Skeleton)

This is a high-quality 3D skeleton for **Track 201 Module 1** only.

## What is already built
- One 3D world (Modern Sports City style)
- High-quality renderer path (PBR-style materials, tone mapping, optional bloom in High mode)
- 3rd-person avatar movement (`WASD` / arrows)
- 8 mission zones in linear unlock order
- Mission decision modal with legality checks
- Random event checkpoints before Mission 5 and Mission 8
- Multi-check pass/fail model
- Shared tier claim codes (permanent, non-hash)
- Solo + pairs setup mode hooks
- Pair-mode mission ownership notes (Player 1 / Player 2 attribution)
- Auto quality downgrade notices in HUD + teacher summary history
- Keyboard-accessible mission modal focus trap
- Teacher reset hook for attempt-lock flow + per-team audit log
- Teacher strict-lock toggle (ON/OFF) persisted with audit history
- Attempt-lock storage fallback chain for restricted/private browsers
- Signed server verification path for attempt lock (`/api/attempt-lock`)
- Production build chunk split (`vendor-three`) for cleaner deploy output
- Minimal teacher panel summary
- Data panel with `VERIFY BEFORE USE` markers

## Step-by-step local run (recommended)
1. Install dependencies: `npm install`
2. Start dev server: `npm run dev`
3. Open the local URL from terminal.
4. Choose team, mode, and quality.
5. Press `Start Graded Run`.
6. Walk to glowing mission zone.
7. Press `E` to open the mission.
8. Pick options to complete all 8 missions.
9. Read final status, tier, XP, and claim code.

## Quick checks
1. Syntax: `npm run check:syntax`
2. TODO audit: `npm run check:todos`

## Server lock setup (exam integrity)
1. Set `VITE_ATTEMPT_LOCK_SERVER_MODE=required` in production.
2. Set `VITE_ATTEMPT_LOCK_API_URL=/api/attempt-lock`.
3. Configure client verify keys using one of:
   - `VITE_ATTEMPT_LOCK_VERIFY_PUBLIC_KEY_PEM` (+ optional `VITE_ATTEMPT_LOCK_VERIFY_PUBLIC_KEY_ID`)
   - `VITE_ATTEMPT_LOCK_VERIFY_PUBLIC_KEYS_JSON` for key rotation (keyId -> PEM map).
4. Configure server signing keys using one of:
   - `ATTEMPT_LOCK_PRIVATE_KEY_PEM` + `ATTEMPT_LOCK_KEY_ID`
   - `ATTEMPT_LOCK_PRIVATE_KEYS_JSON` + `ATTEMPT_LOCK_ACTIVE_KEY_ID` for rotation.
5. Configure durable storage:
   - `KV_REST_API_URL` + `KV_REST_API_TOKEN` (or `ATTEMPT_LOCK_REDIS_REST_URL` + `ATTEMPT_LOCK_REDIS_REST_TOKEN`)
   - `ATTEMPT_LOCK_DURABLE_REQUIRED=true`
6. Keep `VITE_ATTEMPT_LOCK_ALLOW_UNSIGNED_DEV=false` in production.

## Controls
- Move: `W A S D` or arrow keys
- Mission interaction: `E`
- Camera: drag to orbit, scroll to zoom

## Optional high-quality asset files
Place these in `/assets`:
1. `arena_main.glb`
2. `mission_kiosk.glb`
3. `city_tower_set.glb`

## Permanent claim codes by tier
- Tier 1 CLEAR: `T1-M1-201-CLEAR`
- Tier 2 STRONG: `T2-M1-201-STRONG`
- Tier 3 ELITE: `T3-M1-201-ELITE`

## Important
- Run `npm run check:ci` before every release.
- Keep claim-code, class-profile, and attempt-lock settings aligned between local and production.
