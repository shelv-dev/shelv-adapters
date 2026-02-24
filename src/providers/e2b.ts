import { AdapterError } from "../errors";
import { resolveShelfSource } from "../source-resolver";
import type {
  HydrateResult,
  ResolveShelfSourceInput,
  SnapshotResult,
} from "../types";

type WriteFileFn = (path: string, content: string) => Promise<unknown>;

export interface E2BSandboxLike {
  files?: {
    write?: WriteFileFn;
  };
  writeFile?: WriteFileFn;
  createSnapshot?: (input?: {
    name?: string;
  }) => Promise<{ id: string } | string>;
  snapshot?: (input?: { name?: string }) => Promise<{ id: string } | string>;
}

export interface E2BHydrateInput extends ResolveShelfSourceInput {
  sandbox: E2BSandboxLike;
}

function resolveWriteFn(sandbox: E2BSandboxLike): WriteFileFn | undefined {
  return sandbox.files?.write ?? sandbox.writeFile;
}

function normalizeSnapshotId(raw: { id: string } | string): string {
  return typeof raw === "string" ? raw : raw.id;
}

export function createE2BAdapter() {
  return {
    async hydrate(input: E2BHydrateInput): Promise<HydrateResult> {
      const writeFile = resolveWriteFn(input.sandbox);
      if (typeof writeFile !== "function") {
        throw new AdapterError(
          "UNSUPPORTED_CLIENT",
          "E2B sandbox client must expose files.write(path, content) or writeFile(path, content)",
        );
      }

      const source = await resolveShelfSource(input);
      const entries = Object.entries(source.files).sort(([a], [b]) =>
        a.localeCompare(b),
      );

      for (const [path, content] of entries) {
        await writeFile(path, content);
      }

      return {
        provider: "e2b",
        sourceKind: source.kind,
        fileCount: entries.length,
      };
    },

    async snapshot(input: {
      sandbox: E2BSandboxLike;
      name?: string;
    }): Promise<SnapshotResult> {
      const snapshotFn = input.sandbox.createSnapshot ?? input.sandbox.snapshot;
      if (typeof snapshotFn !== "function") {
        throw new AdapterError(
          "UNSUPPORTED_CLIENT",
          "E2B sandbox client must expose createSnapshot() or snapshot()",
        );
      }

      const raw = await snapshotFn({ name: input.name });

      return {
        provider: "e2b",
        snapshotId: normalizeSnapshotId(raw),
      };
    },
  };
}
