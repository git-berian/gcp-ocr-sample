import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PasswordGate } from "./PasswordGate";

describe("PasswordGate", () => {
  it("パスワード入力画面を表示する", () => {
    render(
      <PasswordGate password="secret">
        <p>protected content</p>
      </PasswordGate>,
    );

    expect(screen.getByText("パスワードを入力")).toBeInTheDocument();
    expect(screen.queryByText("protected content")).not.toBeInTheDocument();
  });

  it("正しいパスワードで子要素を表示する", async () => {
    const user = userEvent.setup();
    render(
      <PasswordGate password="secret">
        <p>protected content</p>
      </PasswordGate>,
    );

    await user.type(screen.getByPlaceholderText("パスワード"), "secret");
    await user.click(screen.getByRole("button", { name: "ログイン" }));

    expect(screen.getByText("protected content")).toBeInTheDocument();
    expect(screen.queryByText("パスワードを入力")).not.toBeInTheDocument();
  });

  it("間違ったパスワードでエラーを表示する", async () => {
    const user = userEvent.setup();
    render(
      <PasswordGate password="secret">
        <p>protected content</p>
      </PasswordGate>,
    );

    await user.type(screen.getByPlaceholderText("パスワード"), "wrong");
    await user.click(screen.getByRole("button", { name: "ログイン" }));

    expect(screen.getByText("パスワードが正しくありません")).toBeInTheDocument();
    expect(screen.queryByText("protected content")).not.toBeInTheDocument();
  });

  it("エラー後に正しいパスワードで認証成功する", async () => {
    const user = userEvent.setup();
    render(
      <PasswordGate password="secret">
        <p>protected content</p>
      </PasswordGate>,
    );

    await user.type(screen.getByPlaceholderText("パスワード"), "wrong");
    await user.click(screen.getByRole("button", { name: "ログイン" }));
    expect(screen.getByText("パスワードが正しくありません")).toBeInTheDocument();

    await user.clear(screen.getByPlaceholderText("パスワード"));
    await user.type(screen.getByPlaceholderText("パスワード"), "secret");
    await user.click(screen.getByRole("button", { name: "ログイン" }));

    expect(screen.getByText("protected content")).toBeInTheDocument();
    expect(screen.queryByText("パスワードが正しくありません")).not.toBeInTheDocument();
  });
});
