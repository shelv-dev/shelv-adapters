import { AdapterError } from "./errors";
import { resolveShelfSource } from "./source-resolver";
import type { ResolveShelfSourceInput, ShelfSource } from "./types";

export interface ShelvBashToolInput extends ResolveShelfSourceInput {
  toolOptions?: Record<string, unknown>;
}

export interface ShelvBashToolResult {
  tools: Record<string, unknown>;
  sandbox: unknown;
  sourceKind: ShelfSource["kind"];
  fileCount: number;
}

export async function createShelvBashTool(
  input: ShelvBashToolInput,
): Promise<ShelvBashToolResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let bashToolModule: any;
  try {
    bashToolModule = await (Function(
      'return import("bash-tool")',
    )() as Promise<unknown>);
  } catch {
    throw new AdapterError(
      "MISSING_DEPENDENCY",
      'bash-tool is not installed. Run "npm install bash-tool" or "pnpm add bash-tool" to use createShelvBashTool.',
    );
  }

  const source = await resolveShelfSource(input);
  const { createBashTool } = bashToolModule;

  const result = createBashTool({
    files: source.files,
    ...input.toolOptions,
  });

  return {
    tools: result.tools,
    sandbox: result.sandbox,
    sourceKind: source.kind,
    fileCount: Object.keys(source.files).length,
  };
}
