import { AdapterError } from "../errors";
import { resolveShelfSource } from "../source-resolver";
import type {
  HydrateResult,
  ResolveShelfSourceInput,
  SnapshotResult,
} from "../types";

export interface VercelSandboxLike {
  writeFiles: (
    files: Array<{ path: string; content: string }>,
  ) => Promise<void>;
  createSnapshot?: (input?: {
    name?: string;
  }) => Promise<{ id: string } | string>;
  snapshot?: (input?: { name?: string }) => Promise<{ id: string } | string>;
}

export interface VercelHydrateInput extends ResolveShelfSourceInput {
  sandbox: VercelSandboxLike;
}

function normalizeSnapshotId(raw: { id: string } | string): string {
  return typeof raw === "string" ? raw : raw.id;
}

export function createVercelAdapter() {
  return {
    async hydrate(input: VercelHydrateInput): Promise<HydrateResult> {
      if (typeof input.sandbox.writeFiles !== "function") {
        throw new AdapterError(
          "UNSUPPORTED_CLIENT",
          "Vercel sandbox client must expose writeFiles(files)",
        );
      }

      const source = await resolveShelfSource(input);
      const files = Object.entries(source.files)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([path, content]) => ({ path, content }));

      await input.sandbox.writeFiles(files);

      return {
        provider: "vercel",
        sourceKind: source.kind,
        fileCount: files.length,
      };
    },

    async snapshot(input: {
      sandbox: VercelSandboxLike;
      name?: string;
    }): Promise<SnapshotResult> {
      const snapshotFn = input.sandbox.createSnapshot ?? input.sandbox.snapshot;
      if (typeof snapshotFn !== "function") {
        throw new AdapterError(
          "UNSUPPORTED_CLIENT",
          "Vercel sandbox client must expose createSnapshot() or snapshot()",
        );
      }

      const raw = await snapshotFn({ name: input.name });

      return {
        provider: "vercel",
        snapshotId: normalizeSnapshotId(raw),
      };
    },
  };
}
