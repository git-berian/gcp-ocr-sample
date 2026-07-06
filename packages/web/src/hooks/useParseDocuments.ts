import { useState, useCallback, useRef } from "react";
import { parseDocument } from "../api/parse-document";
import { DEFAULT_ENGINE, type Engine } from "../api/engines";
import { fileToBase64, isValidMimeType } from "../utils/file";
import { runWithConcurrency } from "../utils/concurrency";
import type { FileJob } from "../api/types";

const CONCURRENCY_LIMIT = 3;

export interface UseParseDocumentsReturn {
  jobs: FileJob[];
  isProcessing: boolean;
  submitAll: (files: File[], engine?: Engine) => void;
  retry: (jobId: string) => void;
}

function createJob(file: File, engine: Engine): FileJob {
  return {
    id: crypto.randomUUID(),
    file,
    fileName: file.name,
    engine,
    status: "pending",
    result: null,
    error: "",
  };
}

async function processJob(file: File, engine: Engine): Promise<FileJob["result"]> {
  const content = await fileToBase64(file);
  const response = await parseDocument({ content, mimeType: file.type }, engine);
  return response;
}

export function useParseDocuments(): UseParseDocumentsReturn {
  const [jobs, setJobs] = useState<FileJob[]>([]);
  const jobsRef = useRef(jobs);
  jobsRef.current = jobs;

  const updateJob = useCallback((jobId: string, updates: Partial<FileJob>) => {
    setJobs((prev) => prev.map((job) => (job.id === jobId ? { ...job, ...updates } : job)));
  }, []);

  const executeJob = useCallback(
    async (job: FileJob) => {
      updateJob(job.id, { status: "processing", error: "", result: null });

      if (!isValidMimeType(job.file.type)) {
        updateJob(job.id, {
          status: "error",
          error: `サポートされていないファイル形式: ${job.file.type}`,
        });
        return;
      }

      try {
        const result = await processJob(job.file, job.engine);
        updateJob(job.id, { status: "success", result });
      } catch (err) {
        updateJob(job.id, {
          status: "error",
          error: err instanceof Error ? err.message : "予期しないエラーが発生しました",
        });
      }
    },
    [updateJob],
  );

  const isProcessingRef = useRef(false);

  const submitAll = useCallback(
    (files: File[], engine: Engine = DEFAULT_ENGINE) => {
      if (isProcessingRef.current) return;
      isProcessingRef.current = true;

      const newJobs = files.map((file) => createJob(file, engine));
      setJobs(newJobs);

      const tasks = newJobs.map((job) => () => executeJob(job));
      runWithConcurrency(tasks, CONCURRENCY_LIMIT).then(() => {
        isProcessingRef.current = false;
      });
    },
    [executeJob],
  );

  const retry = useCallback(
    (jobId: string) => {
      const job = jobsRef.current.find((j) => j.id === jobId);
      if (!job || job.status !== "error") return;
      executeJob(job);
    },
    [executeJob],
  );

  const isProcessing = jobs.some((j) => j.status === "pending" || j.status === "processing");

  return { jobs, isProcessing, submitAll, retry };
}
