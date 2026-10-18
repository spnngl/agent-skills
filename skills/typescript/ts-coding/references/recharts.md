# Recharts

Recharts 3 in TypeScript. Training data mostly shows 2.x; check the installed version, since typed `dataKey` and several APIs below need ≥ 3.8. `react-is` is a required peer at the app's React major.

## Sizing

- A chart renders no SVG without a size. On ≥ 3.3 use the `responsive` prop with CSS sizing: `<LineChart responsive style={{ width: "100%", maxWidth: 600, aspectRatio: 1.618 }}>`. Older: `<ResponsiveContainer>` inside a parent with a definite height.
- Percentage `width` / `height` props are measured once and never track resizes.
- SSR, jsdom, and tests have no `ResizeObserver` and zero-size layout: pass numeric `width` and `height`.
- Long Y-axis ticks: `<YAxis width="auto" />`.

## Typed data

- Components default to `any` data; opt in to checking per component (≥ 3.8): `<XAxis<Row, string> dataKey="month" />`, `<Line<Row, number> dataKey="revenue" />`. The chart's generic does not flow to children.
- Or build typed components once (≥ 3.8): `const Typed = createHorizontalChart<Row>()({ XAxis, YAxis, Line });` then `<Typed.LineChart>`, `<Typed.Line dataKey="revenue" />`. Vertical, radial, and centric variants: `createVerticalChart`, `createRadialChart`, `createCentricChart`.
- Typed `dataKey` accepts keys whose value matches, or a function `(row: Row) => V`; nested `"a.b"` paths need the function form. Hoist function `dataKey`s to module scope: a new identity recomputes every point.
- `TooltipPayloadEntry.payload` (the original row) is `any`: parse it (a Zod schema, or a lookup by `activeIndex` into your own typed data) before reading fields.
- Chart prop types are not exported: `React.ComponentProps<typeof LineChart>`.

## Customization

| Customize | Prop | Props type |
| --- | --- | --- |
| Tooltip body | `<Tooltip content={Fn} />` | `TooltipContentProps` (generic defaults since 3.8) |
| Tooltip value text | `formatter` | `(value: ValueType \| undefined, name: NameType \| undefined, item, index, payload)`; handle the whole union |
| Bar shape and per-bar colour | `shape` | `BarShapeProps`, render `<Rectangle {...props} />` |
| Pie sector | `shape` | `PieSectorShapeProps` with `isActive`, render `<Sector {...props} />` |
| Scatter point | `shape` | `ScatterShapeProps` |
| Axis tick | `tick` | `XAxisTickContentProps`, `YAxisTickContentProps` |
| Label | `content` on `Label` / `LabelList` | `LabelProps` |
| Legend | `content` | `LegendPayload` entries |

```tsx
function RevenueTooltip({ active, payload, label }: TooltipContentProps) {
  if (!active || payload.length === 0) return null;
  return <output>{label}: {payload.map((entry) => entry.value).join(", ")}</output>;
}
```

- `TooltipProps` types the `<Tooltip>` element's own props, not custom content.
- Tooltip content renders HTML; shapes, ticks, and labels render SVG.

## 3.x over 2.x

| Prefer | Over |
| --- | --- |
| a component rendered as a chart child, reading state through hooks | `<Customized>`, `CategoricalChartState` |
| hooks: `useChartWidth`, `usePlotArea`, `useActiveTooltipDataPoints`, `useXAxisScale`, `useIsTooltipActive` | reading chart internals |
| `<Tooltip defaultIndex={n} />`, `trigger="click"` | `activeIndex` on `Pie` / `Bar` / `Scatter` |
| `shape` with `props.isActive` / `props.index` | `<Cell>` per datum, `activeShape` (deprecated 3.7) |
| `zIndex` prop or `<ZIndexLayer>` | JSX order for layering (default layers since 3.4) |
| `ifOverflow` | `alwaysShow`, `isFront` |
| `content` on `<Legend>` | `payload` on `<Legend>` |
| handler `(state: MouseHandlerDataParam, event) => void` | `CategoricalChartState` handlers |

- Tooltip items sort by `name` and Legend items by `value` by default; pass `itemSorter` to control order.
- Chart `ref` is the `SVGSVGElement`.

## Performance and accessibility

- Items and axes are memoized: keep `data`, `dataKey` functions, and object props referentially stable; isolate hover state in a small component wrapping one series.
- Aggregate large datasets before rendering; `isAnimationActive={false}` for large or streaming data. The default `"auto"` already disables animation under SSR and `prefers-reduced-motion`.
- `accessibilityLayer` is on by default (keyboard tooltip navigation, `aria-live`); give each chart a `title` or `desc`. In tests, query the chart with `getByRole("application", { name: title })`.
