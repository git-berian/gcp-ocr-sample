import type { Entity } from "../api/types";
import styles from "./ResultTable.module.css";

interface ResultTableProps {
  entities: Entity[];
}

export function ResultTable({ entities }: ResultTableProps) {
  return (
    <div className={styles.wrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>種別</th>
            <th>テキスト</th>
            <th>信頼度</th>
            <th>正規化値</th>
          </tr>
        </thead>
        <tbody>
          {entities.length === 0 ? (
            <tr>
              <td colSpan={4} className={styles.emptyCell}>
                エンティティが見つかりません
              </td>
            </tr>
          ) : (
            entities.map((entity, index) => (
              <tr key={index}>
                <td>{entity.type}</td>
                <td>{entity.mentionText}</td>
                <td>{(entity.confidence * 100).toFixed(1)}%</td>
                <td>{entity.normalizedValue?.text ?? ""}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
