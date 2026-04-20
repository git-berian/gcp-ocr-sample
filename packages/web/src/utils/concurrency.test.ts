import { describe, it, expect, vi } from "vitest";
import { runWithConcurrency } from "./concurrency";

describe("runWithConcurrency", () => {
  it("空のタスク配列に対して空の結果を返す", async () => {
    const results = await runWithConcurrency([], 3);
    expect(results).toEqual([]);
  });

  it("全タスクを実行して結果を返す", async () => {
    const tasks = [
      () => Promise.resolve("a"),
      () => Promise.resolve("b"),
      () => Promise.resolve("c"),
    ];

    const results = await runWithConcurrency(tasks, 3);

    expect(results).toEqual([
      { status: "fulfilled", value: "a" },
      { status: "fulfilled", value: "b" },
      { status: "fulfilled", value: "c" },
    ]);
  });

  it("失敗したタスクを rejected として記録する", async () => {
    const error = new Error("fail");
    const tasks = [() => Promise.resolve("ok"), () => Promise.reject(error)];

    const results = await runWithConcurrency(tasks, 3);

    expect(results[0]).toEqual({ status: "fulfilled", value: "ok" });
    expect(results[1]).toEqual({ status: "rejected", reason: error });
  });

  it("同時実行数が limit を超えない", async () => {
    let concurrent = 0;
    let maxConcurrent = 0;

    const createTask = () => async () => {
      concurrent++;
      maxConcurrent = Math.max(maxConcurrent, concurrent);
      await new Promise((r) => setTimeout(r, 10));
      concurrent--;
      return "done";
    };

    const tasks = Array.from({ length: 6 }, createTask);
    await runWithConcurrency(tasks, 2);

    expect(maxConcurrent).toBe(2);
  });

  it("limit がタスク数より大きくても動作する", async () => {
    const tasks = [() => Promise.resolve(1), () => Promise.resolve(2)];

    const results = await runWithConcurrency(tasks, 10);

    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({ status: "fulfilled", value: 1 });
  });

  it("onSettled が各タスク完了時に呼ばれる", async () => {
    const onSettled = vi.fn();
    const tasks = [() => Promise.resolve("a"), () => Promise.reject(new Error("b"))];

    await runWithConcurrency(tasks, 2, onSettled);

    expect(onSettled).toHaveBeenCalledTimes(2);
    expect(onSettled).toHaveBeenCalledWith(0, { status: "fulfilled", value: "a" });
    expect(onSettled).toHaveBeenCalledWith(1, { status: "rejected", reason: expect.any(Error) });
  });

  it("結果の順序がタスクの入力順序と一致する", async () => {
    const tasks = [
      () => new Promise<string>((r) => setTimeout(() => r("slow"), 30)),
      () => new Promise<string>((r) => setTimeout(() => r("fast"), 10)),
    ];

    const results = await runWithConcurrency(tasks, 2);

    expect(results[0]).toEqual({ status: "fulfilled", value: "slow" });
    expect(results[1]).toEqual({ status: "fulfilled", value: "fast" });
  });
});
