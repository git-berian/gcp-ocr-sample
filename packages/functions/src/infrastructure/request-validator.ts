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
    return { ok: false, message: "Request body must be a JSON object" };
  }

  const obj = body as Record<string, unknown>;

  if (typeof obj.content !== "string" || obj.content.length === 0) {
    return { ok: false, message: "content is required and must be a non-empty string (base64)" };
  }

  if (typeof obj.mimeType !== "string" || obj.mimeType.length === 0) {
    return { ok: false, message: "mimeType is required and must be a non-empty string" };
  }

  if (!isSupportedMimeType(obj.mimeType)) {
    return {
      ok: false,
      message: `Unsupported mimeType: ${obj.mimeType}. Supported: application/pdf, image/png, image/jpeg`,
    };
  }

  return {
    ok: true,
    data: { content: obj.content, mimeType: obj.mimeType },
  };
}
