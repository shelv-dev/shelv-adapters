import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createShelvClient } from "./shelv-client";
import { AdapterError } from "./errors";

describe("createShelvClient", () => {
  it("polls archive url until ready", async () => {
    const calls: string[] = [];
    const client = createShelvClient({
      apiKey: "sk_test",
      defaultPollIntervalMs: 1,
      fetchImplementation: (async (input: URL | RequestInfo) => {
        const url = String(input);
        calls.push(url);

        if (url.includes("/archive-url")) {
          if (calls.length === 1) {
            return new Response(
              JSON.stringify({ status: "generating", retryAfter: 0 }),
              {
                status: 200,
                headers: { "Content-Type": "application/json" },
              },
            );
          }

          return new Response(
            JSON.stringify({
              url: "https://download.example/archive.tar.gz",
              expiresAt: new Date().toISOString(),
              sha256: "abc",
              sizeBytes: 1,
              version: new Date().toISOString(),
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }

        return new Response(null, { status: 404 });
      }) as typeof fetch,
    });

    const ready = await client.waitForArchiveUrl(
      "shf_1234567890abcdef12345678",
      { maxPollAttempts: 3 },
    );

    assert.equal(ready.url, "https://download.example/archive.tar.gz");
    assert.equal(calls.length, 2);
    assert.ok(calls.every((url) => url.startsWith("https://api.shelv.dev/")));
  });

  it("throws timeout when archive never becomes ready", async () => {
    const client = createShelvClient({
      apiKey: "sk_test",
      defaultPollIntervalMs: 1,
      fetchImplementation: (async () =>
        new Response(JSON.stringify({ status: "generating", retryAfter: 0 }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })) as typeof fetch,
    });

    await assert.rejects(
      client.waitForArchiveUrl("shf_1234567890abcdef12345678", {
        maxPollAttempts: 2,
      }),
      (err: unknown) =>
        err instanceof AdapterError && err.code === "ARCHIVE_TIMEOUT",
    );
  });
});
