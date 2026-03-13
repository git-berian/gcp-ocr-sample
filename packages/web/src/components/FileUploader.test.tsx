import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FileUploader } from "./FileUploader";

describe("FileUploader", () => {
  it("renders file input and submit button", () => {
    render(<FileUploader onSubmit={vi.fn()} disabled={false} />);

    expect(screen.getByLabelText("File")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Parse" })).toBeInTheDocument();
  });

  it("calls onSubmit with selected file when form is submitted", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<FileUploader onSubmit={onSubmit} disabled={false} />);

    const file = new File(["content"], "test.png", { type: "image/png" });
    const input = screen.getByLabelText("File");
    await user.upload(input, file);
    await user.click(screen.getByRole("button", { name: "Parse" }));

    expect(onSubmit).toHaveBeenCalledWith(file);
  });

  it("does not call onSubmit when no file is selected", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<FileUploader onSubmit={onSubmit} disabled={false} />);

    await user.click(screen.getByRole("button", { name: "Parse" }));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("disables the submit button and file input when disabled prop is true", () => {
    render(<FileUploader onSubmit={vi.fn()} disabled={true} />);

    expect(screen.getByRole("button", { name: "Parse" })).toBeDisabled();
    expect(screen.getByLabelText("File")).toBeDisabled();
  });

  it("accepts only supported file types", () => {
    render(<FileUploader onSubmit={vi.fn()} disabled={false} />);

    const input = screen.getByLabelText("File");
    expect(input).toHaveAttribute("accept", "application/pdf,image/png,image/jpeg");
  });

  it("sets file on drop", () => {
    render(<FileUploader onSubmit={vi.fn()} disabled={false} />);

    const dropZone = screen.getByTestId("drop-zone");
    const file = new File(["content"], "test.pdf", { type: "application/pdf" });

    fireEvent.drop(dropZone, { dataTransfer: { files: [file] } });

    expect(screen.getByText("Selected: test.pdf")).toBeInTheDocument();
  });

  it("ignores drop when disabled", () => {
    render(<FileUploader onSubmit={vi.fn()} disabled={true} />);

    const dropZone = screen.getByTestId("drop-zone");
    const file = new File(["content"], "test.pdf", { type: "application/pdf" });

    fireEvent.drop(dropZone, { dataTransfer: { files: [file] } });

    expect(screen.queryByText("Selected: test.pdf")).not.toBeInTheDocument();
  });

  it("ignores drop when unsupported MIME type", () => {
    render(<FileUploader onSubmit={vi.fn()} disabled={false} />);

    const dropZone = screen.getByTestId("drop-zone");
    const file = new File(["content"], "test.txt", { type: "text/plain" });

    fireEvent.drop(dropZone, { dataTransfer: { files: [file] } });

    expect(screen.queryByText("Selected: test.txt")).not.toBeInTheDocument();
  });

  it("ignores drop when no files", () => {
    render(<FileUploader onSubmit={vi.fn()} disabled={false} />);

    const dropZone = screen.getByTestId("drop-zone");

    fireEvent.drop(dropZone, { dataTransfer: { files: [] } });

    expect(screen.queryByText(/Selected:/)).not.toBeInTheDocument();
  });

  it("handles dragOver and dragLeave", () => {
    render(<FileUploader onSubmit={vi.fn()} disabled={false} />);

    const dropZone = screen.getByTestId("drop-zone");

    fireEvent.dragOver(dropZone);
    expect(dropZone.style.border).toBe("2px dashed rgb(0, 102, 204)");

    fireEvent.dragLeave(dropZone);
    expect(dropZone.style.border).toBe("2px dashed rgb(204, 204, 204)");
  });

  it("ignores dragOver when disabled", () => {
    render(<FileUploader onSubmit={vi.fn()} disabled={true} />);

    const dropZone = screen.getByTestId("drop-zone");

    fireEvent.dragOver(dropZone);
    expect(dropZone.style.border).toBe("2px dashed rgb(204, 204, 204)");
  });
});
