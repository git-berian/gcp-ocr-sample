import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { HttpsError } from "firebase-functions/v2/https";
import { mockGenerateContent } from "../helpers/mock-gemini.js";
import {
  TEST_ENV,
  EXPECTED_GEMINI_RECEIPT,
  MOCK_GEMINI_RESPONSE,
  VALID_REQUEST_BODY,
  createMockCallableRequest,
} from "../helpers/fixtures.js";
import { handleParseDocumentGeminiCall } from "../../../src/handlers/parse-document-gemini-call.js";

describe("handleParseDocumentGeminiCall（結合テスト）", () => {
  beforeEach(() => {
    mockGenerateContent.mockReset();
    vi.stubEnv("GCP_PROJECT_ID", TEST_ENV.GCP_PROJECT_ID);
    vi.stubEnv("GEMINI_LOCATION", TEST_ENV.GEMINI_LOCATION);
    vi.stubEnv("GEMINI_MODEL", TEST_ENV.GEMINI_MODEL);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("正常系: バリデーション・Gemini 呼び出しを経て receipt を返す", async () => {
    mockGenerateContent.mockResolvedValue(MOCK_GEMINI_RESPONSE);

    const result = await handleParseDocumentGeminiCall(createMockCallableRequest());

    expect(result).toEqual({ receipt: EXPECTED_GEMINI_RECEIPT });

    const arg = mockGenerateContent.mock.calls[0][0];
    expect(arg.model).toBe(TEST_ENV.GEMINI_MODEL);
    expect(arg.contents[0].parts[0]).toEqual({
      inlineData: { mimeType: VALID_REQUEST_BODY.mimeType, data: VALID_REQUEST_BODY.content },
    });
  });

  it("バリデーションエラー: サポート外の mimeType で HttpsError(invalid-argument) を投げる", async () => {
    const request = createMockCallableRequest({
      data: { content: "base64data", mimeType: "text/plain" },
    });

    await expect(handleParseDocumentGeminiCall(request)).rejects.toSatisfy((error: HttpsError) => {
      expect(error).toBeInstanceOf(HttpsError);
      expect(error.code).toBe("invalid-argument");
      return true;
    });

    expect(mockGenerateContent).not.toHaveBeenCalled();
  });

  it("SDK エラー: Gemini がエラーを返した場合に HttpsError(internal) を投げる", async () => {
    mockGenerateContent.mockRejectedValue(new Error("Vertex unavailable"));

    await expect(handleParseDocumentGeminiCall(createMockCallableRequest())).rejects.toSatisfy(
      (error: HttpsError) => {
        expect(error).toBeInstanceOf(HttpsError);
        expect(error.code).toBe("internal");
        expect(error.message).toBe("内部サーバーエラー");
        return true;
      },
    );
  });

  it("設定エラー: GCP_PROJECT_ID 不足で HttpsError(internal) を投げる", async () => {
    vi.stubEnv("GCP_PROJECT_ID", "");

    await expect(handleParseDocumentGeminiCall(createMockCallableRequest())).rejects.toSatisfy(
      (error: HttpsError) => {
        expect(error).toBeInstanceOf(HttpsError);
        expect(error.code).toBe("internal");
        return true;
      },
    );

    expect(mockGenerateContent).not.toHaveBeenCalled();
  });
});
