# TODO Tracker

Use this file to quickly assign next coding tasks to Codex or Claude.

## Core TODO IDs
- `RULE-001`: Replace simplified spend guardrail logic with scenario-configurable rules.
- `RULE-002`: Add explicit sign-and-trade and cash-in-trade restrictions.
- `RULE-003`: Add sign-and-trade incoming hard-cap checks.
- `RULE-004`: Add trade exception generation/expiry checks.
- `RULE-005`: Add second-apron pick freeze timeline checks by year.
- `RULE-006`: Add cash-in-trade restrictions in advanced rules module.
- `CLAIM-001`: Add teacher-configurable per-class code mapping.
- `CONFIG-001`: Add per-class profile loading.
- `ZONE-001`: Add unique kiosk skins per mission theme.
- `AVATAR-001`: Add walk animation clips with external player model.
- `WORLD-004`: Add HUD/teacher messaging for automatic quality changes.
- `ASSET-001`: Replace placeholder model scale values with final calibrated export values.
- `ASSET-002`: Add Draco/KTX2 compressed asset pipeline.
- `UI-001`: Add keyboard-only modal focus trap.
- `APP-001`: Expand pair mode names into in-run role ownership tracking.
- `APP-002`: Add one-attempt lock persistence and teacher reset hardening.
- `APP-003`: Add non-localStorage lock fallback for private browsing.
- `APP-004`: Replace client-side attempt lock with signed server verification.
- `GAME-001`: Add strict one-attempt exam lock toggle behavior.
- `BUILD-001`: Split vendor chunks as asset weight grows.
- `QA-001`: Expand syntax check into schema/data validation.
- `QA-002`: Fail CI when TODO IDs drift from tracker.

## Fast command to locate TODOs
```bash
rg -n "# TODO" src scripts README.md DEPLOY.md TODO_TRACKER.md assets/README.md
```
