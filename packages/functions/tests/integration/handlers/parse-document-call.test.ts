import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { HttpsError } from "firebase-functions/v2/https";
import { mockProcessDocument } from "../helpers/mock-document-ai.js";
import {
  TEST_ENV,
  EXPECTED_PROCESSOR_NAME,
  EXPECTED_DOCAI_RECEIPT,
  MOCK_SDK_RESPONSE,
  VALID_REQUEST_BODY,
  createMockCallableRequest,
} from "../helpers/fixtures.js";
import { handleParseDocumentCall } from "../../../src/handlers/parse-document-call.js";

describe("handleParseDocumentCall（結合テスト）", () => {
  beforeEach(() => {
    mockProcessDocument.mockReset();
    vi.stubEnv("GCP_PROJECT_ID", TEST_ENV.GCP_PROJECT_ID);
    vi.stubEnv("DOCAI_LOCATION", TEST_ENV.DOCAI_LOCATION);
    vi.stubEnv("DOCAI_PROCESSOR_ID", TEST_ENV.DOCAI_PROCESSOR_ID);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("正常系: バリデーション・Document AI 呼び出しを経て receipt を返す", async () => {
    mockProcessDocument.mockResolvedValue(MOCK_SDK_RESPONSE);

    const request = createMockCallableRequest();
    const result = await handleParseDocumentCall(request);

    expect(result).toEqual({ receipt: EXPECTED_DOCAI_RECEIPT });

    expect(mockProcessDocument).toHaveBeenCalledWith({
      name: EXPECTED_PROCESSOR_NAME,
      rawDocument: {
        content: VALID_REQUEST_BODY.content,
        mimeType: VALID_REQUEST_BODY.mimeType,
      },
    });
  });

  it("バリデーションエラー: サポート外の mimeType で HttpsError(invalid-argument) を投げる", async () => {
    const request = createMockCallableRequest({
      data: { content: "base64data", mimeType: "text/plain" },
    });

    await expect(handleParseDocumentCall(request)).rejects.toSatisfy((error: HttpsError) => {
      expect(error).toBeInstanceOf(HttpsError);
      expect(error.code).toBe("invalid-argument");
      return true;
    });

    expect(mockProcessDocument).not.toHaveBeenCalled();
  });

  it("SDK エラー: Document AI がエラーを返した場合に HttpsError(internal) を投げる", async () => {
    mockProcessDocument.mockRejectedValue(new Error("Document AI unavailable"));

    const request = createMockCallableRequest();

    await expect(handleParseDocumentCall(request)).rejects.toSatisfy((error: HttpsError) => {
      expect(error).toBeInstanceOf(HttpsError);
      expect(error.code).toBe("internal");
      expect(error.message).toBe("内部サーバーエラー");
      return true;
    });
  });

  it("設定エラー: 環境変数不足で HttpsError(internal) を投げる", async () => {
    vi.stubEnv("GCP_PROJECT_ID", "");
    vi.stubEnv("DOCAI_LOCATION", "");
    vi.stubEnv("DOCAI_PROCESSOR_ID", "");

    const request = createMockCallableRequest();

    await expect(handleParseDocumentCall(request)).rejects.toSatisfy((error: HttpsError) => {
      expect(error).toBeInstanceOf(HttpsError);
      expect(error.code).toBe("internal");
      return true;
    });

    expect(mockProcessDocument).not.toHaveBeenCalled();
  });
});
