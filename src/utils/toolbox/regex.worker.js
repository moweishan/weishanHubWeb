import { executeRegex } from './regexCore.js'

self.onmessage = (event) => {
  try {
    self.postMessage({ ok: true, result: executeRegex(event.data) })
  } catch (error) {
    self.postMessage({ ok: false, error: error.message })
  }
}
