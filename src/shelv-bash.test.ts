import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createShelvBash } from "./shelv-bash";
import type { ShelvClient } from "./types";

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
  async getFile(_shelfPublicId, filePath) {
    const content: Record<string, string> = {
      "README.md": "# demo",
      "notes/todo.md": "- one",
    };
    return content[filePath] ?? "";
  },
  async listFiles() {
    return {
      shelfPublicId: "shf_1234567890abcdef12345678",
      name: "Demo",
      fileCount: 2,
      paths: ["README.md", "notes/todo.md"],
    };
  },
};

describe("createShelvBash", () => {
  it("eager mode returns Record<string, string>", async () => {
    const result = await createShelvBash({
      client: mockClient,
      shelfPublicId: "shf_1234567890abcdef12345678",
      mode: "tree-only",
    });

    assert.equal(result.sourceKind, "tree");
    assert.equal(result.fileCount, 2);
    assert.equal(typeof result.files["README.md"], "string");
    assert.equal(result.files["README.md"], "# demo");
  });

  it("lazy mode returns functions that fetch on demand", async () => {
    const getFileCalls: string[] = [];
    const trackingClient: ShelvClient = {
      ...mockClient,
      async getFile(shelfPublicId, filePath) {
        getFileCalls.push(filePath);
        return mockClient.getFile(shelfPublicId, filePath);
      },
    };

    const result = await createShelvBash({
      client: trackingClient,
      shelfPublicId: "shf_1234567890abcdef12345678",
      lazy: true,
    });

    assert.equal(result.sourceKind, "listing");
    assert.equal(result.fileCount, 2);
    assert.equal(getFileCalls.length, 0);
    assert.equal(typeof result.files["README.md"], "function");

    const content = await result.files["README.md"]();
    assert.equal(content, "# demo");
    assert.equal(getFileCalls.length, 1);
    assert.equal(getFileCalls[0], "README.md");
  });
});
