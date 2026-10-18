# Monorepos

Workspaces with pnpm and Turborepo; npm, Yarn, and Bun workspaces follow the same shape. Every package declares its own dependencies and its own `tsconfig.json`.

## pnpm

Node 25+ ships no corepack: install pnpm with `npm i -g pnpm`. pnpm 11+ reads only auth and registry settings from `.npmrc`; everything else lives in `pnpm-workspace.yaml` (camelCase). `package.json#pnpm` is no longer read: migrate with `pnpx codemod run pnpm-v10-to-v11`.

```yaml
packages: ["apps/*", "packages/*"]
catalog:
  react: ^19.2.0
  typescript: ^7.0.0
allowBuilds:
  esbuild: true
```

- Internal dependencies use `"@repo/ui": "workspace:*"`; `pnpm pack` and `pnpm publish` rewrite it to the real version (`npm pack` does not). Shared external versions use `"react": "catalog:"`, rewritten the same way; `pnpm add -D <pkg> --save-catalog` adds both entries.
- Dependency install scripts run only when listed in `allowBuilds` (`pnpm approve-builds` writes it); `onlyBuiltDependencies` and `neverBuiltDependencies` are gone in 11. Unlisted scripts fail the install.
- New releases younger than `minimumReleaseAge` (default 1440 minutes in 11) are skipped.
- Strict `node_modules`: a package imports only what its own `package.json` lists. Fix a phantom dependency by adding it, never with `publicHoistPattern` or `preserveSymlinks`.
- Filters: `pnpm --filter web...` (with its dependencies), `--filter ...ui` (with dependents), `--filter "[origin/main]"` (changed). `pnpm -r` skips the root and runs in topological order. Add to the root with `-w`.
- npm and Yarn Classic lack `workspace:`: they use `"@repo/ui": "*"` with `"workspaces"` in the root `package.json`. Bun supports `workspace:*` and catalogs in the root `package.json`.

## Turborepo

Turborepo 2 renamed `pipeline` to `tasks` (`npx @turbo/codemod rename-pipeline`). The root `package.json` declares `packageManager`.

```jsonc
{
  "$schema": "https://turborepo.dev/schema.json",
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**"], "env": ["API_URL"] },
    "transit": { "dependsOn": ["^transit"] },
    "check-types": { "dependsOn": ["transit"] },
    "test": { "dependsOn": ["transit"] },
    "dev": { "cache": false, "persistent": true }
  }
}
```

- `outputs` omitted caches only logs. Custom `inputs` replace the default (git-tracked files): include `$TURBO_DEFAULT$`.
- Strict env mode is the default: a variable not listed in `env` or `globalEnv` is invisible to the task and missing from the hash. `passThroughEnv` passes it without hashing. `.env` files are not loaded; list them in `inputs`.
- The `transit` task runs type-checks in parallel while still invalidating on dependency changes; `"dependsOn": ["^check-types"]` serializes them. It assumes just-in-time internal packages: when a consumer reads another package's `dist`, `check-types` and `test` need `"dependsOn": ["^build"]`, or a clean checkout fails with TS2307.
- Package-level `turbo.json` starts with `"extends": ["//"]`.
- `turbo run build --filter=web...`, `--affected` (changes since `main`; a shallow CI clone marks everything changed).

## TypeScript across packages

- A shared config package (`@repo/typescript-config` with `base.json`) that each package `extends`; no root `tsconfig.json` spanning the repo.
- Internal packages, one strategy per package:
  - Just-in-time: `"exports": { ".": "./src/index.ts" }`; the consumer's bundler compiles it. No build step, no build cache, and the consumer type-checks it.
  - Compiled: `tsc` to `dist` with `declaration` and `declarationMap` (go-to-definition lands in source); `exports` with `types` then `default`.
- Import workspace packages by name through `exports`, never through `paths` aliases into another package's `src`. Package-internal aliases use `package.json` `"imports": { "#*": "./src/*" }`.
- Pointing tools at source without a build: a custom condition in `exports` (`"@repo/source": "./src/index.ts"`) plus `"customConditions": ["@repo/source"]` (needs `moduleResolution` `bundler` or `nodenext`). Node with type stripping honours the same condition through `node --conditions=@repo/source`: workspace symlinks resolve outside `node_modules`, so the source is stripped.
- Project references (`composite`, `tsc -b`) give incremental cross-package builds; TypeScript 7's `tsc -b` builds projects in parallel (`--builders N`, default 4). Turborepo's docs recommend its task graph instead; follow what the repo already does.
- One TypeScript version for the whole repo, pinned through the catalog.
