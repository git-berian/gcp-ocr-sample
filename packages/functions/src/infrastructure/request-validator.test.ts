import { describe, it, expect } from "vitest";
import { validateParseDocumentRequest } from "./request-validator.js";

describe("validateParseDocumentRequest", () => {
  it("有効なリクエストを受け付ける", () => {
    const result = validateParseDocumentRequest({
      content: "base64data",
      mimeType: "application/pdf",
    });
    expect(result).toEqual({
      ok: true,
      data: { content: "base64data", mimeType: "application/pdf" },
    });
  });

  it("bodyがnullの場合、エラーを返す", () => {
    const result = validateParseDocumentRequest(null);
    expect(result).toEqual({ ok: false, message: "Request body must be a JSON object" });
  });

  it("bodyがundefinedの場合、エラーを返す", () => {
    const result = validateParseDocumentRequest(undefined);
    expect(result).toEqual({ ok: false, message: "Request body must be a JSON object" });
  });

  it("contentが欠けている場合、エラーを返す", () => {
    const result = validateParseDocumentRequest({ mimeType: "application/pdf" });
    expect(result).toEqual({
      ok: false,
      message: "content is required and must be a non-empty string (base64)",
    });
  });

  it("contentが空文字の場合、エラーを返す", () => {
    const result = validateParseDocumentRequest({ content: "", mimeType: "application/pdf" });
    expect(result).toEqual({
      ok: false,
      message: "content is required and must be a non-empty string (base64)",
    });
  });

  it("mimeTypeが欠けている場合、エラーを返す", () => {
    const result = validateParseDocumentRequest({ content: "base64data" });
    expect(result).toEqual({
      ok: false,
      message: "mimeType is required and must be a non-empty string",
    });
  });

  it("サポートされていないmimeTypeの場合、エラーを返す", () => {
    const result = validateParseDocumentRequest({
      content: "base64data",
      mimeType: "image/tiff",
    });
    expect(result).toEqual({
      ok: false,
      message:
        "Unsupported mimeType: image/tiff. Supported: application/pdf, image/png, image/jpeg",
    });
  });
});
