import { AdapterError } from "../errors";
import { resolveShelfSource } from "../source-resolver";
import type { HydrateResult, ResolveShelfSourceInput } from "../types";

export interface JustBashSandboxLike {
  writeFiles?: (files: Record<string, string>) => Promise<unknown>;
}

export interface JustBashHydrateInput extends ResolveShelfSourceInput {
  sandbox: JustBashSandboxLike;
}

export function createJustBashAdapter() {
  return {
    async hydrate(input: JustBashHydrateInput): Promise<HydrateResult> {
      const writeFiles = input.sandbox.writeFiles;
      if (typeof writeFiles !== "function") {
        throw new AdapterError(
          "UNSUPPORTED_CLIENT",
          "Just-Bash sandbox must expose writeFiles(files)",
        );
      }

      const source = await resolveShelfSource(input);
      await writeFiles(source.files);

      return {
        provider: "just-bash",
        sourceKind: source.kind,
        fileCount: Object.keys(source.files).length,
      };
    },
  };
}
