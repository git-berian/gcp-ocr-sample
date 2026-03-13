import { describe, it, expect } from "vitest";
import { isSupportedMimeType } from "./mime-type.js";

describe("isSupportedMimeType", () => {
  it("application/pdf はサポート対象", () => {
    expect(isSupportedMimeType("application/pdf")).toBe(true);
  });

  it("image/png はサポート対象", () => {
    expect(isSupportedMimeType("image/png")).toBe(true);
  });

  it("image/jpeg はサポート対象", () => {
    expect(isSupportedMimeType("image/jpeg")).toBe(true);
  });

  it("image/tiff はサポート対象外", () => {
    expect(isSupportedMimeType("image/tiff")).toBe(false);
  });

  it("空文字はサポート対象外", () => {
    expect(isSupportedMimeType("")).toBe(false);
  });
});
