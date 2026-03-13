import { describe, it, expect } from "vitest";

describe("index", () => {
  it("mainがexportされている", async () => {
    const mod = await import("./index.js");
    expect(typeof mod.main).toBe("function");
  });
});
