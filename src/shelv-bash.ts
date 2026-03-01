import { resolveShelfSource } from "./source-resolver";
import type {
  ResolveShelfSourceInput,
  ShelvBashEagerResult,
  ShelvBashLazyResult,
} from "./types";

export interface ShelvBashEagerInput extends ResolveShelfSourceInput {
  lazy?: false;
}

export interface ShelvBashLazyInput {
  client: ResolveShelfSourceInput["client"];
  shelfPublicId: string;
  lazy: true;
}

export async function createShelvBash(
  input: ShelvBashEagerInput,
): Promise<ShelvBashEagerResult>;
export async function createShelvBash(
  input: ShelvBashLazyInput,
): Promise<ShelvBashLazyResult>;
export async function createShelvBash(
  input: ShelvBashEagerInput | ShelvBashLazyInput,
): Promise<ShelvBashEagerResult | ShelvBashLazyResult> {
  if ("lazy" in input && input.lazy === true) {
    const listing = await input.client.listFiles(input.shelfPublicId);
    const files: Record<string, () => Promise<string>> = {};

    for (const path of listing.paths) {
      files[path] = () => input.client.getFile(input.shelfPublicId, path);
    }

    return {
      files,
      sourceKind: "listing",
      fileCount: listing.fileCount,
    };
  }

  const source = await resolveShelfSource(input);
  return {
    files: source.files,
    sourceKind: source.kind,
    fileCount: Object.keys(source.files).length,
  };
}
