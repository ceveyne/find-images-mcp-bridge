import { McpServer } from "@modelcontextprotocol/server";
export type StartStdioMcpServerOptions = {
    name: string;
    version: string;
    buildServer: (server: McpServer) => void;
    /** Registered for both SIGINT and SIGTERM; used to stop any started subprocess/resources. */
    onShutdown?: () => void;
};
/**
 * Shared stdio-MCP bootstrap: creates the McpServer, wires the tool registrations from
 * `buildServer`, and hooks up SIGINT/SIGTERM shutdown. Tool schemas and handlers stay
 * entirely in the consumer's `buildServer` callback.
 */
export declare function startStdioMcpServer(options: StartStdioMcpServerOptions): void;
