# JavaScript with JSDoc types

Type-checking `.js` files with `checkJs`. TypeScript 7 treats JSDoc as TypeScript with a different syntax and drops most Closure-era inference: JavaScript patterns that type-checked under 5.x and 6.0 can fail under 7.0.

## Config

```jsonc
{
  "compilerOptions": {
    "allowJs": true,               // implied by checkJs since 7.0
    "checkJs": true,
    "noEmit": true                 // or, for a library: "declaration": true, "emitDeclarationOnly": true, "outDir": "types"
  }
}
```

- `strict` is on by default in 6.0 and 7.0, so unannotated parameters raise TS7006.
- `// @ts-check` and `// @ts-nocheck` at the top of a file override `checkJs`.
- `maxNodeModuleJsDepth` defaults to 0: untyped JavaScript dependencies are `any` until declared ([`types.md`](types.md#escape-hatches)).
- `allowJs` with `isolatedDeclarations` is an error (TS5053).

## What works

| Tag | TypeScript equivalent |
| --- | --- |
| `/** @param {string} id */`, `/** @returns {Promise<User>} */` | parameter and return annotations |
| `/** @type {Config} */ const config = ...` | variable annotation |
| `/** @type {(id: string) => User} */ const f = ...` | full function signature, also for overloads and assertion signatures on arrows |
| `/** @import { User } from "./user.js" */` | `import type` (5.5) |
| `/** @typedef {{ id: string }} User */`, `@callback` | `type` alias, exported from a module automatically |
| `/** @template {string} T */` | type parameter |
| `/** @satisfies {Config} */ ({ ... })` | `satisfies` (5.0) |
| `@implements`, `@extends`, `@override`, `@readonly`, `@private`, `@this` | class clauses and modifiers |

`/** @type {T} */ (x)`, a JSDoc cast, compiles to `x as T`: the assertion ban applies to it. Narrow instead, exactly as in TypeScript.

## Removed in 7.0

| Was | Now |
| --- | --- |
| constructor functions, `C.prototype.m = ...`, `@class`, `@constructor` | `class` |
| `@enum` | `/** @typedef {"a" \| "b"} Kind */` plus an object of those values |
| Closure types: `function(string): void`, `module:a~b`, standalone `?` | `(s: string) => void`, `import("a").b`, `unknown` |
| a value name as a type, `@type {obj}` | `@type {typeof obj}` (else TS2749) |
| `/** @typedef {T} */ name;` | `/** @typedef {T} name */` |
| `@overload` or `@returns {asserts x is T}` on arrows and function expressions | a `@type` signature on the variable |
| expandos: `f.x = f.x \|\| init`, `/** @type {T} */ this.id;` declarations, `that = this` | class fields, explicit objects |
| mixing `module.exports =` with `module.exports.x =`, `require("fs").readFile` | one export style; `const { readFile } = require("node:fs")`, or ESM |

`.d.ts` emitted from JavaScript differs from 6.0's output: diff it before publishing.

## Errors

| Code | Fix |
| --- | --- |
| TS7006, TS7031 | Add `@param {T}`. |
| TS2749 | `typeof X` for a value used as a type. |
| TS1005 inside JSDoc | Closure syntax: rewrite as a TypeScript type. |
| TS8024 | `@param` name differs from the parameter. |
| TS8010, TS8016 and other TS80xx | TypeScript-only syntax in a `.js` file: use the JSDoc form. |
| TS18042 | Type-only name imported with a JavaScript `import`: use `@import`. |
| TS2339 on `this.x` or `F.prototype` | Removed 7.0 pattern: convert to a class. |

## Migrating to TypeScript

Keep `allowJs` and `checkJs`, fix the 7.0-removed patterns first, then rename one file at a time from `.js` to `.ts` and move JSDoc types into annotations.
