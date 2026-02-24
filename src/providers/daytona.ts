import { AdapterError } from "../errors";
import { resolveShelfSource } from "../source-resolver";
import type {
  HydrateResult,
  ResolveShelfSourceInput,
  SnapshotResult,
} from "../types";

type UploadFilesFn = (
  files: Array<{ path: string; content: string }>,
) => Promise<unknown>;

export interface DaytonaSandboxLike {
  fs?: {
    uploadFiles?: UploadFilesFn;
  };
  uploadFiles?: UploadFilesFn;
  createSnapshot?: (input?: {
    name?: string;
  }) => Promise<{ id: string } | string>;
  snapshot?: (input?: { name?: string }) => Promise<{ id: string } | string>;
}

export interface DaytonaHydrateInput extends ResolveShelfSourceInput {
  sandbox: DaytonaSandboxLike;
}

function resolveUploadFn(
  sandbox: DaytonaSandboxLike,
): UploadFilesFn | undefined {
  return sandbox.fs?.uploadFiles ?? sandbox.uploadFiles;
}

function normalizeSnapshotId(raw: { id: string } | string): string {
  return typeof raw === "string" ? raw : raw.id;
}

export function createDaytonaAdapter() {
  return {
    async hydrate(input: DaytonaHydrateInput): Promise<HydrateResult> {
      const uploadFiles = resolveUploadFn(input.sandbox);
      if (typeof uploadFiles !== "function") {
        throw new AdapterError(
          "UNSUPPORTED_CLIENT",
          "Daytona sandbox client must expose fs.uploadFiles(files) or uploadFiles(files)",
        );
      }

      const source = await resolveShelfSource(input);
      const files = Object.entries(source.files)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([path, content]) => ({ path, content }));

      await uploadFiles(files);

      return {
        provider: "daytona",
        sourceKind: source.kind,
        fileCount: files.length,
      };
    },

    async snapshot(input: {
      sandbox: DaytonaSandboxLike;
      name?: string;
    }): Promise<SnapshotResult> {
      const snapshotFn = input.sandbox.createSnapshot ?? input.sandbox.snapshot;
      if (typeof snapshotFn !== "function") {
        throw new AdapterError(
          "UNSUPPORTED_CLIENT",
          "Daytona sandbox client must expose createSnapshot() or snapshot()",
        );
      }

      const raw = await snapshotFn({ name: input.name });

      return {
        provider: "daytona",
        snapshotId: normalizeSnapshotId(raw),
      };
    },
  };
}
