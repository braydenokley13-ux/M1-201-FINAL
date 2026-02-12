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
