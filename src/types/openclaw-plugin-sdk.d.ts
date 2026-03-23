/**
 * Type declarations for OpenClaw Plugin SDK
 * These are minimal stub types for the OpenClaw plugin system
 */

export interface OpenClawLogger {
  info: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string) => void;
  debug?: (message: string) => void;
}

export type OpenClawPluginApi = {
  config?: {
    plugins?: {
      entries?: {
        "memory-claw"?: {
          config?: unknown;
        };
        "memory-french"?: {
          config?: unknown;
        };
      };
    };
  };
  pluginConfig?: unknown;
  logger: OpenClawLogger;
  registerTool: (
    tool: {
      name: string;
      label: string;
      description: string;
      parameters: unknown;
      execute: (toolCallId: string, params: unknown) => Promise<unknown>;
    },
    options?: { name: string }
  ) => void;
  on: (event: string, handler: (event: unknown) => void | Promise<unknown>) => void;
  registerService: (service: {
    id: string;
    start: () => void;
    stop: () => void;
  }) => void;
};
