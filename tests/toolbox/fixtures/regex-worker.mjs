import { parentPort } from 'node:worker_threads'
import { executeRegex } from '../../../src/utils/toolbox/regexCore.js'

parentPort.on('message', (request) => {
  try {
    parentPort.postMessage({ ok: true, result: executeRegex(request) })
  } catch (error) {
    parentPort.postMessage({ ok: false, error: error.message })
  }
})
