const SUPPORTED_MIME_TYPES = new Set(["application/pdf", "image/png", "image/jpeg"]);

export function isSupportedMimeType(mimeType: string): boolean {
  return SUPPORTED_MIME_TYPES.has(mimeType);
}
