import { inspectPdfSignatures } from './pdfSignatureCore.js'

self.onmessage = async (event) => {
  try {
    const buffer = event.data instanceof ArrayBuffer ? event.data : event.data?.buffer
    if (!(buffer instanceof ArrayBuffer)) throw new Error('PDF Worker 收到无效数据')
    const result = await inspectPdfSignatures(new Uint8Array(buffer))
    self.postMessage({ ok: true, result })
  } catch (error) {
    self.postMessage({ ok: false, error: error.message || String(error) })
  }
}
