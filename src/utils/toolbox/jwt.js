/** JWT 仅解码，不进行签名、签发者或有效期校验。 */

const decoder = new TextDecoder('utf-8', { fatal: true })

export function base64UrlToBytes(input) {
  let value = String(input ?? '').replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/')
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(value)) throw new Error('Base64URL 包含非法字符')
  if (value.length % 4 === 1) throw new Error('Base64URL 长度不合法')
  value = value.padEnd(Math.ceil(value.length / 4) * 4, '=')
  try {
    const binary = atob(value)
    const bytes = new Uint8Array(binary.length)
    for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index)
    return bytes
  } catch {
    throw new Error('Base64URL 解码失败')
  }
}

export function decodeBase64UrlJson(part, label) {
  let bytes
  try {
    bytes = base64UrlToBytes(part)
  } catch (error) {
    throw new Error(`${label} ${error.message}`)
  }
  let text
  try {
    text = decoder.decode(bytes)
  } catch {
    throw new Error(`${label} 不是合法的 UTF-8 JSON`)
  }
  try {
    return JSON.parse(text)
  } catch (error) {
    throw new Error(`${label} JSON 解析失败：${error.message}`)
  }
}

export function decodeJwt(token, now = Date.now()) {
  const text = String(token ?? '').trim()
  if (!text) throw new Error('请输入 JWT')
  const parts = text.split('.')
  if (parts.length !== 3) throw new Error('JWT 必须由 Header、Payload、Signature 三段组成')
  if (!parts[0] || !parts[1]) throw new Error('JWT 的 Header 或 Payload 为空')
  const header = decodeBase64UrlJson(parts[0], 'Header')
  const payload = decodeBase64UrlJson(parts[1], 'Payload')
  if (!header || typeof header !== 'object' || Array.isArray(header)) throw new Error('JWT Header 必须是对象')
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('JWT Payload 必须是对象')
  if (header.alg === undefined) throw new Error('JWT Header 缺少 alg 字段')
  const times = {}
  for (const name of ['exp', 'iat', 'nbf']) {
    if (payload[name] === undefined) continue
    const seconds = Number(payload[name])
    if (!Number.isFinite(seconds)) throw new Error(`JWT ${name} 不是有效时间戳`)
    times[name] = {
      raw: payload[name],
      iso: new Date(seconds * 1000).toISOString(),
      local: new Date(seconds * 1000).toLocaleString('zh-CN', { hour12: false })
    }
  }
  const nowSeconds = now / 1000
  const status = {
    expired: payload.exp !== undefined ? nowSeconds >= Number(payload.exp) : null,
    notBefore: payload.nbf !== undefined ? nowSeconds < Number(payload.nbf) : null,
    issuedInFuture: payload.iat !== undefined ? nowSeconds + 60 < Number(payload.iat) : null
  }
  return {
    header,
    payload,
    signature: parts[2] || '',
    times,
    status,
    note: '仅解码，未验证签名；请勿据此判断令牌可信。'
  }
}
