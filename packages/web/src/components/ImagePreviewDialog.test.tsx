import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ImagePreviewDialog } from "./ImagePreviewDialog";

const renderDialog = (onClose = vi.fn()) => {
  render(<ImagePreviewDialog src="blob:mock/1" fileName="a.png" onClose={onClose} />);
  return { onClose, dialog: screen.getByRole("dialog") };
};

describe("ImagePreviewDialog", () => {
  it("opens as a modal showing the image and file name", () => {
    const { dialog } = renderDialog();

    expect(dialog).toHaveAttribute("open");
    expect(screen.getByAltText("a.png")).toHaveAttribute("src", "blob:mock/1");
    expect(screen.getByText("a.png")).toBeInTheDocument();
  });

  it("calls onClose when the close button is clicked", async () => {
    const user = userEvent.setup();
    const { onClose } = renderDialog();

    await user.click(screen.getByRole("button", { name: "閉じる" }));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose when the backdrop is clicked", () => {
    const { onClose, dialog } = renderDialog();

    fireEvent.mouseDown(dialog);
    fireEvent.click(dialog);

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("does not call onClose when a drag starts on the image and ends on the backdrop", () => {
    const { onClose, dialog } = renderDialog();

    // click は mousedown と mouseup の共通祖先（= dialog）に発火するため、
    // click の target だけを見ていると画像のドラッグで誤って閉じてしまう
    fireEvent.mouseDown(screen.getByAltText("a.png"));
    fireEvent.click(dialog);

    expect(onClose).not.toHaveBeenCalled();
  });

  it("does not call onClose when the image itself is clicked", () => {
    const { onClose } = renderDialog();

    fireEvent.click(screen.getByAltText("a.png"));

    expect(onClose).not.toHaveBeenCalled();
  });

  it("calls onClose on Esc without letting the browser close the dialog itself", () => {
    const { onClose, dialog } = renderDialog();

    const cancel = new Event("cancel", { bubbles: false, cancelable: true });
    fireEvent(dialog, cancel);

    expect(onClose).toHaveBeenCalledOnce();
    expect(cancel.defaultPrevented).toBe(true);
  });
});
