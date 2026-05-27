import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("./global.css", import.meta.url), "utf8");

describe("responsive desktop layout CSS", () => {
  it("does not lock the app to a fixed body width", () => {
    expect(css).not.toMatch(/body\s*\{[^}]*min-width:\s*980px/s);
  });

  it("defines narrower layout breakpoints for constrained windows", () => {
    expect(css).toContain("@media (max-width: 1120px)");
    expect(css).toContain("@media (max-width: 760px)");
    expect(css).toMatch(/@media \(max-width: 760px\)[\s\S]*\.desktop-shell\s*\{[\s\S]*grid-template-columns:\s*1fr/s);
    expect(css).toContain("@media (max-width: 980px)");
    expect(css).toMatch(/@media \(max-width: 980px\)[\s\S]*\.inspector\s*\{[\s\S]*grid-column:\s*2 \/ -1/s);
  });

  it("defines shared glassmorphism tokens for the macOS-style refresh", () => {
    expect(css).toContain("--surface-glass");
    expect(css).toContain("--shadow-glass");
    expect(css).toContain("--motion-fast");
    expect(css).toContain("backdrop-filter");
  });

  it("respects reduced motion preferences", () => {
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*animation-duration:\s*0\.01ms/s);
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*transition-duration:\s*0\.01ms/s);
  });

  it("defines compact controls for the high-frequency material workflow", () => {
    expect(css).toContain(".library-quick-filters");
    expect(css).toContain(".workbench-step-chip");
    expect(css).toContain(".next-action-panel");
    expect(css).toContain(".review-card-actions");
    expect(css).toMatch(/\.library-quick-filters\s*\{[\s\S]*flex-wrap:\s*wrap/s);
    expect(css).toMatch(/\.editor-toolbar\s*\{[\s\S]*flex-wrap:\s*wrap/s);
  });

  it("defines responsive styles for the answer call workbench", () => {
    expect(css).toContain(".answer-workbench");
    expect(css).toContain(".answer-controls");
    expect(css).toContain(".callable-groups");
    expect(css).toContain(".answer-draft-card");
    expect(css).toContain(".answer-slot-grid");
    expect(css).toContain(".answer-slot-card");
    expect(css).toContain(".answer-preview-card");
    expect(css).toMatch(/\.answer-controls\s*\{[\s\S]*grid-template-columns:\s*repeat\(4, minmax\(160px, 1fr\)\)/s);
    expect(css).toMatch(/@media \(max-width: 980px\)[\s\S]*\.answer-layout\s*\{[\s\S]*grid-template-columns:\s*minmax\(0, 1fr\)/s);
    expect(css).toMatch(/\.answer-slot-grid\s*\{[\s\S]*grid-template-columns:\s*repeat\(auto-fit, minmax\(min\(100%, 220px\), 1fr\)\)/s);
  });
});
