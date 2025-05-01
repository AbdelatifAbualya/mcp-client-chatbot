import type { MCPServerConfig } from "app-types/mcp";
import { dirname } from "path";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import type {
  MCPClientsManager,
  MCPConfigStorage,
} from "./create-mcp-clients-manager";
import chokidar from "chokidar";
import type { FSWatcher } from "chokidar";
import { createDebounce } from "lib/utils";
import equal from "fast-deep-equal";
import logger from "logger";
import { MCP_CONFIG_PATH } from "lib/const";

// Force /tmp directory in production (Vercel)
const VERCEL_TMP_CONFIG_PATH = "/tmp/.mcp-config.json";
const FINAL_CONFIG_PATH = process.env.NODE_ENV === "production" 
  ? VERCEL_TMP_CONFIG_PATH 
  : MCP_CONFIG_PATH;

/**
 * Creates a file-based implementation of MCPServerStorage
 */
export function createFileBasedMCPConfigsStorage(
  path?: string,
): MCPConfigStorage {
  const configPath = path || FINAL_CONFIG_PATH;
  const configs: Map<string, MCPServerConfig> = new Map();
  let watcher: FSWatcher | null = null;
  const debounce = createDebounce();

  /**
   * Persists the current config map to the file system
   */
  async function saveToFile(): Promise<void> {
    try {
      // Skip file writes if MCP_CONFIG env var is set
      if (process.env.MCP_CONFIG) return;

      const dir = dirname(configPath);
      await mkdir(dir, { recursive: true });
      await writeFile(
        configPath,
        JSON.stringify(Object.fromEntries(configs), null, 2),
        "utf-8",
      );
    } catch (err) {
      logger.error("Failed to save config to file:", err);
    }
  }

  /**
   * Initializes storage by reading existing config or creating empty file
   */
  async function init(manager: MCPClientsManager): Promise<void> {
    // Stop existing watcher if any
    if (watcher) {
      await watcher.close();
      watcher = null;
    }

    // Use environment variable if set
    if (process.env.MCP_CONFIG) {
      try {
        const config = JSON.parse(process.env.MCP_CONFIG);
        configs.clear();
        Object.entries(config).forEach(([name, serverConfig]) => {
          configs.set(name, serverConfig as MCPServerConfig);
        });
        return;
      } catch (err) {
        logger.error("Invalid MCP_CONFIG environment variable:", err);
      }
    }

    // Read config file if no env var is set
    try {
      const configText = await readFile(configPath, { encoding: "utf-8" });
      const parsed = JSON.parse(configText ?? "{}");
      configs.clear();
      Object.entries(parsed).forEach(([name, serverConfig]) => {
        configs.set(name, serverConfig as MCPServerConfig);
      });
    } catch (err: any) {
      if (err.code === "ENOENT") {
        // Create empty config file if doesn't exist
        await saveToFile();
      } else if (err instanceof SyntaxError) {
        logger.warn(`Config file ${configPath} has invalid JSON: ${err.message}`);
      } else {
        logger.error("Unexpected error loading config:", err);
      }
    }

    // Setup file watcher (skip in production if using env var)
    if (process.env.NODE_ENV !== "production" || !process.env.MCP_CONFIG) {
      watcher = chokidar.watch(configPath, {
        persistent: true,
        awaitWriteFinish: true,
        ignoreInitial: true,
      });

      watcher.on("change", () =>
        debounce(async () => {
          try {
            const configText = await readFile(configPath, {
              encoding: "utf-8",
            });
            if (
              equal(
                JSON.parse(configText ?? "{}"),
                Object.fromEntries(configs),
              )
            ) {
              return;
            }

            await manager.cleanup();
            await manager.init();
          } catch (err) {
            logger.error("Error detecting config file change:", err);
          }
        }, 1000),
      );
    }
  }

  return {
    init,
    async loadAll(): Promise<Record<string, MCPServerConfig>> {
      return Object.fromEntries(configs);
    },
    // Saves a configuration with the given name
    async save(name: string, config: MCPServerConfig): Promise<void> {
      configs.set(name, config);
      await saveToFile();
    },
    // Deletes a configuration by name
    async delete(name: string): Promise<void> {
      configs.delete(name);
      await saveToFile();
    },
    // Checks if a configuration exists
    async has(name: string): Promise<boolean> {
      return configs.has(name);
    },
  };
}
