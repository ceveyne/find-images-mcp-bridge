import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import type { BridgeConfig } from "./config.js";
import { logBridgeError, logBridgeEvent } from "./bridgeLogger.js";

const FIND_IMAGES_EXECUTABLE = "/Applications/Find Images.app/Contents/MacOS/Find Images";
const LOCAL_HOSTS = new Set(["127.0.0.1", "::1", "localhost"]);

export type HeadlessMcpLauncher = {
  ensureRunning(): Promise<boolean>;
  stop(): void;
};

export function createHeadlessMcpLauncher(config: BridgeConfig): HeadlessMcpLauncher {
  let process: ChildProcess | undefined;
  let startup: Promise<boolean> | undefined;

  const ensureRunning = (): Promise<boolean> => {
    if (!LOCAL_HOSTS.has(config.indexerUrl.hostname)) return Promise.resolve(false);
    if (startup) return startup;
    startup = start();
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
    return new Promise<boolean>((resolve, reject) => {
      let settled = false;
      const settle = (callback: (value: boolean) => void, value: boolean): void => {
        if (settled) return;
        settled = true;
        callback(value);
      };
      process = spawn(FIND_IMAGES_EXECUTABLE, ["--mcp-server", "--port", port], { stdio: ["ignore", "pipe", "pipe"] });
      const consumeOutput = (stream: NodeJS.ReadableStream | null, level: "stdout" | "stderr"): void => {
        stream?.on("data", (chunk: Buffer) => {
          const output = chunk.toString().trim();
          if (!output) return;
          void logBridgeEvent("headless-mcp-output", { level, output });
          if (output.includes("[mcp-server] listening on")) {
            void logBridgeEvent("headless-mcp-ready", { endpoint: config.indexerUrl.origin });
            settle(resolve, true);
          }
        });
      };
      consumeOutput(process.stdout, "stdout");
      consumeOutput(process.stderr, "stderr");
      process.on("error", (error) => {
        void logBridgeError("headless-mcp-start-failed", error, { endpoint: config.indexerUrl.origin });
        settle(reject, false);
      });
      process.on("exit", (code, signal) => {
        const error = new Error(`Find Images headless MCP process exited before readiness (code ${code ?? "none"}, signal ${signal ?? "none"}).`);
        void logBridgeError("headless-mcp-exited", error, { endpoint: config.indexerUrl.origin });
        if (!settled) settle(reject, false);
        process = undefined;
        startup = undefined;
      });
    });
  };

  return {
    ensureRunning,
    stop(): void {
      if (!process || process.exitCode !== null || process.killed) return;
      void logBridgeEvent("headless-mcp-stopping", { endpoint: config.indexerUrl.origin, pid: process.pid ?? null });
      process.kill("SIGTERM");
    },
  };
}