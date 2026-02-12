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
- Teacher reset hook for attempt-lock flow
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
- `# TODO` markers are intentionally included in code for future implementation passes.
- Search with: `rg -n "# TODO" src scripts README.md DEPLOY.md TODO_TRACKER.md assets/README.md`
