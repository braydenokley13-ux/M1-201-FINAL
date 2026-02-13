import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const output = execSync('rg -n "# TODO" src scripts README.md DEPLOY.md TODO_TRACKER.md assets/README.md', {
  encoding: "utf8"
});

console.log(output);
const todoIdRegex = /TODO\(([A-Z]+-\d{3})\)/g;
const trackerIdRegex = /`([A-Z]+-\d{3})`:/g;

const codeIds = new Set();
for (const match of output.matchAll(todoIdRegex)) {
  codeIds.add(match[1]);
}

const trackerFile = readFileSync("TODO_TRACKER.md", "utf8");
const trackerIds = new Set();
for (const match of trackerFile.matchAll(trackerIdRegex)) {
  trackerIds.add(match[1]);
}

const missingFromTracker = [...codeIds].filter((id) => !trackerIds.has(id));
const staleInTracker = [...trackerIds].filter((id) => !codeIds.has(id));

if (missingFromTracker.length || staleInTracker.length) {
  console.error("TODO tracker drift detected.");
  if (missingFromTracker.length) {
    console.error(`- Missing in TODO_TRACKER.md: ${missingFromTracker.join(", ")}`);
  }
  if (staleInTracker.length) {
    console.error(`- Stale in TODO_TRACKER.md (not found in code): ${staleInTracker.join(", ")}`);
  }
  process.exit(1);
}

console.log("TODO audit passed.");
