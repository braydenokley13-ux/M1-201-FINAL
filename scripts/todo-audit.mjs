import { execSync } from "node:child_process";

const output = execSync('rg -n "# TODO" src scripts README.md DEPLOY.md TODO_TRACKER.md assets/README.md', {
  encoding: "utf8"
});

console.log(output);

// # TODO(QA-002): Fail CI when required TODO IDs are missing from TODO_TRACKER.md.
