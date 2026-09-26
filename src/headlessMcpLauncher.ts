import { execFile, spawn } from "node:child_process";
import fs from "node:fs";
import type { BridgeConfig } from "./config.js";
import { logBridgeError, logBridgeEvent } from "./bridgeLogger.js";

const FIND_IMAGES_APP_PATH = "/Applications/Find Images.app";
const FIND_IMAGES_EXECUTABLE = `${FIND_IMAGES_APP_PATH}/Contents/MacOS/Find Images`;
const LOCAL_HOSTS = new Set(["127.0.0.1", "::1", "localhost"]);
const READY_POLL_INTERVAL_MS = 300;
const READY_TIMEOUT_MS = 60_000;

export type HeadlessMcpLauncher = {
  ensureRunning(): Promise<boolean>;
  stop(): void;
};

export function createHeadlessMcpLauncher(config: BridgeConfig): HeadlessMcpLauncher {
  let launchedPid: number | undefined;
  let startup: Promise<boolean> | undefined;

  const ensureRunning = (): Promise<boolean> => {
    if (!LOCAL_HOSTS.has(config.indexerUrl.hostname)) return Promise.resolve(false);
    if (startup) return startup;
    startup = start().finally(() => {
      startup = undefined;
    });
    return startup;
  };

  const start = async (): Promise<boolean> => {
    if (!fs.existsSync(FIND_IMAGES_EXECUTABLE)) {
      const error = new Error(`Find Images executable was not found at ${FIND_IMAGES_EXECUTABLE}.`);
      await logBridgeError("headless-mcp-start-failed", error, { endpoint: config.indexerUrl.origin });
      throw error;
    }
    const port = config.indexerUrl.port || (config.indexerUrl.protocol === "https:" ? "443" : "80");
    await logBridgeEvent("headless-mcp-starting", { executable: FIND_IMAGES_EXECUTABLE, endpoint: config.indexerUrl.origin, port });
    // Launched through LaunchServices (`open`), not a direct spawn of the executable: a raw
    // exec() makes macOS attribute Photos-library TCC permission to this Node process instead
    // of Find Images.app, so the app silently loses Photos access once running this way.
    try {
      await launchThroughLaunchServices(port);
    } catch (error) {
      await logBridgeError("headless-mcp-start-failed", error, { endpoint: config.indexerUrl.origin });
      return false;
    }
    const ready = await waitUntilListening(config.indexerUrl.origin);
    if (ready) {
      launchedPid = await findRunningPid();
      await logBridgeEvent("headless-mcp-ready", { endpoint: config.indexerUrl.origin, pid: launchedPid ?? null });
    } else {
      const error = new Error(`Find Images did not start listening on ${config.indexerUrl.origin} within ${READY_TIMEOUT_MS}ms.`);
      await logBridgeError("headless-mcp-start-failed", error, { endpoint: config.indexerUrl.origin });
    }
    return ready;
  };

  return {
    ensureRunning,
    stop(): void {
      if (launchedPid === undefined) return;
      const pid = launchedPid;
      launchedPid = undefined;
      void logBridgeEvent("headless-mcp-stopping", { endpoint: config.indexerUrl.origin, pid });
      try {
        process.kill(pid, "SIGTERM");
      } catch (error) {
        void logBridgeError("headless-mcp-stop-failed", error, { endpoint: config.indexerUrl.origin, pid });
      }
    },
  };
}

function launchThroughLaunchServices(port: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const open = spawn("open", ["-a", FIND_IMAGES_APP_PATH, "--args", "--mcp-server", "--port", port], { stdio: "ignore" });
    open.on("error", reject);
    open.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`\`open -a "${FIND_IMAGES_APP_PATH}"\` exited with code ${code ?? "unknown"}.`));
    });
  });
}

async function waitUntilListening(origin: string): Promise<boolean> {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      await fetch(origin);
      return true;
    } catch (error) {
      if (!isConnectionRefused(error)) return true;
    }
    await delay(READY_POLL_INTERVAL_MS);
  }
  return false;
}

function isConnectionRefused(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const cause = (error as Error & { cause?: { code?: unknown } }).cause;
  return cause?.code === "ECONNREFUSED";
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function findRunningPid(): Promise<number | undefined> {
  return new Promise((resolve) => {
    execFile("pgrep", ["-f", FIND_IMAGES_EXECUTABLE], (error, stdout) => {
      if (error) {
        resolve(undefined);
        return;
      }
      const pids = stdout
        .split("\n")
        .map((line) => Number(line.trim()))
        .filter((pid) => Number.isFinite(pid) && pid > 0);
      resolve(pids.at(-1));
    });
  });
}