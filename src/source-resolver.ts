import { AdapterError } from "./errors";
import { extractTarGzTextFiles, sha256Hex } from "./tar";
import type { ResolveShelfSourceInput, ShelfSource } from "./types";

async function resolveFromArchive(
  input: ResolveShelfSourceInput,
): Promise<ShelfSource> {
  const ready = await input.client.waitForArchiveUrl(input.shelfPublicId, {
    ttlSeconds: input.archiveTtlSeconds,
    pollIntervalMs: input.pollIntervalMs,
    maxPollAttempts: input.maxPollAttempts,
  });

  const archiveBytes = await input.client.downloadArchive(ready.url);
  const computedHash = sha256Hex(archiveBytes);
  if (computedHash.toLowerCase() !== ready.sha256.toLowerCase()) {
    throw new AdapterError(
      "ARCHIVE_CHECKSUM_MISMATCH",
      `Archive checksum mismatch for ${input.shelfPublicId}`,
    );
  }

  const files = await extractTarGzTextFiles(archiveBytes);

  return {
    kind: "archive",
    files,
    archiveSha256: ready.sha256,
    archiveVersion: ready.version,
    archiveExpiresAt: ready.expiresAt,
    archiveSizeBytes: ready.sizeBytes,
    archiveUrl: ready.url,
  };
}

async function resolveFromTree(
  input: ResolveShelfSourceInput,
): Promise<ShelfSource> {
  try {
    const tree = await input.client.getTree(input.shelfPublicId);
    return {
      kind: "tree",
      files: tree.files,
      fileCount: tree.fileCount,
      shelfName: tree.name,
      shelfPublicId: tree.shelfPublicId,
    };
  } catch (err) {
    throw new AdapterError("TREE_FETCH_FAILED", "Failed to fetch shelf tree", {
      cause: err,
    });
  }
}

export async function resolveShelfSource(
  input: ResolveShelfSourceInput,
): Promise<ShelfSource> {
  const mode = input.mode ?? "archive-first";

  if (mode === "tree-only") {
    return resolveFromTree(input);
  }

  if (mode === "archive-only") {
    return resolveFromArchive(input);
  }

  try {
    return await resolveFromArchive(input);
  } catch {
    return resolveFromTree(input);
  }
}
