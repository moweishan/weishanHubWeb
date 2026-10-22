/** WebCrypto 能力探测与统一错误提示。非安全上下文不提供降级实现。 */

const SECURITY_MESSAGE = '该功能需要 HTTPS 或 localhost 安全环境（当前浏览器未提供 WebCrypto）'

export function getWebCrypto() {
  const value = globalThis.crypto
  if (!value) throw new Error(SECURITY_MESSAGE)
  return value
}

export function getSubtle() {
  const value = getWebCrypto()
  if (!value.subtle) throw new Error(SECURITY_MESSAGE)
  return value.subtle
}

export function getRandomValues(target) {
  const value = getWebCrypto()
  if (typeof value.getRandomValues !== 'function') throw new Error(SECURITY_MESSAGE)
  return value.getRandomValues(target)
}

export { SECURITY_MESSAGE }
