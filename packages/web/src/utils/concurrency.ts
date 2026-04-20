export async function runWithConcurrency<T>(
  tasks: (() => Promise<T>)[],
  limit: number,
  onSettled?: (index: number, result: PromiseSettledResult<T>) => void,
): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = new Array(tasks.length);
  let nextIndex = 0;

  async function runNext(): Promise<void> {
    while (nextIndex < tasks.length) {
      const currentIndex = nextIndex++;
      try {
        const value = await tasks[currentIndex]();
        results[currentIndex] = { status: "fulfilled", value };
      } catch (reason) {
        results[currentIndex] = { status: "rejected", reason };
      }
      onSettled?.(currentIndex, results[currentIndex]);
    }
  }

  const workerCount = Math.min(limit, tasks.length);
  const workers = Array.from({ length: workerCount }, () => runNext());
  await Promise.all(workers);

  return results;
}
