# Next.js

Next.js 16 App Router with React Server Components. Training data mostly shows 13 and 14: request APIs were sync, `fetch` was cached by default, and `middleware.ts` was current. Check `next` in `package.json` and `next.config.ts` before applying anything below.

## Baseline in 16

- Turbopack builds `next dev` and `next build`; `--webpack` opts out. Config key `turbopack` (top level, formerly `experimental.turbopack`).
- `next lint` is gone and `next build` no longer lints: run the project's linter directly.
- `middleware.ts` is deprecated for `proxy.ts`, exporting `proxy` (Node runtime only; edge code stays in middleware). Both files at once fail the build.
- Removed: AMP, `serverRuntimeConfig` / `publicRuntimeConfig` (read `process.env` after `await connection()`), `experimental.ppr`, `experimental.dynamicIO`.

## Server and client boundary

- Files are Server Components by default; `"use client"` marks the entry into the client graph. Push it down to the smallest interactive leaf.
- Props crossing into a client component must be serializable: primitives, plain objects, arrays, `Map`, `Set`, `Date`, `FormData`, typed arrays, streams, promises (read with `use()`), and JSX. Functions cross only as Server Functions; class instances never.
- `"use server"` modules export async functions only. A client file imports actions from such a module or receives them as props.
- `import "server-only"` in modules holding secrets or database access: importing them from the client graph fails the build. Only `NEXT_PUBLIC_*` env vars reach the client; others read as `""` there.

## Request APIs and route types

`params`, `searchParams`, `cookies()`, `headers()`, and `draftMode()` return promises; the sync forms are removed in 16. Type pages, layouts, and route handlers with the global helpers that `next dev`, `next build`, or `next typegen` generate (no import):

```tsx
export default async function Page({ params, searchParams }: PageProps<"/blog/[slug]">) {
  const { slug } = await params;
  const { page } = await searchParams;          // string | string[] | undefined
  return <Post slug={slug} page={page} />;
}

export async function GET(request: NextRequest, context: RouteContext<"/users/[id]">) {
  const { id } = await context.params;
  return Response.json(await getUser(id));
}
```

- `LayoutProps<"/dashboard">` includes `children` and parallel-route slots.
- Client components read params with `useParams()` or `use(params)`.
- `searchParams` values are untrusted strings: parse them with a schema ([`zod.md`](zod.md)).
- `typedRoutes: true` (top level, stable) types `<Link href>` and `router.push`; build dynamic hrefs with template literals (`` `/blog/${slug}` ``).

## Server Functions

Every Server Function is a public POST endpoint: authenticate, authorize, and parse its input inside the function.

```ts
"use server";
import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import * as z from "zod";

export async function createPost(_previous: FormState, formData: FormData): Promise<FormState> {
  const session = await auth();
  if (!session) return { ok: false, error: "unauthenticated" };
  const parsed = PostInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, fieldErrors: z.flattenError(parsed.error).fieldErrors };
  await db.post.create({ data: { ...parsed.data, authorId: session.userId } });
  updateTag("posts");
  redirect("/posts");
}
```

- Drive it from a client form with `useActionState(createPost, initialState)` from `react` (`useFormState` is gone).
- Return expected failures as values: thrown errors reach the client without message or stack in production.
- `redirect()`, `permanentRedirect()`, `notFound()`, `forbidden()`, and `unauthorized()` throw. Call them outside `try`, or call `unstable_rethrow(error)` first in the `catch`. `forbidden()` and `unauthorized()` need `experimental.authInterrupts`.
- After a write: `updateTag(tag)` for read-your-writes inside the action, `revalidateTag(tag, "max")` for stale-while-revalidate (the one-argument form is deprecated), `revalidatePath(path)`, `refresh()` to refetch the current route.

## Caching

- Since 15, `fetch`, GET route handlers, and client navigations are uncached by default.
- `cacheComponents: true` (top level) enables `"use cache"`, `cacheLife`, and `cacheTag`, which replace `unstable_cache` and the segment exports `dynamic`, `revalidate`, `fetchCache` (those become compile errors).
- A `"use cache"` function is async, takes serializable arguments, and cannot call `cookies()`, `headers()`, or read `searchParams`: read those outside and pass the values in.
- Under `cacheComponents`, uncached or request-time data outside `<Suspense>` fails prerendering ("Next.js encountered runtime data during prerendering"): wrap the reading component in `<Suspense>` or cache the data.

## Errors and config

- `error.tsx` and `global-error.tsx` are client components. Narrow `error` with `instanceof Error`; production messages are replaced by a generic text plus `digest`. `global-error.tsx` renders its own `<html>` and `<body>`.
- `next.config.ts` exports `const config: NextConfig` (`import type { NextConfig } from "next"`).
- `next-env.d.ts` is generated: keep it in `include`, out of git, unedited.
- Next writes `jsx: "react-jsx"`, `moduleResolution: "bundler"`, `isolatedModules`, and the `next` plugin into `tsconfig.json`; it suggests `strict: false`, so set `strict: true`.
- `next build` fails on type errors; leave `typescript.ignoreBuildErrors` off.
