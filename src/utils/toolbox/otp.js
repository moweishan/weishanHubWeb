/** 标准 Base32、HOTP 与 TOTP（RFC 4226 / RFC 6238），不发起任何网络请求。 */

import { getRandomValues, getSubtle } from './webcrypto.js'

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

export function base32Decode(input) {
  const text = String(input ?? '')
    .toUpperCase()
    .replace(/[\s-]/g, '')
    .replace(/=+$/, '')
  if (!text) throw new Error('Base32 密钥为空')
  if (!/^[A-Z2-7]+$/.test(text)) throw new Error('Base32 密钥只能包含 A-Z 和 2-7')
  let bits = 0
  let value = 0
  const bytes = []
  for (const char of text) {
    const index = BASE32_ALPHABET.indexOf(char)
    if (index < 0) throw new Error('Base32 密钥包含非法字符')
    value = (value << 5) | index
    bits += 5
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff)
      bits -= 8
    }
  }
  if (bytes.length === 0) throw new Error('Base32 密钥长度不足')
  return new Uint8Array(bytes)
}

export function base32Encode(bytes) {
  let bits = 0
  let value = 0
  let output = ''
  for (const byte of bytes) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) output += BASE32_ALPHABET[(value << (5 - bits)) & 31]
  return output
}

export function generateBase32Secret(byteLength = 20) {
  const safeLength = Math.min(64, Math.max(10, Number(byteLength) || 20))
  const bytes = new Uint8Array(safeLength)
  getRandomValues(bytes)
  return base32Encode(bytes)
}

function normalizeAlgorithm(algorithm = 'SHA-1') {
  const value = String(algorithm).toUpperCase().replace(/\s+/g, '')
  if (value === 'SHA1') return 'SHA-1'
  if (value === 'SHA256') return 'SHA-256'
  if (value === 'SHA512') return 'SHA-512'
  if (['SHA-1', 'SHA-256', 'SHA-512'].includes(value)) return value
  throw new Error('OTP 算法仅支持 SHA-1、SHA-256、SHA-512')
}

function counterToBytes(counter) {
  const value = typeof counter === 'bigint' ? counter : BigInt(counter)
  if (value < 0n || value > 0xffffffffffffffffn) throw new Error('HOTP 计数器超出 64 位范围')
  const bytes = new Uint8Array(8)
  let temp = value
  for (let index = 7; index >= 0; index--) {
    bytes[index] = Number(temp & 0xffn)
    temp >>= 8n
  }
  return bytes
}

export async function hotp(secret, counter, { digits = 6, algorithm = 'SHA-1' } = {}) {
  const secretBytes = typeof secret === 'string' ? base32Decode(secret) : secret
  const digitCount = Number(digits)
  if (!Number.isInteger(digitCount) || digitCount < 6 || digitCount > 10) {
    throw new Error('OTP 位数必须是 6 至 10 的整数')
  }
  const subtle = getSubtle()
  const key = await subtle.importKey(
    'raw',
    secretBytes,
    { name: 'HMAC', hash: normalizeAlgorithm(algorithm) },
    false,
    ['sign']
  )
  const signature = new Uint8Array(await subtle.sign('HMAC', key, counterToBytes(counter)))
  const offset = signature[signature.length - 1] & 0x0f
  const binary =
    ((signature[offset] & 0x7f) << 24) |
    (signature[offset + 1] << 16) |
    (signature[offset + 2] << 8) |
    signature[offset + 3]
  return String(binary % 10 ** digitCount).padStart(digitCount, '0')
}

export async function generateTotp(secret, options = {}) {
  const period = Number(options.period) || 30
  if (period < 5 || period > 300) throw new Error('时间步长必须在 5 至 300 秒之间')
  const now = options.now === undefined ? Date.now() : Number(options.now)
  if (!Number.isFinite(now)) throw new Error('当前时间无效')
  const counter = BigInt(Math.floor(now / 1000 / period))
  const code = await hotp(secret, counter, options)
  const elapsed = Math.floor(now / 1000) % period
  return {
    code,
    counter,
    period,
    expiresAt: (Math.floor(now / 1000 / period) + 1) * period * 1000,
    remaining: period - elapsed
  }
}

export async function verifyTotp(secret, token, options = {}) {
  const period = Number(options.period) || 30
  const window = Number(options.window ?? 1)
  if (!Number.isInteger(window) || window < 0 || window > 10) throw new Error('校验窗口必须是 0 至 10 的整数')
  const now = options.now === undefined ? Date.now() : Number(options.now)
  const current = BigInt(Math.floor(now / 1000 / period))
  const expected = String(token ?? '').replace(/\s+/g, '')
  if (!/^\d{6,10}$/.test(expected)) throw new Error('口令必须是 6 至 10 位数字')
  for (let offset = -window; offset <= window; offset++) {
    const counter = current + BigInt(offset)
    if (counter < 0n) continue
    const code = await hotp(secret, counter, options)
    if (timingSafeEqual(code, expected)) {
      return { valid: true, offset, counter, remaining: period - (Math.floor(now / 1000) % period) }
    }
  }
  return { valid: false, offset: null, counter: current, remaining: period - (Math.floor(now / 1000) % period) }
}

export async function generateHotp(secret, { counter = 0, digits = 6, algorithm = 'SHA-1' } = {}) {
  const value = /^\d+$/.test(String(counter)) ? BigInt(counter) : null
  if (value === null) throw new Error('HOTP 计数器必须是非负整数')
  return {
    code: await hotp(secret, value, { digits, algorithm }),
    counter: value
  }
}

export async function verifyHotp(secret, token, counter, options = {}) {
  const value = /^\d+$/.test(String(counter)) ? BigInt(counter) : null
  if (value === null) throw new Error('HOTP 计数器必须是非负整数')
  const expected = String(token ?? '').replace(/\s+/g, '')
  if (!/^\d{6,10}$/.test(expected)) throw new Error('口令必须是 6 至 10 位数字')
  const code = await hotp(secret, value, options)
  return { valid: timingSafeEqual(code, expected), counter: value }
}

export function buildOtpAuthUri({
  type = 'totp',
  secret,
  issuer = 'weishanHub',
  account = 'user@example.com',
  digits = 6,
  period = 30,
  algorithm = 'SHA-1'
}) {
  const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(account)}`
  const params = new URLSearchParams({
    secret: String(secret || '').replace(/=+$/, ''),
    issuer,
    algorithm: normalizeAlgorithm(algorithm).replace('-', ''),
    digits: String(digits),
    period: String(period)
  })
  return `otpauth://${type}/${label}?${params.toString()}`
}

function timingSafeEqual(left, right) {
  const a = String(left)
  const b = String(right)
  let diff = a.length ^ b.length
  const length = Math.max(a.length, b.length)
  for (let index = 0; index < length; index++) {
    diff |= (a.charCodeAt(index) || 0) ^ (b.charCodeAt(index) || 0)
  }
  return diff === 0
}
