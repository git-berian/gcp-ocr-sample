import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ResultTable } from "./ResultTable";
import type { ReceiptExtraction } from "../api/types";

const receipt: ReceiptExtraction = {
  supplierName: "テスト商店",
  receiptDate: "2026-05-16",
  totalAmount: 4800,
  taxAmount: 436,
  registrationNumber: "T1234567890123",
  transcription: "領収書 テスト商店",
  meta: { source: "gemini" },
};

describe("ResultTable", () => {
  it("項目ヘッダーを表示する", () => {
    render(<ResultTable receipt={receipt} />);

    expect(screen.getByText("項目")).toBeInTheDocument();
    expect(screen.getByText("値")).toBeInTheDocument();
  });

  it("領収書フィールドを表示する", () => {
    render(<ResultTable receipt={receipt} />);

    expect(screen.getByText("店名")).toBeInTheDocument();
    expect(screen.getByText("テスト商店")).toBeInTheDocument();
    expect(screen.getByText("支払日")).toBeInTheDocument();
    expect(screen.getByText("2026-05-16")).toBeInTheDocument();
    expect(screen.getByText("¥4,800")).toBeInTheDocument();
    expect(screen.getByText("¥436")).toBeInTheDocument();
    expect(screen.getByText("登録番号")).toBeInTheDocument();
    expect(screen.getByText("T1234567890123")).toBeInTheDocument();
  });

  it("登録番号が無い場合は「なし」を表示する", () => {
    render(<ResultTable receipt={{ ...receipt, registrationNumber: null }} />);

    expect(screen.getByText("なし")).toBeInTheDocument();
  });

  it("null フィールドは — を表示する", () => {
    render(
      <ResultTable
        receipt={{
          supplierName: null,
          receiptDate: null,
          totalAmount: null,
          taxAmount: null,
          registrationNumber: null,
          transcription: "",
        }}
      />,
    );

    // 店名・支払日・金額・税額 の 4 つが — （登録番号は「なし」）
    expect(screen.getAllByText("—")).toHaveLength(4);
  });

  it("receipt が null のとき空状態を表示する", () => {
    render(<ResultTable receipt={null} />);

    expect(screen.getByText("結果がありません")).toBeInTheDocument();
  });

  it("書き起こしを表示する", () => {
    render(<ResultTable receipt={receipt} />);

    expect(screen.getByText("書き起こし")).toBeInTheDocument();
    expect(screen.getByText("領収書 テスト商店")).toBeInTheDocument();
  });
});
