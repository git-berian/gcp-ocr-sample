import { useState } from "react";
import { ResultTable } from "./ResultTable";
import { ErrorMessage } from "./ErrorMessage";
import type { FileJob } from "../api/types";
import styles from "./ResultTabs.module.css";

interface ResultTabsProps {
  jobs: FileJob[];
  onRetry: (jobId: string) => void;
}

const STATUS_LABELS: Record<FileJob["status"], string> = {
  pending: "待機中",
  processing: "処理中",
  success: "解析成功",
  error: "エラー",
};

function StatusIndicator({ status }: { status: FileJob["status"] }) {
  if (status === "processing") {
    return <span className={styles.spinnerDot} aria-hidden="true" />;
  }
  return <span className={`${styles.statusDot} ${styles[status]}`} aria-hidden="true" />;
}

function TabPanel({ job, onRetry }: { job: FileJob; onRetry: (jobId: string) => void }) {
  switch (job.status) {
    case "pending":
      return <p className={styles.statusMessage}>待機中...</p>;
    case "processing":
      return (
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>解析中...</p>
        </div>
      );
    case "error":
      return (
        <div className={styles.errorPanel}>
          <ErrorMessage message={job.error} />
          <button type="button" className={styles.retryButton} onClick={() => onRetry(job.id)}>
            リトライ
          </button>
        </div>
      );
    case "success":
      return (
        <>
          <ResultTable entities={job.result?.entities ?? []} />
          {job.result && (
            <details className={styles.rawResponse}>
              <summary>生データ</summary>
              <pre>{JSON.stringify(job.result, null, 2)}</pre>
            </details>
          )}
        </>
      );
  }
}

export function ResultTabs({ jobs, onRetry }: ResultTabsProps) {
  const [activeId, setActiveId] = useState<string>(jobs[0]?.id ?? "");

  const activeJob = jobs.find((j) => j.id === activeId) ?? jobs[0];

  if (jobs.length === 0) return null;

  return (
    <div className={styles.container}>
      <div className={styles.tabBar} role="tablist" aria-label="ファイル別結果">
        {jobs.map((job) => (
          <button
            key={job.id}
            type="button"
            role="tab"
            aria-selected={job.id === activeJob.id}
            aria-label={`${job.fileName} (${STATUS_LABELS[job.status]})`}
            className={`${styles.tab} ${job.id === activeJob.id ? styles.activeTab : ""}`}
            onClick={() => setActiveId(job.id)}
          >
            <StatusIndicator status={job.status} />
            <span className={styles.tabLabel}>{job.fileName}</span>
          </button>
        ))}
      </div>
      {activeJob && (
        <div role="tabpanel" className={styles.tabPanel}>
          <TabPanel job={activeJob} onRetry={onRetry} />
        </div>
      )}
    </div>
  );
}
