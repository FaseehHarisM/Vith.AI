import { describe, it, expect } from "vitest";
import { haToAcres } from "@/data/fields";

describe("haToAcres", () => {
  it("converts 1 hectare to ~2.5 acres", () => {
    expect(haToAcres(1)).toBe(2.5);
  });
  it("converts 0 hectares to 0 acres", () => {
    expect(haToAcres(0)).toBe(0);
  });
  it("rounds to one decimal", () => {
    expect(haToAcres(10)).toBe(24.7);
  });
  it("handles fractional input", () => {
    expect(haToAcres(0.5)).toBe(1.2);
  });
});
