export type AdapterErrorCode =
  | "ARCHIVE_TIMEOUT"
  | "ARCHIVE_DOWNLOAD_FAILED"
  | "ARCHIVE_CHECKSUM_MISMATCH"
  | "ARCHIVE_PARSE_FAILED"
  | "TREE_FETCH_FAILED"
  | "UNSUPPORTED_CLIENT";

export class AdapterError extends Error {
  readonly code: AdapterErrorCode;

  constructor(
    code: AdapterErrorCode,
    message: string,
    opts?: { cause?: unknown },
  ) {
    super(message, opts);
    this.code = code;
    this.name = "AdapterError";
  }
}
