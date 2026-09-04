const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { spawn, spawnSync } = require("node:child_process");

const repositoryRoot = path.resolve(__dirname, "..");
const toolsRoot = path.join(repositoryRoot, ".tools");
const postgresRoot = path.join(toolsRoot, "postgresql-17.11", "pgsql");
const postgresData = path.join(toolsRoot, "postgresql-data");
const postgresLog = path.join(toolsRoot, "postgresql.log");
const postgresPort = "55432";
const apiPort = "8000";
const webPort = "8081";

const windows = process.platform === "win32";
const executable = (directory, name) =>
  path.join(directory, windows ? `${name}.exe` : name);
const pgCtl = executable(path.join(postgresRoot, "bin"), "pg_ctl");
const python = path.join(
  repositoryRoot,
  ".venv",
  windows ? "Scripts" : "bin",
  windows ? "python.exe" : "python",
);
const expoCli = path.join(repositoryRoot, "node_modules", "expo", "bin", "cli");

for (const [label, requiredPath] of [
  ["PostgreSQL", pgCtl],
  ["PostgreSQL data", postgresData],
  ["Python virtual environment", python],
  ["Expo", expoCli],
]) {
  if (!fs.existsSync(requiredPath)) {
    console.error(`${label} is missing at ${requiredPath}`);
    process.exit(1);
  }
}

const databaseUrl =
  process.env.DATABASE_URL ??
  `postgresql+asyncpg://bonyan@127.0.0.1:${postgresPort}/bonyan`;
const environment = {
  ...process.env,
  API_ENV: process.env.API_ENV ?? "development",
  AUTH_JWT_SECRET:
    process.env.AUTH_JWT_SECRET ?? crypto.randomBytes(48).toString("base64url"),
  BROWSER: process.env.BROWSER ?? "none",
  DATABASE_URL: databaseUrl,
};

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: repositoryRoot,
    env: environment,
    stdio: "inherit",
    ...options,
  });
  if (result.error) throw result.error;
  return result.status ?? 1;
}

const status = spawnSync(pgCtl, ["status", "-D", postgresData], {
  cwd: repositoryRoot,
  stdio: "ignore",
});
const databaseWasRunning = status.status === 0;

if (!databaseWasRunning) {
  console.log(`Starting PostgreSQL on 127.0.0.1:${postgresPort}...`);
  const startStatus = run(pgCtl, [
    "start",
    "-D",
    postgresData,
    "-l",
    postgresLog,
    "-o",
    `-p ${postgresPort} -h 127.0.0.1`,
  ]);
  if (startStatus !== 0) process.exit(startStatus);
} else {
  console.log("PostgreSQL is already running.");
}

console.log("Applying database migrations...");
const migrationStatus = run(python, [
  "-m",
  "alembic",
  "-c",
  "apps/api/alembic.ini",
  "upgrade",
  "head",
]);
if (migrationStatus !== 0) {
  if (!databaseWasRunning) {
    run(pgCtl, ["stop", "-D", postgresData, "-m", "fast"]);
  }
  process.exit(migrationStatus);
}

const children = [];
let stopping = false;

function start(name, command, args, cwd = repositoryRoot) {
  let child;
  try {
    child = spawn(command, args, { cwd, env: environment, stdio: "inherit" });
  } catch (error) {
    console.error(`${name} failed to start: ${error.message}`);
    shutdown(1);
    return;
  }
  children.push(child);
  child.on("error", (error) => {
    console.error(`${name} failed to start: ${error.message}`);
    shutdown(1);
  });
  child.on("exit", (code, signal) => {
    if (!stopping) {
      console.error(`${name} stopped unexpectedly (${signal ?? code ?? "unknown"}).`);
      shutdown(code ?? 1);
    }
  });
}

function shutdown(exitCode) {
  if (stopping) return;
  stopping = true;
  console.log("\nStopping BONYAN development services...");
  for (const child of children) {
    if (!child.killed) child.kill();
  }
  if (!databaseWasRunning) {
    run(pgCtl, ["stop", "-D", postgresData, "-m", "fast"]);
  }
  process.exit(exitCode);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

start("FastAPI", python, [
  "-m",
  "uvicorn",
  "app.main:app",
  "--host",
  "127.0.0.1",
  "--port",
  apiPort,
  "--app-dir",
  "apps/api",
]);
start(
  "Expo",
  process.execPath,
  [expoCli, "start", "--web", "--port", webPort],
  path.join(repositoryRoot, "apps", "mobile"),
);

console.log(`Frontend: http://localhost:${webPort}`);
console.log(`Backend:  http://127.0.0.1:${apiPort}`);
console.log("Press Ctrl+C to stop all services started by this command.");
