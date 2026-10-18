# Zod

Parse untrusted input once at the boundary with Zod 4, then pass the typed result inward. Requires TypeScript ≥ 5.5 with `strict`.

## Boundary pattern

```ts
import * as z from "zod";

const User = z.strictObject({
  id: z.uuid().brand<"UserId">(),
  email: z.email(),
  role: z.enum(["admin", "member"]),
});
type User = z.infer<typeof User>;

export async function fetchUser(id: string): Promise<Result<User, z.ZodError<User>>> {
  const response = await fetch(`/api/users/${id}`);
  if (!response.ok) throw new Error(`GET /api/users/${id}: ${response.status}`);
  const result = User.safeParse(await response.json());
  return result.success ? { ok: true, value: result.data } : { ok: false, error: result.error };
}
```

`Result` is the union from [`errors.md`](errors.md#expected-failures-result-unions).

- `safeParse` at boundaries; `parse` (throws `ZodError`) where failure is a bug. Async `.refine` / `.transform` require `safeParseAsync` / `parseAsync`.
- Pipe `JSON.parse(text)` and `response.json()` straight into a schema; the result never touches a typed variable unparsed.
- Error output: `z.flattenError` (form fields), `z.treeifyError` (nested), `z.prettifyError` (logs). Issues omit `input` unless `reportInput: true`; keep it off where input carries secrets.
- Type `z.input<typeof S>` for what callers send (defaults optional), `z.output<typeof S>` / `z.infer` for what code receives.
- One schema per shape, co-located with the code that owns the boundary; derive variants with `.pick`, `.omit`, `.partial`, `.extend`.

## Zod 4 over Zod 3

| Prefer | Over |
| --- | --- |
| `import * as z from "zod"` | `"zod/v4"`, and `"zod"` meaning v3 (now `"zod/v3"`) |
| `z.email()`, `z.uuid()`, `z.url()`, `z.httpUrl()`, `z.iso.datetime()`, `z.ipv4()` | `z.string().email()` etc. (deprecated) |
| `z.int()`, `z.int32()` | `z.number().int()`, `.safe()`, `.finite()` |
| `{ error: "msg" }`, `{ error: (issue) => ... }` | `message`, `required_error`, `invalid_type_error`, `errorMap` |
| `z.strictObject`, `z.looseObject` | `.strict()`, `.passthrough()` |
| `A.extend(B.shape)`, `z.object({ ...A.shape, ...B.shape })` | `A.merge(B)` |
| `z.record(z.string(), V)` | `z.record(V)` (removed) |
| `z.enum(TsEnum)`, `Schema.enum.Value` | `z.nativeEnum`, `.Enum`, `.Values` |
| `.meta({ id, title, description })` | `.describe()` |
| `z.function({ input: [A], output: R }).implement(fn)` | `.args().returns()` |
| `z.ZodType`, library code typed against `z4.$ZodType` from `"zod/v4/core"` | `ZodTypeAny`, `ZodSchema`, three-parameter `ZodType` |
| `.prefault(x)` for Zod 3 default semantics | `.default(x)` now takes the output type and skips parsing |
| `z.toZod<T>()(schema)` (exact match) | `schema satisfies z.ZodType<T>` (assignability only) |

## Input coercion

- `z.uuid()` is RFC 9562-strict; `z.guid()` accepts any 8-4-4-4-12 hex.
- `z.httpUrl()` requires a domain and rejects `localhost`; dev and CLI URLs use `z.url({ protocol: /^https?$/ })`.
- `z.stringbool()` for env and query flags: accepts `true/1/yes/on/y/enabled` and their opposites, rejects the rest. `z.coerce.boolean()` turns `"false"` into `true`.
- `z.coerce.number()` accepts `""` as `0` and types its input as `unknown`. Strict numeric strings: a codec, `z.codec(z.string().regex(z.regexes.integer), z.int(), { decode: (s) => Number.parseInt(s, 10), encode: String })`.
- Env vars: parse `process.env` once at startup into a frozen config object; read the config, never `process.env`, elsewhere.
- Template strings: `z.templateLiteral(["user_", z.int()])`.

## Composition gotchas

- `.pick`, `.omit`, `.partial`, `.required` throw at runtime on objects carrying `.refine()`; `.extend` throws when overwriting keys. Export the unrefined base, derive from it, and refine last (`.safeExtend` keeps refinements).
- `.transform()` returns a pipe, dropping type-specific methods: apply string or number checks first. Same-type rewrites use `.overwrite(fn)`, which stays introspectable and JSON-Schema-convertible.
- Optionality: `.optional()` → `key?: T | undefined`; `.nullable()` → required `T | null`; `.nullish()` → both. Under `exactOptionalPropertyTypes`, `.exactOptional()` gives `key?: T`.
- Defaults apply inside `.optional()`: `z.string().default("x").optional()` fills a missing key.
- `z.object` strips unknown keys; `z.strictObject` rejects them; `z.looseObject` keeps them.
- Recursive schemas use getters, `get children() { return z.array(Node); }`; annotate the getter's return type when `tsc` reports TS7023.

## Other entry points

- `z.toJSONSchema(schema, { io: "input" })` for request bodies (defaults and transforms describe the input side); it throws on `z.date`, `z.bigint`, and transforms unless `unrepresentable` is set. `z.fromJSONSchema` is experimental.
- `"zod/mini"` (functional API: `z.string().check(z.minLength(1))`, `z.optional(x)`) only under a strict frontend bundle budget. It ships no error locale: call `z.config(en())` with `en` from `"zod/locales"`.
- Library authors: peer-depend on `"zod": "^4.0.0"` and import from `"zod/v4/core"`.
