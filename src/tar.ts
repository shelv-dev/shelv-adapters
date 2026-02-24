import { createHash } from "node:crypto";
import { createGunzip } from "node:zlib";
import { extract } from "tar-stream";
import { AdapterError } from "./errors";

function assertSafePath(path: string): string {
  if (!path || path.includes("\0") || path.includes("\\")) {
    throw new AdapterError(
      "ARCHIVE_PARSE_FAILED",
      `Invalid archive path: ${path}`,
    );
  }

  let normalized = path;
  if (normalized.startsWith("./")) {
    normalized = normalized.slice(2);
  }

  if (
    !normalized ||
    normalized.startsWith("/") ||
    normalized
      .split("/")
      .some((segment) => segment === ".." || segment.length === 0)
  ) {
    throw new AdapterError(
      "ARCHIVE_PARSE_FAILED",
      `Unsafe archive path: ${path}`,
    );
  }

  return normalized;
}

export function sha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export async function extractTarGzTextFiles(
  archiveBytes: Uint8Array,
): Promise<Record<string, string>> {
  return new Promise((resolve, reject) => {
    const files: Record<string, string> = {};
    const gunzip = createGunzip();
    const tarExtract = extract();

    tarExtract.on("entry", (header, stream, next) => {
      const rawName = header.name || "";

      if (header.type !== "file") {
        stream.resume();
        stream.on("end", () => next());
        return;
      }

      let safePath: string;
      try {
        safePath = assertSafePath(rawName);
      } catch (err) {
        stream.resume();
        stream.on("end", () => reject(err));
        return;
      }

      const chunks: Buffer[] = [];
      stream.on("data", (chunk: Buffer) => chunks.push(chunk));
      stream.on("error", reject);
      stream.on("end", () => {
        files[safePath] = Buffer.concat(chunks).toString("utf-8");
        next();
      });
    });

    tarExtract.on("finish", () => resolve(files));
    tarExtract.on("error", (err) => {
      reject(
        new AdapterError("ARCHIVE_PARSE_FAILED", "Failed to extract archive", {
          cause: err,
        }),
      );
    });

    gunzip.on("error", (err) => {
      reject(
        new AdapterError("ARCHIVE_PARSE_FAILED", "Failed to gunzip archive", {
          cause: err,
        }),
      );
    });

    gunzip.pipe(tarExtract);
    gunzip.end(Buffer.from(archiveBytes));
  });
}
