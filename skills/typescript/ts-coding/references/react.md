# React

React 19 with TypeScript. Check `react` and `@types/react` versions in `package.json`, and whether the React Compiler (`babel-plugin-react-compiler`) is in the build.

## Components and types

- Components are plain functions, `function Card({ title, children }: CardProps)`, over `React.FC`. Props declare `children: React.ReactNode` explicitly.
- `ref` is a regular prop: `ref?: React.Ref<HTMLInputElement>`, or extend `React.ComponentProps<"input">`, which includes it. `forwardRef` is legacy.
- Wrap a DOM element: `type Props = React.ComponentProps<"button"> & { variant: Variant }`, then spread the rest onto the element.
- `useRef<HTMLDivElement>(null)` gives `RefObject<HTMLDivElement | null>`; `useRef` requires an argument.
- `JSX` is `React.JSX` (no global namespace); `ReactElement` props are `unknown`, narrow before reading.
- Ref callbacks return nothing or a cleanup function: `ref={(el) => { node = el; }}`, never an implicit return.
- Default values via parameter defaults; `defaultProps` and `propTypes` on function components are ignored.
- Event handlers: `React.ChangeEvent<HTMLInputElement>`, `React.FormEvent<HTMLFormElement>`; let inference type inline handlers.

## React 19 idioms

| Prefer | Over | Since |
| --- | --- | --- |
| `ref` as a prop | `forwardRef` | 19.0 |
| `<Context value={v}>` | `<Context.Provider value={v}>` | 19.0 |
| `use(promise)` with a promise from a framework, loader, or cache; `use(Context)` (allowed in branches) | fetch in an effect then `setState`; `useContext` | 19.0 |
| `<form action={fn}>`, `useActionState`, `useFormStatus` | `onSubmit` + `preventDefault` + manual pending state | 19.0 |
| `useOptimistic` inside an action or transition | manual optimistic state and rollback | 19.0 |
| async function in `startTransition` | hand-rolled `isPending` with `try` / `finally` | 19.0 |
| `<title>`, `<meta>`, `<link>` rendered in the component | react-helmet | 19.0 |
| ref callback returning cleanup | handling the `null` call | 19.0 |
| `useEffectEvent(fn)` for non-reactive reads inside effects | omitting deps, latest-value refs | 19.2 |
| `<Activity mode="hidden">` to keep hidden UI's state | unmounting and lifting state | 19.2 |
| `createRoot` / `hydrateRoot` from `react-dom/client` | `ReactDOM.render`, `hydrate` | 19.0 |
| `import { act } from "react"` | `react-dom/test-utils` | 19.0 |

## Rules of React

These hold with or without the compiler; the compiler silently skips components that break them.

- Derive values during render. State that only mirrors props or other state is a bug; reset state on identity change with `key`.
- Effects synchronize with external systems: subscriptions, timers, imperative DOM, network with an `AbortController` cleanup. Data transformations and event responses belong in render or handlers.
- Dependency arrays list every reactive value. Non-reactive reads move into `useEffectEvent`, which stays out of the array and is never passed as a prop.
- `ref.current` is read and written in effects and handlers only.
- Treat props, state, and hook results as immutable: `toSorted`, spread, `structuredClone`.
- Render is pure: `Date.now()`, `Math.random()`, `crypto.randomUUID()` go in handlers, effects, or a lazy `useState(() => ...)` initializer; IDs come from `useId`.
- Components are defined at module scope.
- `key` is a stable data ID passed explicitly, never via spread, never the index of a reorderable list.
- Client components are synchronous; async components exist only as Server Components. Promises passed to `use()` are created outside client render (loader, Server Component, cache). A client-only app without one fetches in an effect with an `AbortController` cleanup into a discriminated-union state (`loading | error | success`).
- Render errors are caught by an Error Boundary; `use()` stays outside `try` / `catch`.
- Effects run twice under `StrictMode` in development: write symmetric cleanup instead of guarding with a ref.

## Memoization

- React Compiler enabled: write plain code; add no new `useMemo`, `useCallback`, or `memo`. Keep existing ones unless tests cover their removal. `"use no memo"` is a temporary escape hatch.
- No compiler: memoize only to keep an identity stable for a memoized child or an effect dependency, or for a computation a profile shows is slow.
- Suppressing a `react-hooks` lint rule also makes the compiler skip the component: fix the code.

## Lint

Hook rules for oxlint and Biome: [`lints.md`](lints.md#rule-map). Projects still on ESLint use `eslint-plugin-react-hooks` 7 `recommended`, which includes the compiler rules (`set-state-in-effect`, `refs`, `immutability`, `purity`, `static-components`).
