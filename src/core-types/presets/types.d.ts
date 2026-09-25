/**
 * "final": a high-quality end result the agent should actively present (e.g. zoom-in/inpaint/
 * outpaint, generate_image/upscale). "process": an intermediate/working step (e.g. crop/mask) —
 * documented fleetingly, not persisted by default. See bionic-mcp-architecture.md,
 * "Materialisierungs-Stufen".
 */
export type ResultTier = "final" | "process";
/** The 3 policy booleans every Bionic MCP bridge branches its tool result on, plus which preset produced them. */
export interface McpResultPreset {
    name: "bionic" | "generic";
    includeBase64Preview: boolean;
    writeHtmlReportForMultipleResults: boolean;
    scratchpadFolderRequired: boolean;
}
