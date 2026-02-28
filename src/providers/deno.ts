import { AdapterError } from "../errors";
import { resolveShelfSource } from "../source-resolver";
import type { HydrateResult, ResolveShelfSourceInput } from "../types";

type WriteTextFileFn = (path: string, content: string) => Promise<unknown>;

export interface DenoSandboxLike {
  fs?: {
    writeTextFile?: WriteTextFileFn;
  };
}

export interface DenoHydrateInput extends ResolveShelfSourceInput {
  sandbox: DenoSandboxLike;
}

export function createDenoAdapter() {
  return {
    async hydrate(input: DenoHydrateInput): Promise<HydrateResult> {
      const writeTextFile = input.sandbox.fs?.writeTextFile;
      if (typeof writeTextFile !== "function") {
        throw new AdapterError(
          "UNSUPPORTED_CLIENT",
          "Deno sandbox client must expose fs.writeTextFile(path, content)",
        );
      }

      const source = await resolveShelfSource(input);
      const entries = Object.entries(source.files).sort(([a], [b]) =>
        a.localeCompare(b),
      );

      for (const [path, content] of entries) {
        await writeTextFile(path, content);
      }

      return {
        provider: "deno",
        sourceKind: source.kind,
        fileCount: entries.length,
      };
    },
  };
}
