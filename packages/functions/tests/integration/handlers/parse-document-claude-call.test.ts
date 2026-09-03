import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { HttpsError } from "firebase-functions/v2/https";
import { mockMessagesCreate } from "../helpers/mock-claude.js";
import {
  TEST_ENV,
  EXPECTED_CLAUDE_RECEIPT,
  MOCK_CLAUDE_RESPONSE,
  VALID_REQUEST_BODY,
  createMockCallableRequest,
} from "../helpers/fixtures.js";
import { handleParseDocumentClaudeCall } from "../../../src/handlers/parse-document-claude-call.js";
import { spyOnConsoleError, EXTRACT_FAILURE_LOG_PREFIX } from "../../support/console.js";

describe("handleParseDocumentClaudeCall（結合テスト）", () => {
  beforeEach(() => {
    mockMessagesCreate.mockReset();
    // 既定トランスポート（api）で検証する（ADR-0013）
    vi.stubEnv("CLAUDE_TRANSPORT", TEST_ENV.CLAUDE_TRANSPORT);
    vi.stubEnv("ANTHROPIC_API_KEY", TEST_ENV.ANTHROPIC_API_KEY);
    vi.stubEnv("CLAUDE_MODEL", TEST_ENV.CLAUDE_MODEL);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("正常系: バリデーション・Claude 呼び出しを経て receipt を返す", async () => {
    mockMessagesCreate.mockResolvedValue(MOCK_CLAUDE_RESPONSE);

    const result = await handleParseDocumentClaudeCall(createMockCallableRequest());

    expect(result).toEqual({ receipt: EXPECTED_CLAUDE_RECEIPT });

    const arg = mockMessagesCreate.mock.calls[0][0];
    expect(arg.model).toBe(TEST_ENV.CLAUDE_MODEL);
    // application/pdf は document ブロックで送る
    expect(arg.messages[0].content[0]).toEqual({
      type: "document",
      source: {
        type: "base64",
        media_type: VALID_REQUEST_BODY.mimeType,
        data: VALID_REQUEST_BODY.content,
      },
    });
  });

  it("バリデーションエラー: サポート外の mimeType で HttpsError(invalid-argument) を投げる", async () => {
    const request = createMockCallableRequest({
      data: { content: "base64data", mimeType: "text/plain" },
    });

    await expect(handleParseDocumentClaudeCall(request)).rejects.toSatisfy((error: HttpsError) => {
      expect(error).toBeInstanceOf(HttpsError);
      expect(error.code).toBe("invalid-argument");
      return true;
    });

    expect(mockMessagesCreate).not.toHaveBeenCalled();
  });

  it("SDK エラー: Claude がエラーを返した場合に HttpsError(internal) を投げる", async () => {
    const consoleError = spyOnConsoleError();
    mockMessagesCreate.mockRejectedValue(new Error("Vertex unavailable"));

    await expect(handleParseDocumentClaudeCall(createMockCallableRequest())).rejects.toSatisfy(
      (error: HttpsError) => {
        expect(error).toBeInstanceOf(HttpsError);
        expect(error.code).toBe("internal");
        expect(error.message).toBe("内部サーバーエラー");
        return true;
      },
    );

    expect(consoleError).toHaveBeenCalledWith(EXTRACT_FAILURE_LOG_PREFIX, expect.any(Error));
  });

  it("設定エラー: ANTHROPIC_API_KEY 不足で HttpsError(internal) を投げる", async () => {
    const consoleError = spyOnConsoleError();
    vi.stubEnv("ANTHROPIC_API_KEY", "");

    await expect(handleParseDocumentClaudeCall(createMockCallableRequest())).rejects.toSatisfy(
      (error: HttpsError) => {
        expect(error).toBeInstanceOf(HttpsError);
        expect(error.code).toBe("internal");
        return true;
      },
    );

    expect(mockMessagesCreate).not.toHaveBeenCalled();

    expect(consoleError).toHaveBeenCalledWith(EXTRACT_FAILURE_LOG_PREFIX, expect.any(Error));
  });
});
