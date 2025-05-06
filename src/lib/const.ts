import { join } from "path";

export const IS_DEV = process.env.NODE_ENV !== "production";
export const IS_BROWSER = typeof window !== "undefined";
export const MCP_CONFIG_PATH =
  process.env.MCP_CONFIG_PATH || join(process.cwd(), ".mcp-config.json");

export const SYMBOL_TRUE = Symbol("true");
export const SYMBOL_FALSE = Symbol("false");
