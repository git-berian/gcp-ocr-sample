const SUPPORTED_MIME_TYPES = ["application/pdf", "image/png", "image/jpeg"] as const;

export class UnsupportedMimeTypeError extends Error {
  constructor(public readonly value: string) {
    super(`サポートされていない mimeType: ${value}。対応形式: ${SUPPORTED_MIME_TYPES.join(", ")}`);
    this.name = "UnsupportedMimeTypeError";
  }
}

export class MimeType {
  private constructor(public readonly value: string) {}

  static from(value: string): MimeType {
    if (!(SUPPORTED_MIME_TYPES as readonly string[]).includes(value)) {
      throw new UnsupportedMimeTypeError(value);
    }
    return new MimeType(value);
  }
}
