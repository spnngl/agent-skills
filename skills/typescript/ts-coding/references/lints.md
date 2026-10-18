# Lint and format

Biome, oxlint, and oxfmt. Detect the toolchain from config files (`biome.json` / `biome.jsonc`, `.oxlintrc.json` / `oxlint.config.ts`, `.oxfmtrc.json` / `oxfmt.config.ts`) and `devDependencies`; keep the one the project uses.

## Pairings

| Toolchain | CI (read-only) | Fix |
| --- | --- | --- |
| oxlint + oxfmt | `oxfmt --check && oxlint --type-aware --deny-warnings` | `oxfmt && oxlint --fix` |
| Biome | `biome ci` | `biome check --write` |
| Biome formatter + oxlint | `biome format && oxlint --type-aware --deny-warnings`, with `"linter": { "enabled": false }` | `biome format --write && oxlint --fix` |

- Biome warnings pass unless `--error-on-warnings`; oxlint warnings pass unless `--deny-warnings`.
- `oxlint --type-aware` needs the `oxlint-tsgolint` package.
- Unsafe fixes (`biome check --write --unsafe`, `oxlint --fix-dangerously`) change behaviour: review each hunk.

## Rule map

Rules enforcing [the skill's rules](../SKILL.md#rules). TI = needs type information.

| Concern | oxlint | Biome |
| --- | --- | --- |
| no `any` | `typescript/no-explicit-any` | `suspicious/noExplicitAny` |
| no `!` | `typescript/no-non-null-assertion` | `style/noNonNullAssertion` |
| no `as T`, `as const` allowed | `typescript/consistent-type-assertions` with `{ "assertionStyle": "never" }` | `nursery/noUnsafeTypeAssertion` |
| floating promises (TI) | `typescript/no-floating-promises` | `nursery/noFloatingPromises` |
| misused promises (TI) | `typescript/no-misused-promises` | `nursery/noMisusedPromises` |
| exhaustive switch (TI) | `typescript/switch-exhaustiveness-check` | `nursery/useExhaustiveSwitchCases` |
| `import type` | `typescript/consistent-type-imports` | `style/useImportType`, `style/useExportType` |
| hooks | `react/rules-of-hooks`, `react/exhaustive-deps` | `correctness/useHookAtTopLevel`, `correctness/useExhaustiveDependencies` |
| barrel files | `oxc/no-barrel-file` | `performance/noBarrelFile`, `performance/noReExportAll` |
| console | `no-console` | `suspicious/noConsole` |

- oxlint enables only the `correctness` category, at warn; `react/rules-of-hooks` is in `pedantic`, and diagnostics name it `react-hooks(rules-of-hooks)`. Setting `plugins` replaces the default set (`typescript`, `unicorn`, `oxc`): list them all.
- Biome's `react` domain, auto-enabled when `react` is a dependency, turns on `useHookAtTopLevel` and `useExhaustiveDependencies`.
- Biome presets and domains never enable `nursery` rules: list each by name, with an explicit level (`noFloatingPromises` defaults to info). Nursery rules move between minor versions; run `biome migrate --write` after upgrading.

## Strict configs

`.oxlintrc.json`:

```jsonc
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["typescript", "unicorn", "oxc", "react", "import", "jsx-a11y"],
  "categories": { "correctness": "error", "suspicious": "error" },
  "options": { "typeAware": true, "denyWarnings": true, "reportUnusedDisableDirectives": "error" },
  "rules": {
    "typescript/no-explicit-any": "error",
    "typescript/no-non-null-assertion": "error",
    "typescript/consistent-type-assertions": ["error", { "assertionStyle": "never" }],
    "typescript/no-floating-promises": "error",
    "typescript/no-misused-promises": "error",
    "typescript/switch-exhaustiveness-check": "error",
    "typescript/consistent-type-imports": "error",
    "react/rules-of-hooks": "error",
    "react/exhaustive-deps": "error",
    "react/react-in-jsx-scope": "off",       // suspicious; wrong under jsx: react-jsx
    "import/no-unassigned-import": ["error", { "allow": ["**/*.css", "@testing-library/jest-dom/vitest"] }]
  },
  "overrides": [{ "files": ["**/*.test.{ts,tsx}", "**/*.test-d.ts"], "plugins": ["vitest"] }]
}
```

`biome.json`:

```jsonc
{
  "$schema": "https://biomejs.dev/schemas/2.5.15/schema.json",
  "vcs": { "enabled": true, "clientKind": "git", "useIgnoreFile": true },
  "linter": {
    "domains": { "react": "recommended" },  // React projects only
    "rules": {
      "preset": "recommended",
      "suspicious": { "noExplicitAny": "error" },
      "style": { "noNonNullAssertion": "error", "useImportType": "error", "useExportType": "error" },
      "nursery": {
        "noFloatingPromises": "error",
        "noMisusedPromises": "error",
        "useExhaustiveSwitchCases": "error",
        "noUnsafeTypeAssertion": "error"
      }
    }
  }
}
```

- Match `$schema` to the installed Biome version.
- Merge into a scaffold's config instead of replacing it: keep framework rules such as create-vite's `react/only-export-components` (Fast Refresh).
- `oxfmt --init` writes a minimal `.oxfmtrc.json`; without one every run prints `No config found, using defaults`.
- oxfmt defaults: `printWidth` 100, trailing commas, `sortPackageJson` on, `sortImports` off. Biome formatter defaults: tabs, `lineWidth` 80.

## Suppressions

Line-level syntax is in the skill's Verify step. Beyond it:

- Biome rejects a `biome-ignore` without a reason; `biome-ignore-all` suppresses a whole file.
- oxlint honours `eslint-disable` comments, so migrated suppressions keep working.
- `@ts-expect-error` fails once the error disappears; `@ts-ignore` and `@ts-nocheck` hide future errors.

## Migrating

- From ESLint: `biome migrate eslint --write`, or `npx @oxlint/migrate` (writes `.oxlintrc.json` from a flat config; then re-enable `correctness`).
- From Prettier: `biome migrate prettier --write`, or `oxfmt --migrate prettier`.
- Delete the old config and dependencies in the same change.
