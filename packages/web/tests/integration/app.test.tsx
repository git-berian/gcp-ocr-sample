import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { mockCallable } from "./helpers/mock-firebase";
import { MOCK_ENTITIES, MOCK_API_RESPONSE, createTestFile } from "./helpers/fixtures";
import { App } from "../../src/App";

describe("App（結合テスト）", () => {
  beforeEach(() => {
    mockCallable.mockReset();
  });

  it("正常系: ファイル選択 → 解析 → タブ内の ResultTable に結果が表示される", async () => {
    mockCallable.mockResolvedValue(MOCK_API_RESPONSE);
    const user = userEvent.setup();

    render(<App />);

    const fileInput = screen.getByLabelText("ファイル");
    const file = createTestFile();
    await user.upload(fileInput, file);

    const submitButton = screen.getByRole("button", { name: "解析" });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("1,234")).toBeInTheDocument();
    });

    expect(screen.getByRole("tablist")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /receipt\.pdf/ })).toBeInTheDocument();
    expect(screen.getByText("total_amount")).toBeInTheDocument();
    expect(screen.getByText("95.0%")).toBeInTheDocument();
    expect(screen.getByText("date")).toBeInTheDocument();
    expect(screen.getByText("2024-01-15")).toBeInTheDocument();

    expect(mockCallable).toHaveBeenCalledWith({
      content: expect.any(String),
      mimeType: "application/pdf",
    });
  });

  it("複数ファイル: 各ファイルの結果がタブで切り替えられる", async () => {
    mockCallable
      .mockResolvedValueOnce({ data: { entities: [MOCK_ENTITIES[0]] } })
      .mockResolvedValueOnce({ data: { entities: [MOCK_ENTITIES[1]] } });
    const user = userEvent.setup();

    render(<App />);

    const fileInput = screen.getByLabelText("ファイル");
    const files = [
      createTestFile("receipt-1.pdf"),
      createTestFile("receipt-2.png", "image/png"),
    ];
    await user.upload(fileInput, files);

    const submitButton = screen.getByRole("button", { name: "解析" });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("1,234")).toBeInTheDocument();
    });

    // 1つ目のタブが表示されている
    expect(screen.getByRole("tab", { name: /receipt-1\.pdf/ })).toBeInTheDocument();
    expect(screen.getByText("total_amount")).toBeInTheDocument();

    // 2つ目のタブに切り替え
    await waitFor(() => {
      expect(screen.getByRole("tab", { name: /receipt-2\.png/ })).toBeInTheDocument();
    });
    await user.click(screen.getByRole("tab", { name: /receipt-2\.png/ }));

    await waitFor(() => {
      expect(screen.getByText("2024-01-15")).toBeInTheDocument();
    });

    expect(mockCallable).toHaveBeenCalledTimes(2);
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
    expect(mockCallable).not.toHaveBeenCalled();
  });

  it("API エラー: Firebase Functions 失敗でタブ内に ErrorMessage とリトライボタンを表示する", async () => {
    mockCallable.mockRejectedValue(new Error("Functions エラー"));
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

    expect(screen.getByRole("alert")).toHaveTextContent("Functions エラー");
    expect(screen.getByRole("button", { name: "リトライ" })).toBeInTheDocument();
    expect(mockCallable).toHaveBeenCalled();
  });

  it("リトライ: エラー後にリトライボタンで再実行できる", async () => {
    mockCallable
      .mockRejectedValueOnce(new Error("一時的なエラー"))
      .mockResolvedValueOnce(MOCK_API_RESPONSE);
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
      expect(screen.getByText("1,234")).toBeInTheDocument();
    });

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(mockCallable).toHaveBeenCalledTimes(2);
  });

  it("ローディング状態: 解析中にタブ内に表示され、完了後に消える", async () => {
    let resolveCallable!: (value: typeof MOCK_API_RESPONSE) => void;
    mockCallable.mockImplementation(
      () => new Promise((resolve) => { resolveCallable = resolve; }),
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

    resolveCallable(MOCK_API_RESPONSE);

    await waitFor(() => {
      expect(screen.queryByText("解析中...")).not.toBeInTheDocument();
    });

    expect(screen.getByText("1,234")).toBeInTheDocument();
  });
});
