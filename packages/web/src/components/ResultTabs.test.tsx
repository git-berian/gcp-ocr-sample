import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ResultTabs } from "./ResultTabs";
import type { FileJob } from "../api/types";

function createJob(overrides: Partial<FileJob> = {}): FileJob {
  return {
    id: "job-1",
    file: new File([""], "test.png", { type: "image/png" }),
    fileName: "test.png",
    status: "success",
    result: { entities: [] },
    error: "",
    ...overrides,
  };
}

describe("ResultTabs", () => {
  const mockRetry = vi.fn();

  it("ジョブごとにタブを表示する", () => {
    const jobs = [
      createJob({ id: "1", fileName: "a.png" }),
      createJob({ id: "2", fileName: "b.png" }),
    ];

    render(<ResultTabs jobs={jobs} onRetry={mockRetry} />);

    expect(screen.getByRole("tab", { name: /a\.png/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /b\.png/ })).toBeInTheDocument();
  });

  it("タブをクリックすると内容が切り替わる", async () => {
    const user = userEvent.setup();
    const jobs = [
      createJob({
        id: "1",
        fileName: "first.png",
        result: { entities: [{ type: "total", mentionText: "1000", confidence: 0.9 }] },
      }),
      createJob({
        id: "2",
        fileName: "second.png",
        result: { entities: [{ type: "date", mentionText: "2024-01-01", confidence: 0.8 }] },
      }),
    ];

    render(<ResultTabs jobs={jobs} onRetry={mockRetry} />);

    expect(screen.getByText("1000")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /second\.png/ }));

    expect(screen.getByText("2024-01-01")).toBeInTheDocument();
  });

  it("処理中のジョブはスピナーを表示する", () => {
    const jobs = [createJob({ id: "1", status: "processing", result: null })];

    render(<ResultTabs jobs={jobs} onRetry={mockRetry} />);

    expect(screen.getByText("解析中...")).toBeInTheDocument();
  });

  it("待機中のジョブはメッセージを表示する", () => {
    const jobs = [createJob({ id: "1", status: "pending", result: null })];

    render(<ResultTabs jobs={jobs} onRetry={mockRetry} />);

    expect(screen.getByText("待機中...")).toBeInTheDocument();
  });

  it("エラーのジョブはエラーメッセージとリトライボタンを表示する", () => {
    const jobs = [createJob({ id: "1", status: "error", result: null, error: "Server error" })];

    render(<ResultTabs jobs={jobs} onRetry={mockRetry} />);

    expect(screen.getByRole("alert")).toHaveTextContent("Server error");
    expect(screen.getByRole("button", { name: "リトライ" })).toBeInTheDocument();
  });

  it("リトライボタンをクリックすると onRetry が呼ばれる", async () => {
    const user = userEvent.setup();
    const jobs = [createJob({ id: "job-42", status: "error", result: null, error: "fail" })];

    render(<ResultTabs jobs={jobs} onRetry={mockRetry} />);

    await user.click(screen.getByRole("button", { name: "リトライ" }));

    expect(mockRetry).toHaveBeenCalledWith("job-42");
  });

  it("成功したジョブは ResultTable と生データを表示する", () => {
    const jobs = [
      createJob({
        id: "1",
        result: { entities: [{ type: "total", mentionText: "500", confidence: 0.95 }] },
      }),
    ];

    render(<ResultTabs jobs={jobs} onRetry={mockRetry} />);

    expect(screen.getByText("500")).toBeInTheDocument();
    expect(screen.getByText("生データ")).toBeInTheDocument();
  });

  it("ジョブが空の場合は何も描画しない", () => {
    const { container } = render(<ResultTabs jobs={[]} onRetry={mockRetry} />);

    expect(container.innerHTML).toBe("");
  });

  it("アクセシビリティ属性を持つ", () => {
    const jobs = [
      createJob({ id: "1", fileName: "a.png" }),
      createJob({ id: "2", fileName: "b.png" }),
    ];

    render(<ResultTabs jobs={jobs} onRetry={mockRetry} />);

    expect(screen.getByRole("tablist")).toBeInTheDocument();
    expect(screen.getByRole("tabpanel")).toBeInTheDocument();

    const tabs = screen.getAllByRole("tab");
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
    expect(tabs[1]).toHaveAttribute("aria-selected", "false");
  });
});
