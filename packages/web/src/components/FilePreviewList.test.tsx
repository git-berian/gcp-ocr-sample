import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FilePreviewList } from "./FilePreviewList";

const png = (name: string) => new File(["x"], name, { type: "image/png" });
const pdf = (name: string) => new File(["x"], name, { type: "application/pdf" });

describe("FilePreviewList", () => {
  it("renders one tile per file", () => {
    render(<FilePreviewList files={[png("a.png"), png("b.png"), pdf("doc.pdf")]} />);

    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getByAltText("a.png")).toBeInTheDocument();
    expect(screen.getByAltText("b.png")).toBeInTheDocument();
    expect(screen.getByText("doc.pdf")).toBeInTheDocument();
  });

  it("renders files with the same name separately", () => {
    render(<FilePreviewList files={[png("same.png"), png("same.png")]} />);

    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getAllByAltText("same.png")).toHaveLength(2);
  });

  it("zooms the clicked file, not the first one", async () => {
    const user = userEvent.setup();
    render(<FilePreviewList files={[png("a.png"), png("b.png")]} />);

    await user.click(screen.getByRole("button", { name: "b.png を拡大表示" }));

    expect(screen.getByRole("dialog", { name: "b.png の拡大表示" })).toBeInTheDocument();
  });

  it("renders no tiles for an empty file list", () => {
    render(<FilePreviewList files={[]} />);

    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
  });
});
