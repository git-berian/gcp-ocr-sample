import { describe, it, expect } from "vitest";
import { fileToBase64, isValidMimeType, SUPPORTED_MIME_TYPES } from "./file";

describe("isValidMimeType", () => {
  it.each(SUPPORTED_MIME_TYPES)("returns true for %s", (mimeType) => {
    expect(isValidMimeType(mimeType)).toBe(true);
  });

  it("returns false for unsupported MIME types", () => {
    expect(isValidMimeType("text/plain")).toBe(false);
    expect(isValidMimeType("image/gif")).toBe(false);
  });
});

describe("fileToBase64", () => {
  it("converts a file to base64 string", async () => {
    const content = "hello world";
    const file = new File([content], "test.txt", { type: "text/plain" });

    const result = await fileToBase64(file);

    expect(result).toBe(btoa(content));
  });

  it("strips the data URL prefix from the result", async () => {
    const file = new File(["test"], "test.png", { type: "image/png" });

    const result = await fileToBase64(file);

    expect(result).not.toContain("data:");
    expect(result).not.toContain("base64,");
  });
});
