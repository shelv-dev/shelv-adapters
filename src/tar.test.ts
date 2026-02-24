import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGzip } from "node:zlib";
import { pack } from "tar-stream";
import { extractTarGzTextFiles } from "./tar";
import { AdapterError } from "./errors";

async function buildArchive(entries: Array<{ path: string; content: string }>) {
  return new Promise<Uint8Array>((resolve, reject) => {
    const tarPack = pack();
    const gzip = createGzip();
    const chunks: Buffer[] = [];

    tarPack.on("error", reject);
    gzip.on("error", reject);
    gzip.on("data", (chunk: Buffer) => chunks.push(chunk));
    gzip.on("end", () => resolve(new Uint8Array(Buffer.concat(chunks))));

    tarPack.pipe(gzip);

    for (const entry of entries) {
      const body = Buffer.from(entry.content, "utf-8");
      tarPack.entry({ name: entry.path, size: body.byteLength }, body);
    }

    tarPack.finalize();
  });
}

describe("extractTarGzTextFiles", () => {
  it("extracts safe paths", async () => {
    const archive = await buildArchive([
      { path: "README.md", content: "ok" },
      { path: "chapters/intro.md", content: "hi" },
    ]);

    const files = await extractTarGzTextFiles(archive);

    assert.equal(files["README.md"], "ok");
    assert.equal(files["chapters/intro.md"], "hi");
  });

  it("rejects path traversal entries", async () => {
    const archive = await buildArchive([
      { path: "../evil.md", content: "bad" },
    ]);

    await assert.rejects(
      extractTarGzTextFiles(archive),
      (err: unknown) =>
        err instanceof AdapterError && err.code === "ARCHIVE_PARSE_FAILED",
    );
  });
});
