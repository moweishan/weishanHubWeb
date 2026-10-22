/** PDF 签名检查 Worker 客户端：硬超时并终止，避免解析异常阻塞页面。 */

export function verifyPdfInWorker(arrayBuffer, timeoutMs = 20000) {
  if (!(arrayBuffer instanceof ArrayBuffer)) {
    return Promise.reject(new Error('PDF 数据不是 ArrayBuffer'))
  }
  let worker
  let cancelTask = null
  const promise = new Promise((resolve, reject) => {
    try {
      worker = new Worker(new URL('./pdfSignature.worker.js', import.meta.url), { type: 'module' })
    } catch (error) {
      reject(new Error(`无法启动 PDF 验签 Worker：${error.message}`))
      return
    }
    let settled = false
    const finish = (callback, value) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      worker.terminate()
      callback(value)
    }
    cancelTask = () => finish(reject, new Error('PDF 验签已取消'))
    const timer = setTimeout(() => {
      finish(reject, new Error(`PDF 验签超过 ${timeoutMs}ms，已终止 Worker；文件可能过大或结构异常`))
    }, timeoutMs)
    worker.onmessage = (event) => {
      const payload = event.data
      if (!payload || payload.ok !== true) {
        finish(reject, new Error(payload?.error || 'PDF 验签 Worker 返回无效结果'))
        return
      }
      finish(resolve, payload.result)
    }
    worker.onerror = (event) => {
      finish(reject, new Error(event?.message || 'PDF 验签 Worker 执行错误'))
    }
    worker.postMessage(arrayBuffer, [arrayBuffer])
  })
  promise.cancel = () => cancelTask?.()
  return promise
}
