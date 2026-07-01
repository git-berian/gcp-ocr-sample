import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppView } from "./App";
import type { FileJob, ReceiptExtraction } from "./api/types";

function makeReceipt(overrides: Partial<ReceiptExtraction> = {}): ReceiptExtraction {
  return {
    supplierName: "テスト商店",
    receiptDate: "2026-05-16",
    totalAmount: 4800,
    taxAmount: 436,
    registrationNumber: "T1234567890123",
    transcription: "書き起こし",
    meta: { source: "gemini" },
    ...overrides,
  };
}

function createJob(overrides: Partial<FileJob> = {}): FileJob {
  return {
    id: "job-1",
    file: new File([""], "test.png", { type: "image/png" }),
    fileName: "test.png",
    status: "success",
    result: { receipt: makeReceipt() },
    error: "",
    ...overrides,
  };
}

describe("AppView", () => {
  const mockSubmit = vi.fn();
  const mockRetry = vi.fn();

  beforeEach(() => {
    mockSubmit.mockClear();
    mockRetry.mockClear();
  });

  const defaultProps = {
    jobs: [] as FileJob[],
    isProcessing: false,
    onSubmit: mockSubmit,
    onRetry: mockRetry,
  };

  it("renders the title and file uploader", () => {
    render(<AppView {...defaultProps} />);

    expect(screen.getByText("DocAI 経費パーサー")).toBeInTheDocument();
    expect(screen.getByLabelText("ファイル")).toBeInTheDocument();
  });

  it("shows ResultTabs when jobs exist", () => {
    const jobs = [
      createJob({
        id: "1",
        fileName: "receipt.png",
        result: { receipt: makeReceipt({ supplierName: "領収書店" }) },
      }),
    ];
    render(<AppView {...defaultProps} jobs={jobs} />);

    expect(screen.getByRole("tablist")).toBeInTheDocument();
    expect(screen.getByText("領収書店")).toBeInTheDocument();
  });

  it("does not show ResultTabs when no jobs", () => {
    render(<AppView {...defaultProps} />);

    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
  });

  it("shows error message with retry button for failed jobs", () => {
    const jobs = [
      createJob({ id: "1", status: "error", result: null, error: "Something went wrong" }),
    ];
    render(<AppView {...defaultProps} jobs={jobs} />);

    expect(screen.getByRole("alert")).toHaveTextContent("Something went wrong");
    expect(screen.getByRole("button", { name: "リトライ" })).toBeInTheDocument();
  });

  it("calls onSubmit when files are uploaded", async () => {
    const user = userEvent.setup();
    render(<AppView {...defaultProps} />);

    const file = new File(["content"], "test.png", { type: "image/png" });
    const input = screen.getByLabelText("ファイル");
    await user.upload(input, file);
    await user.click(screen.getByRole("button", { name: "解析" }));

    expect(mockSubmit).toHaveBeenCalledWith([file]);
  });
});
