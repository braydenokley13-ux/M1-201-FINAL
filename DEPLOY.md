# Deploy to Web (Vercel) - Step by Step

## Recommended path (Vite production)
1. Push this folder to a GitHub repo.
2. In Vercel, click `Add New Project`.
3. Import the repo.
4. Set framework preset to `Vite`.
5. Verify build settings:
   - Install command: `npm install`
   - Build command: `npm run build`
   - Output directory: `dist`
6. Deploy.

## Required env vars (signed lock + durability)
1. `VITE_ATTEMPT_LOCK_SERVER_MODE=required`
2. `VITE_ATTEMPT_LOCK_API_URL=/api/attempt-lock`

### Client verify key config (choose one path)
1. Single key path:
   - `VITE_ATTEMPT_LOCK_VERIFY_PUBLIC_KEY_PEM=<RSA_PUBLIC_KEY_PEM_WITH_ESCAPED_NEWLINES>`
   - Optional key label: `VITE_ATTEMPT_LOCK_VERIFY_PUBLIC_KEY_ID=m1-attempt-lock-v1`
2. Key-rotation path (recommended):
   - `VITE_ATTEMPT_LOCK_VERIFY_PUBLIC_KEYS_JSON={"m1-attempt-lock-v1":"-----BEGIN PUBLIC KEY-----\\n...\\n-----END PUBLIC KEY-----","m1-attempt-lock-v2":"-----BEGIN PUBLIC KEY-----\\n...\\n-----END PUBLIC KEY-----"}`

### Server signing key config (choose one path)
1. Single key path:
   - `ATTEMPT_LOCK_PRIVATE_KEY_PEM=<RSA_PRIVATE_KEY_PEM_WITH_ESCAPED_NEWLINES>`
   - `ATTEMPT_LOCK_KEY_ID=m1-attempt-lock-v1`
2. Key-rotation path (recommended):
   - `ATTEMPT_LOCK_PRIVATE_KEYS_JSON={"m1-attempt-lock-v1":"-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----","m1-attempt-lock-v2":"-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----"}`
   - `ATTEMPT_LOCK_ACTIVE_KEY_ID=m1-attempt-lock-v2`

### Durable lock storage (required in production)
1. `KV_REST_API_URL=<your_kv_rest_url>` (or `ATTEMPT_LOCK_REDIS_REST_URL`)
2. `KV_REST_API_TOKEN=<your_kv_rest_token>` (or `ATTEMPT_LOCK_REDIS_REST_TOKEN`)
3. `ATTEMPT_LOCK_DURABLE_REQUIRED=true`

## Local pre-deploy checks
1. `npm install`
2. `npm run check:syntax`
3. `npm run check:todos`
4. `npm run build`

## Release checklist
1. Test team select (Warriors/Knicks).
2. Test quality modes.
3. Confirm all 8 missions are reachable.
4. Confirm illegal moves are blocked.
5. Confirm 2 random events trigger.
6. Confirm claim code only shows on CLEARED status.
7. Confirm teacher panel summary and copy button.
8. Confirm teacher reset-attempt button works on selected team.
9. Confirm mobile/laptop HUD does not block interaction.
10. Confirm strict-lock ON blocks second attempt across fresh reload.
11. Confirm `/api/attempt-lock` is returning signed responses.
