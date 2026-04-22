import { describe, it, expect } from "vitest";
import { MimeType, UnsupportedMimeTypeError } from "./mime-type.js";

describe("MimeType", () => {
  describe("from", () => {
    it.each(["application/pdf", "image/png", "image/jpeg"])(
      "サポート対象 %s から MimeType を生成できる",
      (value) => {
        const mimeType = MimeType.from(value);
        expect(mimeType).toBeInstanceOf(MimeType);
        expect(mimeType.value).toBe(value);
      },
    );

    it("サポート外の mimeType で UnsupportedMimeTypeError を投げる", () => {
      expect(() => MimeType.from("image/tiff")).toThrow(UnsupportedMimeTypeError);
    });

    it("空文字でも UnsupportedMimeTypeError を投げる", () => {
      expect(() => MimeType.from("")).toThrow(UnsupportedMimeTypeError);
    });

    it("例外メッセージに対応形式の一覧が含まれる", () => {
      expect(() => MimeType.from("image/tiff")).toThrow(
        "サポートされていない mimeType: image/tiff。対応形式: application/pdf, image/png, image/jpeg",
      );
    });
  });
});

describe("UnsupportedMimeTypeError", () => {
  it("不正値を value プロパティに保持する", () => {
    const error = new UnsupportedMimeTypeError("image/tiff");
    expect(error.value).toBe("image/tiff");
    expect(error.name).toBe("UnsupportedMimeTypeError");
  });
});
