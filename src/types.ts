export type ShelfSourceMode = "archive-first" | "tree-only" | "archive-only";

export type ShelfFiles = Record<string, string>;

export type ShelfSource =
  | {
      kind: "archive";
      files: ShelfFiles;
      archiveSha256: string;
      archiveVersion: string;
      archiveExpiresAt: string;
      archiveSizeBytes: number;
      archiveUrl: string;
    }
  | {
      kind: "tree";
      files: ShelfFiles;
      fileCount: number;
      shelfName: string;
      shelfPublicId: string;
    };

export type ArchiveUrlReady = {
  url: string;
  expiresAt: string;
  sha256: string;
  sizeBytes: number;
  version: string;
};

export type ArchiveUrlGenerating = {
  status: "generating";
  retryAfter: number;
};

export type TreeResponse = {
  shelfPublicId: string;
  name: string;
  fileCount: number;
  files: ShelfFiles;
};

export type ListingResponse = {
  shelfPublicId: string;
  name: string;
  fileCount: number;
  paths: string[];
};

export interface ShelvClient {
  waitForArchiveUrl(
    shelfPublicId: string,
    opts?: {
      ttlSeconds?: number;
      pollIntervalMs?: number;
      maxPollAttempts?: number;
    },
  ): Promise<ArchiveUrlReady>;
  downloadArchive(archiveUrl: string): Promise<Uint8Array>;
  getTree(shelfPublicId: string): Promise<TreeResponse>;
  getFile(shelfPublicId: string, filePath: string): Promise<string>;
  listFiles(shelfPublicId: string): Promise<ListingResponse>;
}

export interface ShelvClientConfig {
  apiBaseUrl?: string;
  apiKey: string;
  fetchImplementation?: typeof fetch;
  defaultArchiveTtlSeconds?: number;
  defaultPollIntervalMs?: number;
  defaultMaxPollAttempts?: number;
}

export interface ResolveShelfSourceInput {
  client: ShelvClient;
  shelfPublicId: string;
  mode?: ShelfSourceMode;
  archiveTtlSeconds?: number;
  pollIntervalMs?: number;
  maxPollAttempts?: number;
}

export interface HydrateResult {
  provider: "vercel" | "daytona" | "e2b" | "codesandbox" | "deno" | "just-bash";
  sourceKind: ShelfSource["kind"];
  fileCount: number;
}

export interface SnapshotResult {
  provider: "vercel" | "daytona" | "e2b";
  snapshotId: string;
}

export interface ShelvBashInput extends ResolveShelfSourceInput {
  lazy?: boolean;
}

export interface ShelvBashEagerResult {
  files: Record<string, string>;
  sourceKind: ShelfSource["kind"];
  fileCount: number;
}

export interface ShelvBashLazyResult {
  files: Record<string, () => Promise<string>>;
  sourceKind: "listing";
  fileCount: number;
}

export type ShelvBashResult = ShelvBashEagerResult | ShelvBashLazyResult;
