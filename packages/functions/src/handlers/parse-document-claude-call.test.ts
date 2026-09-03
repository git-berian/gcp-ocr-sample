import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { HttpsError } from "firebase-functions/v2/https";
import { handleParseDocumentClaudeCall } from "./parse-document-claude-call.js";
import { spyOnConsoleError, EXTRACT_FAILURE_LOG_PREFIX } from "../../tests/support/console.js";

vi.mock("../infrastructure/config.js", () => ({
  loadClaudeConfig: () => ({
    transport: "api",
    apiKey: "sk-ant-test",
    model: "claude-opus-4-8",
    timeoutMs: 30000,
  }),
}));

const mockExtract = vi.fn();
vi.mock("../infrastructure/claude-client.js", () => ({
  createClaudeReceiptExtractor: () => ({ extract: mockExtract }),
}));

const mockReceipt = {
  supplierName: "テスト商店",
  receiptDate: "2026-05-16",
  totalAmount: 4800,
  taxAmount: 436,
  registrationNumber: "T1234567890123",
  transcription: "領収書",
  meta: { source: "claude" as const },
};

function createMockRequest(overrides: Partial<{ data: unknown; auth: unknown }> = {}) {
  return {
    data: { content: "base64data", mimeType: "image/jpeg" },
    ...overrides,
  } as Parameters<typeof handleParseDocumentClaudeCall>[0];
}

describe("handleParseDocumentClaudeCall", () => {
  beforeEach(() => {
    mockExtract.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("正常なリクエストで receipt を返す", async () => {
    mockExtract.mockResolvedValue(mockReceipt);

    const result = await handleParseDocumentClaudeCall(createMockRequest());

    expect(result).toEqual({ receipt: mockReceipt });
  });

  it("バリデーションエラーで invalid-argument の HttpsError を投げる", async () => {
    const request = createMockRequest({ data: {} });

    await expect(handleParseDocumentClaudeCall(request)).rejects.toSatisfy((error: HttpsError) => {
      expect(error).toBeInstanceOf(HttpsError);
      expect(error.code).toBe("invalid-argument");
      return true;
    });
  });

  it("抽出エラーで internal の HttpsError を投げる", async () => {
    const consoleError = spyOnConsoleError();
    mockExtract.mockRejectedValue(new Error("Vertex error"));

    await expect(handleParseDocumentClaudeCall(createMockRequest())).rejects.toSatisfy(
      (error: HttpsError) => {
        expect(error).toBeInstanceOf(HttpsError);
        expect(error.code).toBe("internal");
        expect(error.message).toBe("内部サーバーエラー");
        return true;
      },
    );

    expect(consoleError).toHaveBeenCalledWith(EXTRACT_FAILURE_LOG_PREFIX, expect.any(Error));
  });

  it("Error以外の例外でも internal の HttpsError を投げる", async () => {
    const consoleError = spyOnConsoleError();
    mockExtract.mockRejectedValue("string error");

    await expect(handleParseDocumentClaudeCall(createMockRequest())).rejects.toSatisfy(
      (error: HttpsError) => {
        expect(error).toBeInstanceOf(HttpsError);
        expect(error.code).toBe("internal");
        return true;
      },
    );

    expect(consoleError).toHaveBeenCalledWith(EXTRACT_FAILURE_LOG_PREFIX, "string error");
  });
});
