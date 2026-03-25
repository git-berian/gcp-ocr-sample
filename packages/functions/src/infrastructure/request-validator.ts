import { isSupportedMimeType } from "../domain/mime-type.js";

export interface ParseDocumentRequest {
  content: string;
  mimeType: string;
}

export interface ValidationResult {
  ok: true;
  data: ParseDocumentRequest;
}

export interface ValidationError {
  ok: false;
  message: string;
}

export function validateParseDocumentRequest(body: unknown): ValidationResult | ValidationError {
  if (body === null || body === undefined || typeof body !== "object") {
    return { ok: false, message: "リクエストボディは JSON オブジェクトである必要があります" };
  }

  const obj = body as Record<string, unknown>;

  if (typeof obj.content !== "string" || obj.content.length === 0) {
    return { ok: false, message: "content は必須で、空でない文字列（base64）である必要があります" };
  }

  if (typeof obj.mimeType !== "string" || obj.mimeType.length === 0) {
    return { ok: false, message: "mimeType は必須で、空でない文字列である必要があります" };
  }

  if (!isSupportedMimeType(obj.mimeType)) {
    return {
      ok: false,
      message: `サポートされていない mimeType: ${obj.mimeType}。対応形式: application/pdf, image/png, image/jpeg`,
    };
  }

  return {
    ok: true,
    data: { content: obj.content, mimeType: obj.mimeType },
  };
}
