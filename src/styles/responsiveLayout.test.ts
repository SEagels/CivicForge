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
  });
});
