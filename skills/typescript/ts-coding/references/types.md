# Types

Type-level design: generics, narrowing without assertions, and fixing library types at the source.

## Narrowing without assertions

- Discriminated unions narrow on a literal tag: `switch (event.kind)`.
- Type predicates for reusable checks: `function isUser(x: unknown): x is User`. The body must prove the claim; prefer a schema's `safeParse` when the shape has more than a field or two.
- Assertion functions throw when the claim fails: `function assertDefined<T>(x: T): asserts x is NonNullable<T> { if (x == null) throw new Error("..."); }`. Use it where `!` would have gone, with a message naming the invariant.
- `"key" in obj` narrows unions of object types; `Array.isArray` narrows to `any[]` from `unknown`, so check elements too, or parse.
- Index access with a `const` key narrows since 5.5: `if (typeof obj[key] === "string") obj[key].trim()`.

## Generics

- Constrain type parameters to what the body uses: `<T extends { id: string }>`.
- A type parameter appearing once is unneeded: `function len(x: readonly unknown[])` over `<T>(x: readonly T[])`.
- `NoInfer<T>` stops a parameter from widening the inference: `function pick<T extends string>(options: T[], fallback: NoInfer<T>)`.
- Return types that depend on arguments: overloads for a few discrete cases; conditional types only when overloads multiply.

## Type-level tools

- `Record<Union, V>` makes lookups exhaustive; `Partial<Record<Union, V>>` when gaps are intended.
- Mapped types with `as` remap keys: ``{ [K in keyof T as `on${Capitalize<K & string>}`]: (value: T[K]) => void }``.
- Template literal types model string formats (`` `${number}px` ``, route params); validate the runtime string with a schema.
- Derive types from values instead of duplicating: `typeof config`, `(typeof ROLES)[number]`, `z.infer<typeof Schema>`, `ReturnType<typeof fn>`, `Parameters<typeof fn>`.
- `as const` object over `enum`:
  ```ts
  export const Status = { Active: "active", Archived: "archived" } as const;
  export type Status = (typeof Status)[keyof typeof Status];
  ```
- Optional properties under `exactOptionalPropertyTypes`: `key?: T` forbids assigning `undefined`; omit the key (conditional spread `...(value === undefined ? {} : { key: value })`) or declare `key?: T | undefined` when `undefined` is meaningful.

## Escape hatches

Library types that are wrong or missing get fixed in a `.d.ts`, never at each call site:

- Missing members: module augmentation, `declare module "lib" { interface Options { extra: string } }` in a file that has a top-level `import` or `export`.
- Untyped package: `declare module "untyped-pkg" { export function run(input: string): Promise<Result>; }`, typing only what you use.
- Globals: `declare global { interface Window { analytics: Analytics } }`.
- Assets: `declare module "*.svg" { const src: string; export default src; }`.
- Values of truly unknown shape stay `unknown` and go through a schema.

## Errors

| Code | Message (abridged) | Fix |
| --- | --- | --- |
| TS2742 | The inferred type of '…' cannot be named without a reference to '…'. | Annotate the export with a type imported from the package's public entry. |
| TS2589 | Type instantiation is excessively deep and possibly infinite. | Name intermediate types, use a tail-recursive conditional with an accumulator, cap recursion depth. |
| TS2590 | Expression produces a union type that is too complex to represent. | Replace the giant union with a base type or a branded string. |
| TS7022, TS7023 | '…' implicitly has type 'any' because it… is referenced directly or indirectly in its own initializer. | Annotate the recursive variable or getter. |
| TS9007, TS9010 | Function / Variable must have an explicit type annotation with --isolatedDeclarations. | Annotate the export. |
| TS1294 | This syntax is not allowed when 'erasableSyntaxOnly' is enabled. | `enum` → `as const` object + union; parameter property → field + assignment; `namespace` → module; `<T>x` → narrowing. |
| TS2322, TS2345 | Type '…' is not assignable to type '…'. | Read the elaboration's last line; fix the value or the declared type, never assert. |
| TS2532, TS18048 | Object is possibly 'undefined'. / '…' is possibly 'undefined'. | Guard, `??`, or `assertDefined`; under `noUncheckedIndexedAccess`, iterate instead of indexing. |
