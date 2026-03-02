import { describe, it, expect, vi, afterEach } from "vitest";
import { mustEnv, guessMimeType } from "./index.js";

describe("mustEnv", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("環境変数が設定されている場合、値を返す", () => {
    vi.stubEnv("TEST_VAR", "hello");
    expect(mustEnv("TEST_VAR")).toBe("hello");
  });

  it("環境変数が未設定の場合、例外を投げる", () => {
    expect(() => mustEnv("NONEXISTENT_VAR_12345")).toThrow("Missing env: NONEXISTENT_VAR_12345");
  });

  it("環境変数が空文字の場合、例外を投げる", () => {
    vi.stubEnv("EMPTY_VAR", "");
    expect(() => mustEnv("EMPTY_VAR")).toThrow("Missing env: EMPTY_VAR");
  });
});

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
