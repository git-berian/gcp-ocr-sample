import { describe, it, expect, onTestFinished } from "vitest";
import { fileToBase64, isImageMimeType, isValidMimeType, SUPPORTED_MIME_TYPES } from "./file";

describe("isValidMimeType", () => {
  it.each(SUPPORTED_MIME_TYPES)("returns true for %s", (mimeType) => {
    expect(isValidMimeType(mimeType)).toBe(true);
  });

  it("returns false for unsupported MIME types", () => {
    expect(isValidMimeType("text/plain")).toBe(false);
    expect(isValidMimeType("image/gif")).toBe(false);
  });
});

describe("isImageMimeType", () => {
  it("returns true for image MIME types", () => {
    expect(isImageMimeType("image/png")).toBe(true);
    expect(isImageMimeType("image/jpeg")).toBe(true);
  });

  it("returns false for PDF and other non-image MIME types", () => {
    expect(isImageMimeType("application/pdf")).toBe(false);
    expect(isImageMimeType("text/plain")).toBe(false);
    expect(isImageMimeType("")).toBe(false);
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

  it("rejects when FileReader fails", async () => {
    const file = new File(["content"], "test.txt", { type: "text/plain" });

    const originalFileReader = globalThis.FileReader;
    // アサーションが失敗しても差し替えを確実に戻す。末尾の代入だけだと、
    // rejects の検証で落ちた時にパッチ済みの FileReader が後続テストへ漏れる。
    onTestFinished(() => {
      globalThis.FileReader = originalFileReader;
    });
    const mockError = new DOMException("Read failed");
    globalThis.FileReader = class extends originalFileReader {
      readAsDataURL() {
        Object.defineProperty(this, "error", { value: mockError });
        // ProgressEvent のコンストラクタは総称型を取れず ProgressEvent<EventTarget> になる。
        // fileToBase64 の onerror はイベント引数を参照せず reader.error だけを見るため、
        // ここでのキャストは実挙動に影響しない。
        this.onerror?.(new ProgressEvent("error") as ProgressEvent<FileReader>);
      }
    } as typeof FileReader;

    await expect(fileToBase64(file)).rejects.toBe(mockError);
  });
});
