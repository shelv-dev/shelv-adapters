import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createVercelAdapter } from "./vercel";
import { createDaytonaAdapter } from "./daytona";
import { createE2BAdapter } from "./e2b";
import type { ShelvClient } from "../types";

const mockClient: ShelvClient = {
  async waitForArchiveUrl() {
    throw new Error("unused");
  },
  async downloadArchive() {
    throw new Error("unused");
  },
  async getTree() {
    return {
      shelfPublicId: "shf_1234567890abcdef12345678",
      name: "Demo",
      fileCount: 2,
      files: {
        "README.md": "# demo",
        "notes/todo.md": "- one",
      },
    };
  },
  async getFile() {
    throw new Error("unused");
  },
};

describe("provider adapters", () => {
  it("hydrates and snapshots with vercel adapter", async () => {
    const writes: Array<{ path: string; content: string }> = [];
    const adapter = createVercelAdapter();

    const hydrated = await adapter.hydrate({
      client: mockClient,
      shelfPublicId: "shf_1234567890abcdef12345678",
      mode: "tree-only",
      sandbox: {
        async writeFiles(files) {
          writes.push(...files);
        },
      },
    });

    const snap = await adapter.snapshot({
      sandbox: {
        async writeFiles() {
          return;
        },
        async createSnapshot() {
          return { id: "v_snap_123" };
        },
      },
    });

    assert.equal(hydrated.provider, "vercel");
    assert.equal(hydrated.fileCount, 2);
    assert.equal(writes.length, 2);
    assert.equal(snap.snapshotId, "v_snap_123");
  });

  it("hydrates and snapshots with daytona adapter", async () => {
    const writes: Array<{ path: string; content: string }> = [];
    const adapter = createDaytonaAdapter();

    const hydrated = await adapter.hydrate({
      client: mockClient,
      shelfPublicId: "shf_1234567890abcdef12345678",
      mode: "tree-only",
      sandbox: {
        fs: {
          async uploadFiles(files) {
            writes.push(...files);
          },
        },
      },
    });

    const snap = await adapter.snapshot({
      sandbox: {
        async snapshot() {
          return "d_snap_123";
        },
      },
    });

    assert.equal(hydrated.provider, "daytona");
    assert.equal(hydrated.fileCount, 2);
    assert.equal(writes.length, 2);
    assert.equal(snap.snapshotId, "d_snap_123");
  });

  it("hydrates and snapshots with e2b adapter", async () => {
    const writes: Array<{ path: string; content: string }> = [];
    const adapter = createE2BAdapter();

    const hydrated = await adapter.hydrate({
      client: mockClient,
      shelfPublicId: "shf_1234567890abcdef12345678",
      mode: "tree-only",
      sandbox: {
        files: {
          async write(path, content) {
            writes.push({ path, content });
          },
        },
      },
    });

    const snap = await adapter.snapshot({
      sandbox: {
        async createSnapshot() {
          return { id: "e_snap_123" };
        },
      },
    });

    assert.equal(hydrated.provider, "e2b");
    assert.equal(hydrated.fileCount, 2);
    assert.equal(writes.length, 2);
    assert.equal(snap.snapshotId, "e_snap_123");
  });
});
