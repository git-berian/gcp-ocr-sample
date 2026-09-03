import { FilePreviewTile } from "./FilePreviewTile";
import styles from "./FilePreviewList.module.css";

interface FilePreviewListProps {
  files: File[];
}

/** 選択済みファイルをサムネイルのグリッドで一覧表示する */
export function FilePreviewList({ files }: FilePreviewListProps) {
  return (
    <ul className={styles.grid}>
      {files.map((file, i) => (
        // タイルは自分の blob URL と拡大状態を持つため、キーは位置ではなくファイルで識別する。
        // 同名・同サイズのファイルも複数選べるため、末尾に index を添えて一意性を担保する。
        <li key={`${file.name}-${file.size}-${file.lastModified}-${i}`} className={styles.item}>
          <FilePreviewTile file={file} />
        </li>
      ))}
    </ul>
  );
}
