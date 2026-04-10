import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FileUploader } from "./FileUploader";

describe("FileUploader", () => {
  it("renders file input and submit button", () => {
    render(<FileUploader onSubmit={vi.fn()} disabled={false} />);

    expect(screen.getByLabelText("ファイル")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "解析" })).toBeInTheDocument();
  });

  it("calls onSubmit with selected file when form is submitted", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<FileUploader onSubmit={onSubmit} disabled={false} />);

    const file = new File(["content"], "test.png", { type: "image/png" });
    const input = screen.getByLabelText("ファイル");
    await user.upload(input, file);
    await user.click(screen.getByRole("button", { name: "解析" }));

    expect(onSubmit).toHaveBeenCalledWith(file);
  });

  it("does not call onSubmit when no file is selected", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<FileUploader onSubmit={onSubmit} disabled={false} />);

    await user.click(screen.getByRole("button", { name: "解析" }));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("disables the submit button and file input when disabled prop is true", () => {
    render(<FileUploader onSubmit={vi.fn()} disabled={true} />);

    expect(screen.getByRole("button", { name: "解析" })).toBeDisabled();
    expect(screen.getByLabelText("ファイル")).toBeDisabled();
  });

  it("accepts only supported file types", () => {
    render(<FileUploader onSubmit={vi.fn()} disabled={false} />);

    const input = screen.getByLabelText("ファイル");
    expect(input).toHaveAttribute("accept", "application/pdf,image/png,image/jpeg");
  });

  it("sets file on drop", () => {
    render(<FileUploader onSubmit={vi.fn()} disabled={false} />);

    const dropZone = screen.getByTestId("drop-zone");
    const file = new File(["content"], "test.pdf", { type: "application/pdf" });

    fireEvent.drop(dropZone, { dataTransfer: { files: [file] } });

    expect(screen.getByText("選択済み: test.pdf")).toBeInTheDocument();
  });

  it("ignores drop when disabled", () => {
    render(<FileUploader onSubmit={vi.fn()} disabled={true} />);

    const dropZone = screen.getByTestId("drop-zone");
    const file = new File(["content"], "test.pdf", { type: "application/pdf" });

    fireEvent.drop(dropZone, { dataTransfer: { files: [file] } });

    expect(screen.queryByText("選択済み: test.pdf")).not.toBeInTheDocument();
  });

  it("ignores drop when unsupported MIME type", () => {
    render(<FileUploader onSubmit={vi.fn()} disabled={false} />);

    const dropZone = screen.getByTestId("drop-zone");
    const file = new File(["content"], "test.txt", { type: "text/plain" });

    fireEvent.drop(dropZone, { dataTransfer: { files: [file] } });

    expect(screen.queryByText("選択済み: test.txt")).not.toBeInTheDocument();
  });

  it("resets file when unsupported MIME type is selected via input", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<FileUploader onSubmit={onSubmit} disabled={false} />);

    const input = screen.getByLabelText("ファイル");
    const validFile = new File(["content"], "test.png", { type: "image/png" });
    await user.upload(input, validFile);
    expect(screen.getByText("選択済み: test.png")).toBeInTheDocument();

    const invalidFile = new File(["content"], "test.gif", { type: "image/gif" });
    await user.upload(input, invalidFile);
    expect(screen.queryByText(/選択済み:/)).not.toBeInTheDocument();
  });

  it("ignores drop when no files", () => {
    render(<FileUploader onSubmit={vi.fn()} disabled={false} />);

    const dropZone = screen.getByTestId("drop-zone");

    fireEvent.drop(dropZone, { dataTransfer: { files: [] } });

    expect(screen.queryByText(/選択済み:/)).not.toBeInTheDocument();
  });

  it("handles dragOver and dragLeave", () => {
    render(<FileUploader onSubmit={vi.fn()} disabled={false} />);

    const dropZone = screen.getByTestId("drop-zone");

    fireEvent.dragOver(dropZone);
    expect(dropZone.style.border).toBe("2px dashed var(--color-primary)");

    fireEvent.dragLeave(dropZone);
    expect(dropZone.style.border).toBe("2px dashed var(--color-border)");
  });

  it("ignores dragOver when disabled", () => {
    render(<FileUploader onSubmit={vi.fn()} disabled={true} />);

    const dropZone = screen.getByTestId("drop-zone");

    fireEvent.dragOver(dropZone);
    expect(dropZone.style.border).toBe("2px dashed var(--color-border)");
  });
});
