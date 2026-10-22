import { createRegexRunner } from './regexRunner.js'

/** 在独立模块 Worker 中执行正则；超时后 terminate，主线程不会被阻塞。 */
export function runRegexInWorker(request, timeoutMs = 2000) {
  const runner = createRegexRunner(
    () => new Worker(new URL('./regex.worker.js', import.meta.url), { type: 'module' }),
    timeoutMs
  )
  return runner.run(request)
}
