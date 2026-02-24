# @shelv/adapters

Provider-native adapters for hydrating Shelv shelves into sandbox runtimes and creating snapshots.

## Install

```bash
pnpm add @shelv/adapters
```

```bash
bun add @shelv/adapters
```

```bash
npm install @shelv/adapters
```

## Runtime support

- Official runtime support: Node.js 18+
- ESM package
- Bun is supported as a package manager for installation; Bun runtime compatibility is best-effort in v1

## Optional peer dependencies

Install only the provider SDKs you use:

```bash
pnpm add @vercel/sandbox
pnpm add @daytonaio/sdk
pnpm add e2b
```

## Quickstart

```ts
import { createShelvClient, createVercelAdapter } from "@shelv/adapters";

const client = createShelvClient({
  apiKey: process.env.SHELV_API_KEY!,
});

const adapter = createVercelAdapter();
await adapter.hydrate({
  client,
  sandbox,
  shelfPublicId,
  mode: "archive-first",
});

const snapshot = await adapter.snapshot({
  sandbox,
  name: `shelf-${shelfPublicId}`,
});

console.log(snapshot.snapshotId);
```

## API surface

- `createShelvClient(config)`
- `resolveShelfSource(input)`
- `createVercelAdapter()`
- `createDaytonaAdapter()`
- `createE2BAdapter()`

`createShelvClient` defaults to `https://api.shelv.dev`. Set `apiBaseUrl` only for staging/self-hosted overrides.

## License

Apache-2.0.

Source code: [github.com/shelv/shelv-adapters](https://github.com/shelv/shelv-adapters)
