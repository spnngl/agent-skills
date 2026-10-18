/**
 * WCAG contrast gate for theme tokens declared in CSS.
 *
 * Usage: node contrast.ts <theme.css> [--pair fg:bg:min]...
 *
 * Reads custom properties from `:root`, theme blocks (`[data-theme="dark"]`, `.dark`,
 * `@media (prefers-color-scheme: dark)`), and `light-dark(light, dark)` values; resolves
 * `var()` references; checks each foreground/background pair in light and dark.
 * Colours: `oklch()`, `#rgb`, `#rrggbb`. Exit 0 when every pair passes, 1 on a failure,
 * 2 on a usage or parse error. Requires Node 22.18 or later (type stripping).
 */
import { readFileSync } from "node:fs";
import { argv, exit } from "node:process";
import { fileURLToPath } from "node:url";

export type Theme = "light" | "dark";

export interface Pair {
  readonly fg: string;
  readonly bg: string;
  readonly min: number;
}

export interface PairResult extends Pair {
  readonly theme: Theme;
  readonly ratio: number;
}

type Scope = Theme | "both";

/** Theme-resolved token maps: name without the leading `--` to raw CSS value. */
export type Tokens = Record<Theme, ReadonlyMap<string, string>>;

const SRGB_GAMMA_THRESHOLD = 0.04045;

/** Splits on commas outside parentheses. */
function splitTopLevel(value: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < value.length; i++) {
    const ch = value[i];
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    else if (ch === "," && depth === 0) {
      parts.push(value.slice(start, i).trim());
      start = i + 1;
    }
  }
  parts.push(value.slice(start).trim());
  return parts;
}

function scopeOf(selectors: readonly string[]): Scope {
  const joined = selectors.join(" ");
  if (/dark/.test(joined)) return "dark";
  if (/light/.test(joined)) return "light";
  return "both";
}

/** Parses custom properties from a stylesheet into light and dark token maps. */
export function parseTokens(css: string): Tokens {
  const source = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const light = new Map<string, string>();
  const dark = new Map<string, string>();
  const stack: string[] = [];
  let buffer = "";

  const declare = (text: string): void => {
    const match = /^\s*--([\w-]+)\s*:\s*([\s\S]+?)\s*$/.exec(text);
    if (match === null) return;
    const [, name, value] = match;
    if (name === undefined || value === undefined) return;
    const scope = scopeOf(stack);
    const lightDark = /^light-dark\(([\s\S]*)\)$/.exec(value);
    const inner = lightDark?.[1];
    const [lightValue, darkValue] = inner === undefined ? [value, value] : splitTopLevel(inner);
    if (lightValue === undefined || darkValue === undefined) return;
    if (scope !== "dark") light.set(name, lightValue);
    if (scope !== "light") dark.set(name, darkValue);
  };

  for (const ch of source) {
    if (ch === "{") {
      stack.push(buffer.trim());
      buffer = "";
    } else if (ch === "}") {
      declare(buffer);
      stack.pop();
      buffer = "";
    } else if (ch === ";") {
      declare(buffer);
      buffer = "";
    } else {
      buffer += ch;
    }
  }

  // `--color-primary` from a plain `@theme` block also answers to `primary`.
  for (const map of [light, dark]) {
    for (const [name, value] of [...map]) {
      const short = name.replace(/^color-/, "");
      if (short !== name && !map.has(short)) map.set(short, value);
    }
  }
  return { light, dark };
}

/** Follows `var(--x)` references until a literal value, or `undefined` on a dangling or cyclic reference. */
export function resolve(tokens: ReadonlyMap<string, string>, name: string): string | undefined {
  const seen = new Set<string>();
  let current = name;
  for (;;) {
    if (seen.has(current)) return undefined;
    seen.add(current);
    const value = tokens.get(current);
    if (value === undefined) return undefined;
    const ref = /^var\(\s*--([\w-]+)\s*(?:,[\s\S]*)?\)$/.exec(value);
    const next = ref?.[1];
    if (next === undefined) return value;
    current = next;
  }
}

