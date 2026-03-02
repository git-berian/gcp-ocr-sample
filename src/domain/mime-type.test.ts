import { describe, it, expect } from "vitest";
import { guessMimeType } from "./mime-type.js";

describe("guessMimeType", () => {
  it(".pdf → application/pdf", () => {
    expect(guessMimeType("receipt.pdf")).toBe("application/pdf");
  });

  it(".png → image/png", () => {
    expect(guessMimeType("receipt.png")).toBe("image/png");
  });

  it(".jpg → image/jpeg", () => {
    expect(guessMimeType("receipt.jpg")).toBe("image/jpeg");
  });

  it(".jpeg → image/jpeg", () => {
    expect(guessMimeType("receipt.jpeg")).toBe("image/jpeg");
  });

  it("不明な拡張子 → image/jpeg（デフォルト）", () => {
    expect(guessMimeType("receipt.tiff")).toBe("image/jpeg");
  });

  it("大文字拡張子でも正しく判定する", () => {
    expect(guessMimeType("receipt.PDF")).toBe("application/pdf");
    expect(guessMimeType("receipt.PNG")).toBe("image/png");
  });
});
