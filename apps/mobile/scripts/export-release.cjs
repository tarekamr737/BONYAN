const path = require("node:path");
const { spawnSync } = require("node:child_process");

const { requireReleaseApiUrl } = require("../release-env.cjs");

requireReleaseApiUrl();
const expoCli = path.resolve(__dirname, "../../../node_modules/expo/bin/cli");
const result = spawnSync(process.execPath, [expoCli, "export", "--platform", "all"], {
  cwd: path.resolve(__dirname, ".."),
  env: { ...process.env, BONYAN_RELEASE_BUILD: "1" },
  stdio: "inherit",
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
