import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "./App";
import * as useParseDocumentHook from "./hooks/useParseDocument";

vi.mock("./hooks/useParseDocument");

describe("App", () => {
  const mockSubmit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useParseDocumentHook.useParseDocument).mockReturnValue({
      result: null,
      error: "",
      isLoading: false,
      submit: mockSubmit,
    });
  });

  it("renders the title and file uploader", () => {
    render(<App />);

    expect(screen.getByText("DocAI Expense Parser")).toBeInTheDocument();
    expect(screen.getByLabelText("File")).toBeInTheDocument();
  });

  it("shows loading state", () => {
    vi.mocked(useParseDocumentHook.useParseDocument).mockReturnValue({
      result: null,
      error: "",
      isLoading: true,
      submit: mockSubmit,
    });

    render(<App />);

    expect(screen.getByText("Parsing...")).toBeInTheDocument();
  });

  it("shows result table when result is available", () => {
    vi.mocked(useParseDocumentHook.useParseDocument).mockReturnValue({
      result: {
        entities: [{ type: "total", mentionText: "1000", confidence: 0.95 }],
      },
      error: "",
      isLoading: false,
      submit: mockSubmit,
    });

    render(<App />);

    expect(screen.getByText("total")).toBeInTheDocument();
    expect(screen.getByText("1000")).toBeInTheDocument();
  });

  it("shows error message when error exists", () => {
    vi.mocked(useParseDocumentHook.useParseDocument).mockReturnValue({
      result: null,
      error: "Something went wrong",
      isLoading: false,
      submit: mockSubmit,
    });

    render(<App />);

    expect(screen.getByRole("alert")).toHaveTextContent("Something went wrong");
  });

  it("calls submit when file is uploaded", async () => {
    const user = userEvent.setup();
    render(<App />);

    const file = new File(["content"], "test.png", { type: "image/png" });
    const input = screen.getByLabelText("File");
    await user.upload(input, file);
    await user.click(screen.getByRole("button", { name: "Parse" }));

    expect(mockSubmit).toHaveBeenCalledWith(file);
  });
});
