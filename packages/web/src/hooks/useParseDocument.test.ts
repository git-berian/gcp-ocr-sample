import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useParseDocument } from "./useParseDocument";
import * as parseDocumentApi from "../api/parse-document";
import * as fileUtils from "../utils/file";

vi.mock("../api/parse-document");
vi.mock("../utils/file", async (importOriginal) => {
  const actual = await importOriginal<typeof fileUtils>();
  return {
    ...actual,
    fileToBase64: vi.fn(),
    isValidMimeType: vi.fn(),
  };
});

describe("useParseDocument", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fileUtils.isValidMimeType).mockReturnValue(true);
  });

  it("returns initial state", () => {
    const { result } = renderHook(() => useParseDocument());

    expect(result.current.result).toBeNull();
    expect(result.current.error).toBe("");
    expect(result.current.isLoading).toBe(false);
  });

  it("submits file and returns result", async () => {
    const mockResponse = {
      entities: [{ type: "total", mentionText: "1000", confidence: 0.95 }],
    };
    vi.mocked(fileUtils.fileToBase64).mockResolvedValue("base64data");
    vi.mocked(parseDocumentApi.parseDocument).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useParseDocument());
    const file = new File(["content"], "test.png", { type: "image/png" });

    await act(async () => {
      await result.current.submit(file);
    });

    expect(fileUtils.fileToBase64).toHaveBeenCalledWith(file);
    expect(parseDocumentApi.parseDocument).toHaveBeenCalledWith({
      content: "base64data",
      mimeType: "image/png",
    });
    expect(result.current.result).toEqual(mockResponse);
    expect(result.current.error).toBe("");
    expect(result.current.isLoading).toBe(false);
  });

  it("sets error on API failure", async () => {
    vi.mocked(fileUtils.fileToBase64).mockResolvedValue("base64data");
    vi.mocked(parseDocumentApi.parseDocument).mockRejectedValue(new Error("Server error"));

    const { result } = renderHook(() => useParseDocument());
    const file = new File(["content"], "test.png", { type: "image/png" });

    await act(async () => {
      await result.current.submit(file);
    });

    expect(result.current.result).toBeNull();
    expect(result.current.error).toBe("Server error");
    expect(result.current.isLoading).toBe(false);
  });

  it("sets error for unsupported MIME type", async () => {
    vi.mocked(fileUtils.isValidMimeType).mockReturnValue(false);

    const { result } = renderHook(() => useParseDocument());
    const file = new File(["content"], "test.gif", { type: "image/gif" });

    await act(async () => {
      await result.current.submit(file);
    });

    expect(result.current.error).toBe(
      "Unsupported file type: image/gif. Supported: application/pdf, image/png, image/jpeg",
    );
    expect(parseDocumentApi.parseDocument).not.toHaveBeenCalled();
  });

  it("handles non-Error thrown values", async () => {
    vi.mocked(fileUtils.fileToBase64).mockResolvedValue("base64data");
    vi.mocked(parseDocumentApi.parseDocument).mockRejectedValue("string error");

    const { result } = renderHook(() => useParseDocument());
    const file = new File(["content"], "test.png", { type: "image/png" });

    await act(async () => {
      await result.current.submit(file);
    });

    expect(result.current.error).toBe("An unexpected error occurred");
    expect(result.current.isLoading).toBe(false);
  });

  it("sets isLoading during submission", async () => {
    const loadingStates: boolean[] = [];
    let resolveApi: (value: unknown) => void;
    const apiPromise = new Promise((resolve) => {
      resolveApi = resolve;
    });

    vi.mocked(fileUtils.fileToBase64).mockResolvedValue("base64data");
    vi.mocked(parseDocumentApi.parseDocument).mockReturnValue(apiPromise as never);

    const { result } = renderHook(() => useParseDocument());
    const file = new File(["content"], "test.png", { type: "image/png" });

    let submitPromise: Promise<void>;
    act(() => {
      submitPromise = result.current.submit(file);
    });

    // Should be loading after submit starts
    loadingStates.push(result.current.isLoading);

    await act(async () => {
      resolveApi!({ entities: [] });
      await submitPromise!;
    });

    // Should not be loading after submit completes
    loadingStates.push(result.current.isLoading);

    expect(loadingStates).toEqual([true, false]);
  });
});
