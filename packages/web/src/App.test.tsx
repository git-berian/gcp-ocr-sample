import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppView } from "./App";

describe("AppView", () => {
  const mockSubmit = vi.fn();

  beforeEach(() => {
    mockSubmit.mockClear();
  });

  const defaultProps = {
    result: null,
    error: "",
    isLoading: false,
    onSubmit: mockSubmit,
  };

  it("renders the title and file uploader", () => {
    render(<AppView {...defaultProps} />);

    expect(screen.getByText("DocAI 経費パーサー")).toBeInTheDocument();
    expect(screen.getByLabelText("ファイル")).toBeInTheDocument();
  });

  it("shows loading state", () => {
    render(<AppView {...defaultProps} isLoading={true} />);

    expect(screen.getByText("解析中...")).toBeInTheDocument();
  });

  it("shows result table when result is available", () => {
    render(
      <AppView
        {...defaultProps}
        result={{
          entities: [{ type: "total", mentionText: "1000", confidence: 0.95 }],
        }}
      />,
    );

    expect(screen.getByText("total")).toBeInTheDocument();
    expect(screen.getByText("1000")).toBeInTheDocument();
  });

  it("shows error message when error exists", () => {
    render(<AppView {...defaultProps} error="Something went wrong" />);

    expect(screen.getByRole("alert")).toHaveTextContent("Something went wrong");
  });

  it("calls submit when file is uploaded", async () => {
    const user = userEvent.setup();
    render(<AppView {...defaultProps} />);

    const file = new File(["content"], "test.png", { type: "image/png" });
    const input = screen.getByLabelText("ファイル");
    await user.upload(input, file);
    await user.click(screen.getByRole("button", { name: "解析" }));

    expect(mockSubmit).toHaveBeenCalledWith(file);
  });
});
