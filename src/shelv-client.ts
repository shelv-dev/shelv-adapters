import { AdapterError } from "./errors";
import type {
  ArchiveUrlGenerating,
  ArchiveUrlReady,
  ShelvClient,
  ShelvClientConfig,
  TreeResponse,
} from "./types";

const DEFAULT_ARCHIVE_TTL_SECONDS = 600;
const DEFAULT_POLL_INTERVAL_MS = 3_000;
const DEFAULT_MAX_POLL_ATTEMPTS = 20;
const DEFAULT_API_BASE_URL = "https://api.shelv.dev";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/$/, "");
}

export function createShelvClient(config: ShelvClientConfig): ShelvClient {
  const fetchImpl = config.fetchImplementation ?? fetch;
  const apiBaseUrl = normalizeBaseUrl(
    config.apiBaseUrl ?? DEFAULT_API_BASE_URL,
  );
  const defaultArchiveTtlSeconds =
    config.defaultArchiveTtlSeconds ?? DEFAULT_ARCHIVE_TTL_SECONDS;
  const defaultPollIntervalMs =
    config.defaultPollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const defaultMaxPollAttempts =
    config.defaultMaxPollAttempts ?? DEFAULT_MAX_POLL_ATTEMPTS;

  async function requestJson<T>(path: string): Promise<T> {
    const res = await fetchImpl(`${apiBaseUrl}${path}`, {
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
      },
    });

    if (!res.ok) {
      const body = await res.text();
      throw new AdapterError(
        "TREE_FETCH_FAILED",
        `Shelv request failed (${res.status}) for ${path}: ${body}`,
      );
    }

    return (await res.json()) as T;
  }

  async function getArchiveUrl(
    shelfPublicId: string,
    ttlSeconds: number,
  ): Promise<ArchiveUrlReady | ArchiveUrlGenerating> {
    return requestJson<ArchiveUrlReady | ArchiveUrlGenerating>(
      `/v1/shelves/${shelfPublicId}/archive-url?ttl=${ttlSeconds}`,
    );
  }

  return {
    async waitForArchiveUrl(shelfPublicId, opts) {
      const ttlSeconds = opts?.ttlSeconds ?? defaultArchiveTtlSeconds;
      const pollIntervalMs = opts?.pollIntervalMs ?? defaultPollIntervalMs;
      const maxPollAttempts = opts?.maxPollAttempts ?? defaultMaxPollAttempts;

      for (let attempt = 0; attempt < maxPollAttempts; attempt += 1) {
        const data = await getArchiveUrl(shelfPublicId, ttlSeconds);
        if (!("status" in data)) {
          return data;
        }

        const retryAfterMs = Math.max(data.retryAfter * 1000, pollIntervalMs);
        await sleep(retryAfterMs);
      }

      throw new AdapterError(
        "ARCHIVE_TIMEOUT",
        `Archive URL did not become ready after ${maxPollAttempts} attempts`,
      );
    },

    async downloadArchive(archiveUrl) {
      const res = await fetchImpl(archiveUrl);
      if (!res.ok) {
        const body = await res.text();
        throw new AdapterError(
          "ARCHIVE_DOWNLOAD_FAILED",
          `Archive download failed (${res.status}): ${body}`,
        );
      }

      const arrayBuffer = await res.arrayBuffer();
      return new Uint8Array(arrayBuffer);
    },

    async getTree(shelfPublicId) {
      return requestJson<TreeResponse>(`/v1/shelves/${shelfPublicId}/tree`);
    },

    async getFile(shelfPublicId, filePath) {
      const res = await fetchImpl(
        `${apiBaseUrl}/v1/shelves/${shelfPublicId}/files/${filePath
          .split("/")
          .map(encodeURIComponent)
          .join("/")}`,
        {
          headers: {
            Authorization: `Bearer ${config.apiKey}`,
          },
        },
      );

      if (!res.ok) {
        const body = await res.text();
        throw new AdapterError(
          "TREE_FETCH_FAILED",
          `File request failed (${res.status}) for ${filePath}: ${body}`,
        );
      }

      return res.text();
    },
  };
}
