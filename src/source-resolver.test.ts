import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGzip } from "node:zlib";
import { pack } from "tar-stream";
import { resolveShelfSource } from "./source-resolver";
import { AdapterError } from "./errors";
import { sha256Hex } from "./tar";
import type { ShelvClient } from "./types";

async function buildArchive(
  files: Record<string, string>,
): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const tarPack = pack();
    const gzip = createGzip();
    const chunks: Buffer[] = [];

    tarPack.on("error", reject);
    gzip.on("error", reject);
    gzip.on("data", (chunk: Buffer) => chunks.push(chunk));
    gzip.on("end", () => resolve(new Uint8Array(Buffer.concat(chunks))));

    tarPack.pipe(gzip);

    for (const [name, content] of Object.entries(files)) {
      const body = Buffer.from(content, "utf-8");
      tarPack.entry({ name, size: body.byteLength }, body);
    }

    tarPack.finalize();
  });
}

describe("resolveShelfSource", () => {
  it("uses archive by default when ready", async () => {
    const archiveBytes = await buildArchive({ "README.md": "# hello" });
    const checksum = sha256Hex(archiveBytes);

    const client: ShelvClient = {
      async waitForArchiveUrl() {
        return {
          url: "https://example.com/archive.tar.gz",
          expiresAt: new Date().toISOString(),
          sha256: checksum,
          sizeBytes: archiveBytes.byteLength,
          version: new Date().toISOString(),
        };
      },
      async downloadArchive() {
        return archiveBytes;
      },
      async getTree() {
        throw new Error("tree should not be called");
      },
      async getFile() {
        throw new Error("unused");
      },
      async listFiles() {
        throw new Error("unused");
      },
    };

    const source = await resolveShelfSource({
      client,
      shelfPublicId: "shf_1234567890abcdef12345678",
      mode: "archive-first",
    });

    assert.equal(source.kind, "archive");
    assert.equal(source.files["README.md"], "# hello");
  });

  it("falls back to tree when archive flow fails", async () => {
    const client: ShelvClient = {
      async waitForArchiveUrl() {
        throw new AdapterError("ARCHIVE_TIMEOUT", "timed out");
      },
      async downloadArchive() {
        throw new Error("unused");
      },
      async getTree() {
        return {
          shelfPublicId: "shf_1234567890abcdef12345678",
          name: "Test",
          fileCount: 1,
          files: { "README.md": "tree" },
        };
      },
      async getFile() {
        throw new Error("unused");
      },
      async listFiles() {
        throw new Error("unused");
      },
    };

    const source = await resolveShelfSource({
      client,
      shelfPublicId: "shf_1234567890abcdef12345678",
      mode: "archive-first",
    });

    assert.equal(source.kind, "tree");
    assert.equal(source.files["README.md"], "tree");
  });

  it("fails in archive-only mode when archive path fails", async () => {
    const client: ShelvClient = {
      async waitForArchiveUrl() {
        throw new AdapterError("ARCHIVE_TIMEOUT", "timed out");
      },
      async downloadArchive() {
        throw new Error("unused");
      },
      async getTree() {
        return {
          shelfPublicId: "shf_1234567890abcdef12345678",
          name: "Test",
          fileCount: 1,
          files: { "README.md": "tree" },
        };
      },
      async getFile() {
        throw new Error("unused");
      },
      async listFiles() {
        throw new Error("unused");
      },
    };

    await assert.rejects(
      resolveShelfSource({
        client,
        shelfPublicId: "shf_1234567890abcdef12345678",
        mode: "archive-only",
      }),
      (err: unknown) =>
        err instanceof AdapterError && err.code === "ARCHIVE_TIMEOUT",
    );
  });
});
