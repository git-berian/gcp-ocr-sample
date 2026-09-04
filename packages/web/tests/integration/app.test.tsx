import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { mockFetch, okResponse, errorResponse } from "./helpers/mock-fetch";
import { MOCK_RECEIPT, MOCK_API_RESPONSE, createTestFile } from "./helpers/fixtures";
import { App } from "../../src/App";

describe("App（結合テスト）", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("正常系: ファイル選択 → 解析 → タブ内の ResultTable に結果が表示される", async () => {
    mockFetch.mockResolvedValue(okResponse(MOCK_API_RESPONSE));
    const user = userEvent.setup();

    render(<App />);

    const fileInput = screen.getByLabelText("ファイル");
    const file = createTestFile();
    await user.upload(fileInput, file);

    const submitButton = screen.getByRole("button", { name: "解析" });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("テスト商店")).toBeInTheDocument();
    });

    expect(screen.getByRole("tablist")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /receipt\.pdf/ })).toBeInTheDocument();
    expect(screen.getByText("¥4,800")).toBeInTheDocument();
    expect(screen.getByText("2026-05-16")).toBeInTheDocument();
    expect(screen.getByText("T1234567890123")).toBeInTheDocument();

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/parseDocumentHttp",
      expect.objectContaining({ method: "POST" }),
    );
    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({
      content: expect.any(String),
      mimeType: "application/pdf",
    });
  });

  it("複数ファイル: 各ファイルの結果がタブで切り替えられる", async () => {
    mockFetch
      .mockResolvedValueOnce(okResponse({ receipt: { ...MOCK_RECEIPT, supplierName: "店A" } }))
      .mockResolvedValueOnce(okResponse({ receipt: { ...MOCK_RECEIPT, supplierName: "店B" } }));
    const user = userEvent.setup();

    render(<App />);

    const fileInput = screen.getByLabelText("ファイル");
    const files = [createTestFile("receipt-1.pdf"), createTestFile("receipt-2.png", "image/png")];
    await user.upload(fileInput, files);

    const submitButton = screen.getByRole("button", { name: "解析" });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("店A")).toBeInTheDocument();
    });

    // 1つ目のタブが表示されている
    expect(screen.getByRole("tab", { name: /receipt-1\.pdf/ })).toBeInTheDocument();

    // 2つ目のタブに切り替え
    await waitFor(() => {
      expect(screen.getByRole("tab", { name: /receipt-2\.png/ })).toBeInTheDocument();
    });
    await user.click(screen.getByRole("tab", { name: /receipt-2\.png/ }));

    await waitFor(() => {
      expect(screen.getByText("店B")).toBeInTheDocument();
    });

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("バリデーションエラー: サポート外ファイルは FileUploader が拒否し、解析ボタンが無効のまま", async () => {
    const user = userEvent.setup();

    render(<App />);

    const fileInput = screen.getByLabelText("ファイル");
    const file = createTestFile("document.txt", "text/plain");
    await user.upload(fileInput, file);

    const submitButton = screen.getByRole("button", { name: "解析" });
    expect(submitButton).toBeDisabled();
    expect(screen.queryByText(/選択済み:/)).not.toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("API エラー: Functions が 500 を返すとタブ内に ErrorMessage とリトライボタンを表示する", async () => {
    mockFetch.mockResolvedValue(errorResponse(500, "内部サーバーエラー"));
    const user = userEvent.setup();

    render(<App />);

    const fileInput = screen.getByLabelText("ファイル");
    const file = createTestFile();
    await user.upload(fileInput, file);

    const submitButton = screen.getByRole("button", { name: "解析" });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    expect(screen.getByRole("alert")).toHaveTextContent("内部サーバーエラー");
    expect(screen.getByRole("button", { name: "リトライ" })).toBeInTheDocument();
    expect(mockFetch).toHaveBeenCalled();
  });

  it("通信エラー: fetch 自体が失敗してもタブ内に ErrorMessage を表示する", async () => {
    mockFetch.mockRejectedValue(new TypeError("Failed to fetch"));
    const user = userEvent.setup();

    render(<App />);

    await user.upload(screen.getByLabelText("ファイル"), createTestFile());
    await user.click(screen.getByRole("button", { name: "解析" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    expect(screen.getByRole("alert")).toHaveTextContent("Failed to fetch");
    expect(screen.getByRole("button", { name: "リトライ" })).toBeInTheDocument();
  });

  it("リトライ: エラー後にリトライボタンで再実行できる", async () => {
    mockFetch
      .mockResolvedValueOnce(errorResponse(500, "一時的なエラー"))
      .mockResolvedValueOnce(okResponse(MOCK_API_RESPONSE));
    const user = userEvent.setup();

    render(<App />);

    const fileInput = screen.getByLabelText("ファイル");
    const file = createTestFile();
    await user.upload(fileInput, file);

    await user.click(screen.getByRole("button", { name: "解析" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "リトライ" })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "リトライ" }));

    await waitFor(() => {
      expect(screen.getByText("テスト商店")).toBeInTheDocument();
    });

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("ローディング状態: 解析中にタブ内に表示され、完了後に消える", async () => {
    let resolveFetch!: (value: Response) => void;
    mockFetch.mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        }),
    );
    const user = userEvent.setup();

    render(<App />);

    const fileInput = screen.getByLabelText("ファイル");
    const file = createTestFile();
    await user.upload(fileInput, file);

    const submitButton = screen.getByRole("button", { name: "解析" });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("解析中...")).toBeInTheDocument();
    });

    resolveFetch(okResponse(MOCK_API_RESPONSE));

    await waitFor(() => {
      expect(screen.queryByText("解析中...")).not.toBeInTheDocument();
    });

    expect(screen.getByText("テスト商店")).toBeInTheDocument();
  });
});
