import { describe, it, expect } from "vitest";
import { validateApiKey } from "./auth-validator.js";

describe("validateApiKey", () => {
  const validKey = "test-api-key-12345";

  it("正しい API キーで認証成功", () => {
    const result = validateApiKey(`Bearer ${validKey}`, validKey);
    expect(result).toEqual({ ok: true });
  });

  it("不正な API キーで認証失敗", () => {
    const result = validateApiKey("Bearer wrong-key", validKey);
    expect(result).toEqual({ ok: false, message: "無効な API キーです。" });
  });

  it("Bearer 以外の形式で認証失敗", () => {
    const result = validateApiKey("Basic abc123", validKey);
    expect(result).toEqual({
      ok: false,
      message: "Authorization ヘッダーの形式が不正です。Bearer <API_KEY> を使用してください。",
    });
  });

  it("Authorization ヘッダーなしで認証失敗", () => {
    const result = validateApiKey(undefined, validKey);
    expect(result).toEqual({ ok: false, message: "認証が必要です。" });
  });

  it("Bearer の後が空で認証失敗", () => {
    const result = validateApiKey("Bearer ", validKey);
    expect(result).toEqual({ ok: false, message: "無効な API キーです。" });
  });
});
