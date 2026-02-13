import { execSync } from "node:child_process";

const files = [
  "src/main.js",
  "src/3d/world.js",
  "src/3d/missionZones.js",
  "src/3d/assets.js",
  "src/engine/game.js",
  "src/engine/rules.js",
  "src/ui/dom.js"
];

for (const file of files) {
  execSync(`node --check ${file}`, { stdio: "inherit" });
}

execSync("node scripts/schema-check.mjs", { stdio: "inherit" });

console.log("Syntax + schema checks passed.");
