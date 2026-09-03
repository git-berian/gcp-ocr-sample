import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FilePreviewTile } from "./FilePreviewTile";

const png = (name: string) => new File(["x"], name, { type: "image/png" });
const pdf = (name: string) => new File(["x"], name, { type: "application/pdf" });

describe("FilePreviewTile", () => {
  it("renders a thumbnail image and the file name for an image file", () => {
    render(<FilePreviewTile file={png("a.png")} />);

    expect(screen.getByAltText("a.png")).toHaveAttribute("src", expect.stringMatching(/^blob:/));
    expect(screen.getByText("a.png")).toBeInTheDocument();
  });

  it("renders a PDF tile with no image and no zoom button", () => {
    render(<FilePreviewTile file={pdf("doc.pdf")} />);

    expect(screen.getByText("PDF")).toBeInTheDocument();
    expect(screen.getByText("doc.pdf")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("opens the zoom dialog when the thumbnail is clicked", async () => {
    const user = userEvent.setup();
    render(<FilePreviewTile file={png("a.png")} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "a.png を拡大表示" }));

    expect(screen.getByRole("dialog", { name: "a.png の拡大表示" })).toBeInTheDocument();
    // サムネイルと拡大画像で 2 枚になる
    expect(screen.getAllByAltText("a.png")).toHaveLength(2);
  });

  it("closes the zoom dialog again", async () => {
    const user = userEvent.setup();
    render(<FilePreviewTile file={png("a.png")} />);

    await user.click(screen.getByRole("button", { name: "a.png を拡大表示" }));
    await user.click(screen.getByRole("button", { name: "閉じる" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
