import { describe, it, expect } from "vitest";
import { validateParseDocumentRequest } from "./request-validator.js";
import { MimeType } from "../domain/mime-type.js";

describe("validateParseDocumentRequest", () => {
  it("有効なリクエストを受け付け、mimeType は MimeType インスタンスになる", () => {
    const result = validateParseDocumentRequest({
      content: "base64data",
      mimeType: "application/pdf",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.content).toBe("base64data");
    expect(result.data.mimeType).toBeInstanceOf(MimeType);
    expect(result.data.mimeType.value).toBe("application/pdf");
  });

  it("bodyがnullの場合、エラーを返す", () => {
    const result = validateParseDocumentRequest(null);
    expect(result).toEqual({
      ok: false,
      message: "リクエストボディは JSON オブジェクトである必要があります",
    });
  });

  it("bodyがundefinedの場合、エラーを返す", () => {
    const result = validateParseDocumentRequest(undefined);
    expect(result).toEqual({
      ok: false,
      message: "リクエストボディは JSON オブジェクトである必要があります",
    });
  });

  it("contentが欠けている場合、エラーを返す", () => {
    const result = validateParseDocumentRequest({ mimeType: "application/pdf" });
    expect(result).toEqual({
      ok: false,
      message: "content は必須で、空でない文字列（base64）である必要があります",
    });
  });

  it("contentが空文字の場合、エラーを返す", () => {
    const result = validateParseDocumentRequest({ content: "", mimeType: "application/pdf" });
    expect(result).toEqual({
      ok: false,
      message: "content は必須で、空でない文字列（base64）である必要があります",
    });
  });

  it("mimeTypeが欠けている場合、エラーを返す", () => {
    const result = validateParseDocumentRequest({ content: "base64data" });
    expect(result).toEqual({
      ok: false,
      message: "mimeType は必須で、空でない文字列である必要があります",
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
        "サポートされていない mimeType: image/tiff。対応形式: application/pdf, image/png, image/jpeg",
    });
  });
});
