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

  it("正常系: ファイル選択 → 解析 → ResultTable に結果が表示される", async () => {
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

    expect(screen.getByText("total_amount")).toBeInTheDocument();
    expect(screen.getByText("95.0%")).toBeInTheDocument();
    expect(screen.getByText("date")).toBeInTheDocument();
    expect(screen.getByText("2024-01-15")).toBeInTheDocument();

    expect(mockCallable).toHaveBeenCalledWith({
      content: expect.any(String),
      mimeType: "application/pdf",
    });
  });

  it("バリデーションエラー: サポート外ファイルは FileUploader が拒否し、解析ボタンが無効のまま", async () => {
    const user = userEvent.setup();

    render(<App />);

    const fileInput = screen.getByLabelText("ファイル");
    const file = createTestFile("document.txt", "text/plain");
    await user.upload(fileInput, file);

    const submitButton = screen.getByRole("button", { name: "解析" });
    expect(submitButton).toBeDisabled();
    expect(screen.queryByText("選択済み:")).not.toBeInTheDocument();
    expect(mockCallable).not.toHaveBeenCalled();
  });

  it("API エラー: Firebase Functions 失敗で ErrorMessage を表示する", async () => {
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
    expect(mockCallable).toHaveBeenCalled();
  });

  it("ローディング状態: 解析中に表示され、完了後に消える", async () => {
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
