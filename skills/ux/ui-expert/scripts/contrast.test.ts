import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { check, contrast, defaultPairs, parseTokens, resolve } from "./contrast.ts";

describe("contrast", () => {
  it("rates black on white at 21:1", () => {
    assert.equal(contrast("#000", "#ffffff"), 21);
  });

  it("matches hex for an equivalent oklch colour", () => {
    const fromOklch = contrast("oklch(1 0 0)", "oklch(0 0 0)");
    assert.ok(fromOklch !== undefined && Math.abs(fromOklch - 21) < 0.01);
  });

  it("reads percentage lightness and deg hue", () => {
    assert.equal(contrast("oklch(100% 0 90deg)", "#000"), contrast("oklch(1 0 90)", "#000"));
  });

  it("returns undefined for unsupported colours", () => {
    assert.equal(contrast("rgb(0 0 0 / 50%)", "#fff"), undefined);
  });
});

describe("parseTokens", () => {
  const css = `
    /* comment { --ignored: #f00; } */
    :root { color-scheme: light dark; --background: light-dark(#ffffff, #000000); --foreground: var(--ink); --ink: #111111; }
    [data-theme="dark"] { --ink: #eeeeee; }
    @media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --muted: #222222; } }
    @theme inline { --color-background: var(--background); --color-card: #fafafa; }
  `;
  const tokens = parseTokens(css);

  it("splits light-dark() per theme", () => {
    assert.equal(tokens.light.get("background"), "#ffffff");
    assert.equal(tokens.dark.get("background"), "#000000");
  });

  it("scopes dark selectors and media queries to dark", () => {
    assert.equal(resolve(tokens.light, "foreground"), "#111111");
    assert.equal(resolve(tokens.dark, "foreground"), "#eeeeee");
    assert.equal(tokens.light.has("muted"), false);
    assert.equal(tokens.dark.get("muted"), "#222222");
  });

  it("aliases --color-* without overriding the semantic token", () => {
    assert.equal(tokens.light.get("card"), "#fafafa");
    assert.equal(tokens.light.get("background"), "#ffffff");
  });

  it("drops comments", () => {
    assert.equal(tokens.light.has("ignored"), false);
  });

  it("returns undefined for cyclic references", () => {
    assert.equal(resolve(new Map([["a", "var(--b)"], ["b", "var(--a)"]]), "a"), undefined);
  });
});

describe("check", () => {
  it("checks default pairs in both themes and reports failures", () => {
    const tokens = parseTokens(`
      :root { --primary: #2563eb; --primary-foreground: #ffffff; --background: #ffffff; --foreground: #fafafa; }
    `);
    const results = check(tokens, defaultPairs(tokens));
    assert.equal(results.length, 4);
    const body = results.find((r) => r.fg === "foreground" && r.theme === "light");
    assert.ok(body !== undefined && body.ratio < 4.5);
    const button = results.find((r) => r.fg === "primary-foreground" && r.theme === "dark");
    assert.ok(button !== undefined && button.ratio >= 4.5);
  });

  it("skips @theme aliases of semantic tokens", () => {
    const tokens = parseTokens(`
      :root { --primary: #2563eb; --primary-foreground: #ffffff; }
      @theme inline { --color-primary: var(--primary); --color-primary-foreground: var(--primary-foreground); }
    `);
    assert.deepEqual(defaultPairs(tokens), [{ fg: "primary-foreground", bg: "primary", min: 4.5 }]);
  });

  it("throws on a missing token", () => {
    assert.throws(() => check(parseTokens(":root { --a: #000; }"), [{ fg: "a", bg: "b", min: 3 }]), /cannot resolve --b/);
  });
});
