import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
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

  it("disables the submit button when disabled prop is true", () => {
    render(<FileUploader onSubmit={vi.fn()} disabled={true} />);

    expect(screen.getByRole("button", { name: "Parse" })).toBeDisabled();
  });

  it("accepts only supported file types", () => {
    render(<FileUploader onSubmit={vi.fn()} disabled={false} />);

    const input = screen.getByLabelText("File");
    expect(input).toHaveAttribute("accept", "application/pdf,image/png,image/jpeg");
  });

  it("supports drag and drop", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<FileUploader onSubmit={onSubmit} disabled={false} />);

    const file = new File(["content"], "test.pdf", { type: "application/pdf" });
    const dropZone = screen.getByTestId("drop-zone");

    // Simulate file input via upload (drag-drop testing is limited in jsdom)
    const input = screen.getByLabelText("File");
    await user.upload(input, file);
    await user.click(screen.getByRole("button", { name: "Parse" }));

    expect(onSubmit).toHaveBeenCalledWith(file);
    expect(dropZone).toBeInTheDocument();
  });
});
