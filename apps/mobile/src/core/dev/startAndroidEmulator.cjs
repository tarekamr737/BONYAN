const { spawn, spawnSync } = require("node:child_process");
const net = require("node:net");
const path = require("node:path");

const mobileRoot = process.cwd();
const expoCli = require.resolve("expo/bin/cli", { paths: [mobileRoot] });
const adb = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT
  ? path.join(process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT, "platform-tools", process.platform === "win32" ? "adb.exe" : "adb")
  : process.platform === "win32" && process.env.LOCALAPPDATA
    ? path.join(process.env.LOCALAPPDATA, "Android", "Sdk", "platform-tools", "adb.exe")
    : "adb";

function runAdb(serial, args) {
  const result = spawnSync(adb, serial ? ["-s", serial, ...args] : args, { encoding: "utf8", timeout: 10_000 });
  if (result.error || result.status !== 0) {
    throw new Error(result.error?.message || result.stderr?.trim() || `adb ${args[0]} failed`);
  }
  return result.stdout;
}

function listening(port, host) {
  return new Promise(resolve => {
    const socket = net.createConnection({ host, port });
    socket.once("connect", () => { socket.destroy(); resolve(true); });
    socket.once("error", () => resolve(false));
    socket.setTimeout(500, () => { socket.destroy(); resolve(false); });
  });
}

async function available(port) {
  return !(await listening(port, "127.0.0.1")) && !(await listening(port, "::1"));
}

async function start() {
  const devices = runAdb(null, ["devices"]);
  const emulator = devices.match(/^(emulator-\d+)\s+device$/m)?.[1];
  if (!emulator) throw new Error("Start an Android emulator before running this command.");

  let port;
  for (let candidate = 8081; candidate <= 8090; candidate += 1) {
    if (await available(candidate)) { port = candidate; break; }
  }
  if (!port) throw new Error("No free Metro port between 8081 and 8090.");

  runAdb(emulator, ["reverse", `tcp:${port}`, `tcp:${port}`]);
  const nodeOptions = [process.env.NODE_OPTIONS, "--dns-result-order=ipv4first"].filter(Boolean).join(" ");
  const metro = spawn(process.execPath, [expoCli, "start", "--localhost", "--port", String(port)], {
    cwd: mobileRoot,
    env: { ...process.env, NODE_OPTIONS: nodeOptions },
    stdio: "inherit",
  });
  process.on("SIGINT", () => metro.kill("SIGINT"));
  process.on("SIGTERM", () => metro.kill("SIGTERM"));
  metro.on("error", error => { console.error(error.message); process.exitCode = 1; });
  metro.on("exit", code => { process.exitCode = code ?? 1; });

  for (let attempt = 0; attempt < 120 && metro.exitCode === null; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/status`);
      if (response.ok) {
        try {
          runAdb(emulator, ["shell", "am", "force-stop", "host.exp.exponent"]);
          await new Promise(resolve => setTimeout(resolve, 700));
          runAdb(emulator, ["shell", "am", "start", "-a", "android.intent.action.VIEW", "-d", `exp://127.0.0.1:${port}`, "host.exp.exponent"]);
        } catch (error) {
          metro.kill();
          throw error;
        }
        console.log(`BONYAN is loading in ${emulator} from http://127.0.0.1:${port}.`);
        return;
      }
    } catch { /* Metro is still starting. */ }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  metro.kill();
  throw new Error("Metro did not start within 60 seconds.");
}

start().catch(error => { console.error(error.message); process.exitCode = 1; });
