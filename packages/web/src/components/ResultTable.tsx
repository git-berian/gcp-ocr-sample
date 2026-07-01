import type { ReceiptExtraction } from "../api/types";
import styles from "./ResultTable.module.css";

interface ResultTableProps {
  receipt: ReceiptExtraction | null;
}

const DASH = "—";

function formatAmount(value: number | null): string {
  return value != null ? `¥${value.toLocaleString()}` : DASH;
}

export function ResultTable({ receipt }: ResultTableProps) {
  if (!receipt) {
    return (
      <div className={styles.wrapper}>
        <p className={styles.emptyCell}>結果がありません</p>
      </div>
    );
  }

  const rows = [
    { label: "店名", value: receipt.supplierName ?? DASH },
    { label: "支払日", value: receipt.receiptDate ?? DASH },
    { label: "金額", value: formatAmount(receipt.totalAmount) },
    { label: "税額", value: formatAmount(receipt.taxAmount) },
    { label: "登録番号", value: receipt.registrationNumber ?? "なし" },
  ];

  return (
    <div className={styles.wrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>項目</th>
            <th>値</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <td>{row.label}</td>
              <td>{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {receipt.transcription && (
        <details className={styles.transcription}>
          <summary>書き起こし</summary>
          <pre>{receipt.transcription}</pre>
        </details>
      )}
    </div>
  );
}
