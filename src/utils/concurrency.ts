/**
 * Utility functions for concurrency control
 */

/**
 * Run async tasks with concurrency limit
 * Processes items in parallel but limits the number of concurrent executions
 *
 * @param items - Array of items to process
 * @param limit - Maximum number of concurrent executions
 * @param worker - Async function to process each item
 *
 * @example
 * ```ts
 * await runWithConcurrency(files, 3, async (file) => {
 *   await processFile(file)
 * })
 * ```
 */
export async function runWithConcurrency<T>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<void>
): Promise<void> {
  const executing = new Set<Promise<void>>()
  let index = 0

  for (const item of items) {
    const currentIndex = index++
    const promise = worker(item, currentIndex)
    executing.add(promise)

    const cleanup = () => executing.delete(promise)
    promise.then(cleanup).catch(cleanup)

    if (executing.size >= limit) {
      await Promise.race(executing)
    }
  }

  await Promise.all(executing)
}

/**
 * Run async tasks with concurrency limit and collect results
 * Similar to runWithConcurrency but returns results in order
 *
 * @param items - Array of items to process
 * @param limit - Maximum number of concurrent executions
 * @param worker - Async function to process each item and return result
 * @returns Array of results in the same order as input items
 *
 * @example
 * ```ts
 * const results = await mapWithConcurrency(urls, 5, async (url) => {
 *   return await fetch(url)
 * })
 * ```
 */
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  const executing = new Set<Promise<void>>()
  let index = 0

  for (const item of items) {
    const currentIndex = index++

    const promise = (async () => {
      results[currentIndex] = await worker(item, currentIndex)
    })()

    executing.add(promise)

    const cleanup = () => executing.delete(promise)
    promise.then(cleanup).catch(cleanup)

    if (executing.size >= limit) {
      await Promise.race(executing)
    }
  }

  await Promise.all(executing)
  return results
}

/**
 * Chunk an array into smaller arrays of specified size
 *
 * @param items - Array to chunk
 * @param size - Size of each chunk
 * @returns Array of chunks
 */
export function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size))
  }
  return chunks
}
