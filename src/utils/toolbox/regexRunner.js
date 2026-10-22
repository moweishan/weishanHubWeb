/** 浏览器 Worker 与 Node 测试共用的正则执行器，提供硬超时与 terminate。 */

export class RegexTimeoutError extends Error {
  constructor(timeoutMs) {
    super(`正则执行超过 ${timeoutMs}ms，已终止。请检查是否存在灾难性回溯。`)
    this.name = 'RegexTimeoutError'
  }
}

/**
 * @param {() => Worker|import('node:worker_threads').Worker} createWorker
 * @param {number} timeoutMs
 */
export function createRegexRunner(createWorker, timeoutMs = 2000) {
  return {
    run(request) {
      return new Promise((resolve, reject) => {
        let worker
        try {
          worker = createWorker()
        } catch (error) {
          reject(new Error(`无法创建正则 Worker：${error.message}`))
          return
        }
        let settled = false
        const finish = (callback, value) => {
          if (settled) return
          settled = true
          clearTimeout(timer)
          detach()
          try {
            worker.terminate()
          } catch {
            // 终止失败不影响结果
          }
          callback(value)
        }
        const timer = setTimeout(() => finish(reject, new RegexTimeoutError(timeoutMs)), timeoutMs)
        const onMessage = (event) => {
          const payload = event && event.data !== undefined ? event.data : event
          if (!payload || payload.ok !== true) {
            finish(reject, new Error(payload?.error || '正则 Worker 返回了无效结果'))
            return
          }
          finish(resolve, payload.result)
        }
        const onError = (event) => {
          const message = event?.message || event?.error?.message || 'Worker 执行错误'
          finish(reject, new Error(message))
        }
        const detach = () => {
          if (typeof worker.off === 'function') {
            worker.off('message', onMessage)
            worker.off('error', onError)
          }
          if ('onmessage' in worker) {
            worker.onmessage = null
            worker.onerror = null
          }
        }
        if (typeof worker.on === 'function' && !worker.onmessage) {
          worker.on('message', onMessage)
          worker.on('error', onError)
        } else {
          worker.onmessage = onMessage
          worker.onerror = onError
        }
        worker.postMessage(request)
      })
    }
  }
}
