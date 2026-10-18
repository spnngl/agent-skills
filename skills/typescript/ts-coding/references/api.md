# Public API

Designing and shipping a published package's types. Every exported name, type, and `exports` entry is a semver commitment.

## Surface

- Export from explicit entry points listed in `package.json` `exports`; everything else is private.
- Exported functions and constants declare their types (`isolatedDeclarations` enforces it); inferred exports leak internal types and trigger TS2742.
- Accept the widest input you handle (`readonly T[]`, `Iterable<T>`, interfaces), return the narrowest precise type.
- Options objects over positional booleans: `connect(url, { timeoutMs: 5000 })`.
- Discriminated unions for results and events; consumers switch on the tag.
- Export the types consumers need to annotate their code: options, results, error classes, and the props of exported components.
- `@deprecated` with the replacement, kept for at least one minor before removal.

## Semver for types

Breaking (major): removing or renaming an export, narrowing an accepted input, widening a returned type, adding a required property to an input, adding a member to a union consumers switch on exhaustively, raising the minimum TypeScript or Node version.
Compatible (minor): new exports, new optional input properties, widening an accepted input, narrowing a return type.

## `package.json`

```json
{
  "type": "module",
  "exports": {
    ".": { "types": "./dist/index.d.ts", "default": "./dist/index.js" },
    "./package.json": "./package.json"
  },
  "files": ["dist", "src", "!src/**/*.test.ts", "!src/**/*.test-d.ts"],
  "sideEffects": false
}
```

- `types` comes first inside each condition. Dual ESM and CommonJS packages need separate `.d.ts` / `.d.cts` per format.
- Build with `module: "nodenext"`, `declaration`, `declarationMap`; emit with `tsc` or a bundler that emits declarations (tsdown, tsup with `dts`). Ship `src` alongside, or the declaration maps point nowhere.
- Split the configs: `tsconfig.json` checks everything including tests (`noEmit`); `tsconfig.build.json` extends it, sets `noEmit: false`, `rootDir`, `outDir`, and `isolatedDeclarations`, and excludes tests. `allowImportingTsExtensions` needs `noEmit`, so source imports use `./x.js`.
- Peer-depend on frameworks (`react`, `zod`) with ranges covering the majors you test; dev-depend on them for tests.

## Tooling that imports `typescript`

TypeScript 7's `typescript` package drops the in-process program and checker API (`ts.createProgram`, `ts.transpileModule`, the transformer pipeline). Tools built on it (typedoc, ts-morph, typed ESLint rules, custom transformers) need a TypeScript 6 install alongside, or a port to the IPC API in `typescript/unstable/async` and `typescript/unstable/sync`; AST helpers live in `typescript/unstable/ast/*` (`factory`, `is`, `visitor`, `utils`). The bare `typescript` import exposes only the version.

## Verify

```sh
pnpm pack --dry-run      # the files that ship (npm pack outside pnpm; it leaves workspace: and catalog: as is)
npx publint              # package.json and exports layout
npx @arethetypeswrong/cli --pack . --profile esm-only   # drop --profile for dual ESM + CJS packages
```

attw resolves with its own bundled TypeScript (5.6 in attw 0.18), not the project's.

**Done when:** each command passes, the packed file list holds only intended files, and every breaking change from [Semver for types](#semver-for-types) is matched by a major version bump and a changelog entry (a first release has neither).
