import { AdapterError } from "../errors";
import { resolveShelfSource } from "../source-resolver";
import type { HydrateResult, ResolveShelfSourceInput } from "../types";

type WriteTextFileFn = (path: string, content: string) => Promise<unknown>;

type BatchWriteFn = (
  files: Array<{ path: string; content: string | Uint8Array }>,
) => Promise<unknown>;

export interface CodeSandboxSandboxLike {
  fs?: {
    batchWrite?: BatchWriteFn;
    writeTextFile?: WriteTextFileFn;
  };
}

export interface CodeSandboxHydrateInput extends ResolveShelfSourceInput {
  sandbox: CodeSandboxSandboxLike;
}

export function createCodeSandboxAdapter() {
  return {
    async hydrate(input: CodeSandboxHydrateInput): Promise<HydrateResult> {
      const batchWrite = input.sandbox.fs?.batchWrite;
      const writeTextFile = input.sandbox.fs?.writeTextFile;

      if (
        typeof batchWrite !== "function" &&
        typeof writeTextFile !== "function"
      ) {
        throw new AdapterError(
          "UNSUPPORTED_CLIENT",
          "CodeSandbox client must expose fs.batchWrite(files) or fs.writeTextFile(path, content)",
        );
      }

      const source = await resolveShelfSource(input);
      const entries = Object.entries(source.files).sort(([a], [b]) =>
        a.localeCompare(b),
      );

      if (typeof batchWrite === "function") {
        await batchWrite(entries.map(([path, content]) => ({ path, content })));
      } else {
        for (const [path, content] of entries) {
          await writeTextFile!(path, content);
        }
      }

      return {
        provider: "codesandbox",
        sourceKind: source.kind,
        fileCount: entries.length,
      };
    },
  };
}