function srgbToLinear(channel: number): number {
  return channel <= SRGB_GAMMA_THRESHOLD ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

function parseNumber(raw: string | undefined, percentScale: number): number | undefined {
  if (raw === undefined || raw === "none") return undefined;
  const value = Number.parseFloat(raw);
  if (Number.isNaN(value)) return undefined;
  return raw.endsWith("%") ? (value / 100) * percentScale : value;
}

/** Converts a CSS colour to linear sRGB channels clamped to [0, 1], or `undefined` when unsupported. */
export function toLinearRgb(color: string): readonly [number, number, number] | undefined {
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim());
  const digits = hex?.[1];
  if (digits !== undefined) {
    const full = digits.length === 3 ? [...digits].map((d) => d + d).join("") : digits;
    const channel = (i: number): number => srgbToLinear(Number.parseInt(full.slice(i, i + 2), 16) / 255);
    return [channel(0), channel(2), channel(4)];
  }

  const oklch = /^oklch\(\s*([^\s/)]+)\s+([^\s/)]+)\s+([^\s/)]+)\s*\)$/i.exec(color.trim());
  if (oklch === null) return undefined;
  const lightness = parseNumber(oklch[1], 1);
  const chroma = parseNumber(oklch[2], 0.4);
  const hue = parseNumber(oklch[3]?.replace(/deg$/, ""), 1);
  if (lightness === undefined || chroma === undefined || hue === undefined) return undefined;

  const a = chroma * Math.cos((hue * Math.PI) / 180);
  const b = chroma * Math.sin((hue * Math.PI) / 180);
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const clamp = (x: number): number => Math.min(1, Math.max(0, x));
  return [
    clamp(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    clamp(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    clamp(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
}

/** WCAG 2 contrast ratio between two CSS colours, or `undefined` when either is unsupported. */
export function contrast(fg: string, bg: string): number | undefined {
  const luminance = (color: string): number | undefined => {
    const rgb = toLinearRgb(color);
    return rgb === undefined ? undefined : 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
  };
  const a = luminance(fg);
  const b = luminance(bg);
  if (a === undefined || b === undefined) return undefined;
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/** Pairs implied by shadcn-style names: every `x-foreground` on `x`, body and muted text, the focus ring. */
export function defaultPairs(tokens: Tokens): Pair[] {
  const names = new Set([...tokens.light.keys(), ...tokens.dark.keys()]);
  const pairs: Pair[] = [];
  for (const name of names) {
    if (name.startsWith("color-") && names.has(name.slice("color-".length))) continue; // `@theme` alias
    const base = name.endsWith("-foreground") ? name.slice(0, -"-foreground".length) : undefined;
    if (base !== undefined && names.has(base)) pairs.push({ fg: name, bg: base, min: 4.5 });
  }
  const candidates: readonly Pair[] = [
    { fg: "foreground", bg: "background", min: 4.5 },
    { fg: "muted-foreground", bg: "background", min: 4.5 },
    { fg: "muted-foreground", bg: "card", min: 4.5 },
    { fg: "ring", bg: "background", min: 3 },
  ];
  for (const pair of candidates) {
    if (names.has(pair.fg) && names.has(pair.bg)) pairs.push(pair);
  }
  return pairs;
}

/** Checks every pair in both themes; throws when a token is missing or its colour is unsupported. */
export function check(tokens: Tokens, pairs: readonly Pair[]): PairResult[] {
  const themes: readonly Theme[] = ["light", "dark"];
  return themes.flatMap((theme) =>
    pairs.map((pair) => {
      const fg = resolve(tokens[theme], pair.fg);
      const bg = resolve(tokens[theme], pair.bg);
      if (fg === undefined || bg === undefined) {
        throw new Error(`${theme}: cannot resolve --${fg === undefined ? pair.fg : pair.bg}`);
      }
      const ratio = contrast(fg, bg);
      if (ratio === undefined) throw new Error(`${theme}: unsupported colour in ${pair.fg} (${fg}) or ${pair.bg} (${bg})`);
      return { ...pair, theme, ratio };
    }),
  );
}

function parsePairArg(raw: string): Pair {
  const [fg, bg, min] = raw.split(":");
  const minimum = Number(min);
  if (fg === undefined || fg === "" || bg === undefined || bg === "" || Number.isNaN(minimum)) {
    throw new Error(`invalid --pair "${raw}", expected fg:bg:min such as input:background:3`);
  }
  return { fg, bg, min: minimum };
}

function main(args: readonly string[]): number {
  const [file, ...rest] = args;
  if (file === undefined) {
    console.error("usage: node contrast.ts <theme.css> [--pair fg:bg:min]...");
    return 2;
  }
  const extra: Pair[] = [];
  for (let i = 0; i < rest.length; i++) {
    const value = rest[i + 1];
    if (rest[i] !== "--pair" || value === undefined) {
      console.error(`unexpected argument "${rest[i]}"`);
      return 2;
    }
    extra.push(parsePairArg(value));
    i++;
  }

  const tokens = parseTokens(readFileSync(file, "utf8"));
  const pairs = [...defaultPairs(tokens), ...extra];
  if (pairs.length === 0) {
    console.error(`no colour pairs found in ${file}; pass --pair fg:bg:min`);
    return 2;
  }
  const results = check(tokens, pairs);
  for (const r of results) {
    const verdict = r.ratio >= r.min ? "PASS" : "FAIL";
    console.log(`${verdict}  ${r.theme.padEnd(5)}  ${r.fg} on ${r.bg}  ${r.ratio.toFixed(2)}:1 (min ${r.min}:1)`);
  }
  const failures = results.filter((r) => r.ratio < r.min).length;
  console.log(`${results.length - failures}/${results.length} pairs pass`);
  return failures === 0 ? 0 : 1;
}

if (argv[1] === fileURLToPath(import.meta.url)) {
  try {
    exit(main(argv.slice(2)));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    exit(2);
  }
}
