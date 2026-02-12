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

console.log("Syntax check passed.");

// # TODO(QA-001): Expand this script to validate JSON schemas for mission/event data.
