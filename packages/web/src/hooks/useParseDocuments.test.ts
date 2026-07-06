import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useParseDocuments } from "./useParseDocuments";
import * as parseDocumentApi from "../api/parse-document";
import * as fileUtils from "../utils/file";
import type { ReceiptExtraction } from "../api/types";

const RECEIPT: ReceiptExtraction = {
  supplierName: "テスト商店",
  receiptDate: "2026-05-16",
  totalAmount: 4800,
  taxAmount: 436,
  registrationNumber: "T1234567890123",
  transcription: "書き起こし",
  meta: { source: "gemini" },
};

vi.mock("../api/parse-document");
vi.mock("../utils/file", async (importOriginal) => {
  const actual = await importOriginal<typeof fileUtils>();
  return {
    ...actual,
    fileToBase64: vi.fn(),
    isValidMimeType: vi.fn(),
  };
});

describe("useParseDocuments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fileUtils.isValidMimeType).mockReturnValue(true);
    vi.mocked(fileUtils.fileToBase64).mockResolvedValue("base64data");
  });

  it("初期状態を返す", () => {
    const { result } = renderHook(() => useParseDocuments());

    expect(result.current.jobs).toEqual([]);
    expect(result.current.isProcessing).toBe(false);
  });

  it("複数ファイルを送信して全て成功する", async () => {
    const mockResponse = { receipt: RECEIPT };
    vi.mocked(parseDocumentApi.parseDocument).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useParseDocuments());
    const files = [
      new File(["a"], "receipt1.png", { type: "image/png" }),
      new File(["b"], "receipt2.png", { type: "image/png" }),
    ];

    await act(async () => {
      result.current.submitAll(files);
    });

    // runWithConcurrency の非同期処理を待つ
    await act(async () => {
      await vi.waitFor(() => {
        expect(result.current.jobs.every((j) => j.status === "success")).toBe(true);
      });
    });

    expect(result.current.jobs).toHaveLength(2);
    expect(result.current.jobs[0].fileName).toBe("receipt1.png");
    expect(result.current.jobs[0].result).toEqual(mockResponse);
    expect(result.current.jobs[1].fileName).toBe("receipt2.png");
    expect(result.current.isProcessing).toBe(false);
  });

  it("選択したエンジンを parseDocument に渡す", async () => {
    vi.mocked(parseDocumentApi.parseDocument).mockResolvedValue({ receipt: RECEIPT });

    const { result } = renderHook(() => useParseDocuments());
    const files = [new File(["a"], "receipt.png", { type: "image/png" })];

    await act(async () => {
      result.current.submitAll(files, "gemini");
    });

    await act(async () => {
      await vi.waitFor(() => {
        expect(result.current.jobs[0].status).toBe("success");
      });
    });

    expect(parseDocumentApi.parseDocument).toHaveBeenCalledWith(
      { content: "base64data", mimeType: "image/png" },
      "gemini",
    );
    expect(result.current.jobs[0].engine).toBe("gemini");
  });

  it("エンジン未指定なら document-ai を使う", async () => {
    vi.mocked(parseDocumentApi.parseDocument).mockResolvedValue({ receipt: RECEIPT });

    const { result } = renderHook(() => useParseDocuments());
    const files = [new File(["a"], "receipt.png", { type: "image/png" })];

    await act(async () => {
      result.current.submitAll(files);
    });

    await act(async () => {
      await vi.waitFor(() => {
        expect(result.current.jobs[0].status).toBe("success");
      });
    });

    expect(parseDocumentApi.parseDocument).toHaveBeenCalledWith(
      { content: "base64data", mimeType: "image/png" },
      "document-ai",
    );
  });

  it("リトライ時も送信時と同じエンジンを使う", async () => {
    vi.mocked(parseDocumentApi.parseDocument)
      .mockRejectedValueOnce(new Error("fail"))
      .mockResolvedValueOnce({ receipt: RECEIPT });

    const { result } = renderHook(() => useParseDocuments());
    const files = [new File(["a"], "retry.png", { type: "image/png" })];

    await act(async () => {
      result.current.submitAll(files, "claude");
    });

    await act(async () => {
      await vi.waitFor(() => {
        expect(result.current.jobs[0].status).toBe("error");
      });
    });

    await act(async () => {
      result.current.retry(result.current.jobs[0].id);
    });

    await act(async () => {
      await vi.waitFor(() => {
        expect(result.current.jobs[0].status).toBe("success");
      });
    });

    expect(parseDocumentApi.parseDocument).toHaveBeenNthCalledWith(
      1,
      { content: "base64data", mimeType: "image/png" },
      "claude",
    );
    expect(parseDocumentApi.parseDocument).toHaveBeenNthCalledWith(
      2,
      { content: "base64data", mimeType: "image/png" },
      "claude",
    );
  });

  it("部分的な失敗を許容する", async () => {
    vi.mocked(parseDocumentApi.parseDocument)
      .mockResolvedValueOnce({ receipt: RECEIPT })
      .mockRejectedValueOnce(new Error("API error"));

    const { result } = renderHook(() => useParseDocuments());
    const files = [
      new File(["a"], "ok.png", { type: "image/png" }),
      new File(["b"], "fail.png", { type: "image/png" }),
    ];

    await act(async () => {
      result.current.submitAll(files);
    });

    await act(async () => {
      await vi.waitFor(() => {
        expect(
          result.current.jobs.every((j) => j.status !== "pending" && j.status !== "processing"),
        ).toBe(true);
      });
    });

    expect(result.current.jobs[0].status).toBe("success");
    expect(result.current.jobs[1].status).toBe("error");
    expect(result.current.jobs[1].error).toBe("API error");
  });

  it("無効な MIME タイプのファイルは即座にエラーになる", async () => {
    vi.mocked(fileUtils.isValidMimeType).mockReturnValue(false);

    const { result } = renderHook(() => useParseDocuments());
    const files = [new File(["a"], "bad.gif", { type: "image/gif" })];

    await act(async () => {
      result.current.submitAll(files);
    });

    await act(async () => {
      await vi.waitFor(() => {
        expect(result.current.jobs[0].status).toBe("error");
      });
    });

    expect(result.current.jobs[0].error).toContain("サポートされていないファイル形式");
    expect(parseDocumentApi.parseDocument).not.toHaveBeenCalled();
  });

  it("エラーのジョブをリトライできる", async () => {
    vi.mocked(parseDocumentApi.parseDocument)
      .mockRejectedValueOnce(new Error("fail"))
      .mockResolvedValueOnce({ receipt: RECEIPT });

    const { result } = renderHook(() => useParseDocuments());
    const files = [new File(["a"], "retry.png", { type: "image/png" })];

    await act(async () => {
      result.current.submitAll(files);
    });

    await act(async () => {
      await vi.waitFor(() => {
        expect(result.current.jobs[0].status).toBe("error");
      });
    });

    const jobId = result.current.jobs[0].id;

    await act(async () => {
      result.current.retry(jobId);
    });

    await act(async () => {
      await vi.waitFor(() => {
        expect(result.current.jobs[0].status).toBe("success");
      });
    });

    expect(result.current.jobs[0].result).toEqual({ receipt: RECEIPT });
  });

  it("エラー以外のジョブはリトライしない", async () => {
    vi.mocked(parseDocumentApi.parseDocument).mockResolvedValue({ receipt: RECEIPT });

    const { result } = renderHook(() => useParseDocuments());
    const files = [new File(["a"], "ok.png", { type: "image/png" })];

    await act(async () => {
      result.current.submitAll(files);
    });

    await act(async () => {
      await vi.waitFor(() => {
        expect(result.current.jobs[0].status).toBe("success");
      });
    });

    const callCount = vi.mocked(parseDocumentApi.parseDocument).mock.calls.length;

    await act(async () => {
      result.current.retry(result.current.jobs[0].id);
    });

    expect(vi.mocked(parseDocumentApi.parseDocument).mock.calls.length).toBe(callCount);
  });
});
