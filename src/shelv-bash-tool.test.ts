import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createShelvBashTool } from "./shelv-bash-tool";
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
  async getFile() {
    throw new Error("unused");
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

describe("createShelvBashTool", () => {
  it("throws helpful error when bash-tool is not installed", async () => {
    await assert.rejects(
      () =>
        createShelvBashTool({
          client: mockClient,
          shelfPublicId: "shf_1234567890abcdef12345678",
          mode: "tree-only",
        }),
      { message: /bash-tool is not installed/ },
    );
  });
});
