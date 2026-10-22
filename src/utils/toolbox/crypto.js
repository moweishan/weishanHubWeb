/** 安全随机、哈希、UUID/ULID、AES-GCM 文本加密与 RSA 密钥生成。 */

import { monotonicFactory } from 'ulid'
import { getRandomValues, getSubtle } from './webcrypto.js'

const encoder = new TextEncoder()
const decoder = new TextDecoder('utf-8', { fatal: true })
const AES_FORMAT = 'weishanhub-aes-gcm'
const AES_VERSION = 1
const AES_AAD = encoder.encode('weishanhub-aes-gcm:v1')

function toBase64(bytes) {
  let binary = ''
  const chunk = 0x8000
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk))
  }
  return btoa(binary)
}

function fromBase64(text) {
  const binary = atob(String(text))
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index)
  return bytes
}

export function randomBytes(length) {
  const size = Number(length)
  if (!Number.isInteger(size) || size < 1 || size > 1024 * 1024) throw new Error('随机字节长度不合法')
  const bytes = new Uint8Array(size)
  for (let offset = 0; offset < size; offset += 65536) {
    getRandomValues(bytes.subarray(offset, Math.min(size, offset + 65536)))
  }
  return bytes
}

/** 无偏随机整数，范围包含 min 与 max。 */
export function randomInt(min, max) {
  const lower = Math.ceil(Number(min))
  const upper = Math.floor(Number(max))
  if (!Number.isSafeInteger(lower) || !Number.isSafeInteger(upper) || upper < lower) {
    throw new Error('随机整数范围不合法')
  }
  const range = upper - lower + 1
  if (range > 0xffffffff) throw new Error('随机整数范围过大')
  const limit = Math.floor(0x100000000 / range) * range
  const buffer = new Uint32Array(1)
  do {
    getRandomValues(buffer)
  } while (buffer[0] >= limit)
  return lower + (buffer[0] % range)
}

const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const LOWER = 'abcdefghijklmnopqrstuvwxyz'
const DIGITS = '0123456789'
const SYMBOLS = '!@#$%^&*()-_=+[]{};:,.?/'
const AMBIGUOUS = new Set('Il1O0o')

export function randomString({
  length = 24,
  uppercase = true,
  lowercase = true,
  digits = true,
  symbols = false,
  excludeAmbiguous = false
} = {}) {
  const size = Number(length)
  if (!Number.isInteger(size) || size < 1 || size > 4096) throw new Error('随机字符串长度必须在 1 至 4096 之间')
  let charset = ''
  if (uppercase) charset += UPPER
  if (lowercase) charset += LOWER
  if (digits) charset += DIGITS
  if (symbols) charset += SYMBOLS
  if (excludeAmbiguous) charset = Array.from(charset).filter((char) => !AMBIGUOUS.has(char)).join('')
  if (!charset) throw new Error('至少选择一种字符集')
  let output = ''
  for (let index = 0; index < size; index++) {
    output += charset[randomInt(0, charset.length - 1)]
  }
  return output
}

export async function hashText(text, { algorithm = 'SHA-256', uppercase = false } = {}) {
  const allowed = ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512']
  const raw = String(algorithm).toUpperCase().replace(/\s+/g, '')
  const normalized =
    raw === 'SHA1' ? 'SHA-1' : raw === 'SHA256' ? 'SHA-256' : raw === 'SHA384' ? 'SHA-384' : raw === 'SHA512' ? 'SHA-512' : raw
  if (!allowed.includes(normalized)) throw new Error('仅支持 SHA-1、SHA-256、SHA-384、SHA-512')
  const subtle = getSubtle()
  const digest = new Uint8Array(await subtle.digest(normalized, encoder.encode(String(text))))
  const hex = Array.from(digest)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
  return uppercase ? hex.toUpperCase() : hex
}

export function createUuidV4() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  const bytes = randomBytes(16)
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

export function formatUuid(uuid, { uppercase = false, braces = false, hyphens = true } = {}) {
  let value = String(uuid)
  if (!hyphens) value = value.replace(/-/g, '')
  if (uppercase) value = value.toUpperCase()
  return braces ? `{${value}}` : value
}

export function generateUuids(count = 1, options = {}) {
  const size = Number(count)
  if (!Number.isInteger(size) || size < 1 || size > 1000) throw new Error('UUID 数量必须在 1 至 1000 之间')
  return Array.from({ length: size }, () => formatUuid(createUuidV4(), options))
}

const ULID_MAX_TIME = 281474976710655

export function generateUlids(count = 1, seedTime = Date.now(), { uppercase = true } = {}) {
  const size = Number(count)
  if (!Number.isInteger(size) || size < 1 || size > 1000) throw new Error('ULID 数量必须在 1 至 1000 之间')
  const time = Number(seedTime)
  if (!Number.isSafeInteger(time) || time < 0 || time > ULID_MAX_TIME) {
    throw new Error('ULID 时间戳必须在 0 至 281474976710655 毫秒之间')
  }
  const factory = monotonicFactory()
  return Array.from({ length: size }, () => {
    const value = factory(time)
    return uppercase ? value : value.toLowerCase()
  })
}

function normalizeIterations(value) {
  const iterations = Number(value) || 210000
  if (!Number.isInteger(iterations) || iterations < 10000 || iterations > 1000000) {
    throw new Error('PBKDF2 迭代次数必须在 10000 至 1000000 之间')
  }
  return iterations
}

async function deriveAesKey(password, salt, iterations) {
  const subtle = getSubtle()
  const material = await subtle.importKey('raw', encoder.encode(String(password)), 'PBKDF2', false, [
    'deriveKey'
  ])
  return subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

export async function encryptText(password, plaintext, { iterations = 210000 } = {}) {
  if (!String(password)) throw new Error('请输入加密密码')
  const rounds = normalizeIterations(iterations)
  const salt = randomBytes(16)
  const iv = randomBytes(12)
  const key = await deriveAesKey(password, salt, rounds)
  const subtle = getSubtle()
  const ciphertext = new Uint8Array(
    await subtle.encrypt(
      { name: 'AES-GCM', iv, additionalData: AES_AAD, tagLength: 128 },
      key,
      encoder.encode(String(plaintext))
    )
  )
  return JSON.stringify({
    format: AES_FORMAT,
    version: AES_VERSION,
    algorithm: 'AES-GCM',
    kdf: 'PBKDF2',
    hash: 'SHA-256',
    iterations: rounds,
    salt: toBase64(salt),
    iv: toBase64(iv),
    ciphertext: toBase64(ciphertext)
  })
}

export async function decryptText(password, payload) {
  if (!String(password)) throw new Error('请输入解密密码')
  let data
  try {
    data = JSON.parse(String(payload).trim())
  } catch {
    throw new Error('密文不是有效的 weishanHub 加密格式（需要完整 JSON）')
  }
  if (!data || data.format !== AES_FORMAT) throw new Error('密文格式标识不匹配')
  if (data.version !== AES_VERSION) throw new Error(`不支持的密文版本：${data.version}`)
  if (data.algorithm !== 'AES-GCM' || data.kdf !== 'PBKDF2' || data.hash !== 'SHA-256') {
    throw new Error('密文算法参数不受支持')
  }
  const iterations = normalizeIterations(data.iterations)
  let salt
  let iv
  let ciphertext
  try {
    salt = fromBase64(data.salt)
    iv = fromBase64(data.iv)
    ciphertext = fromBase64(data.ciphertext)
  } catch {
    throw new Error('密文中的 salt、iv 或 ciphertext 不是合法 Base64')
  }
  if (salt.length < 8 || iv.length !== 12 || ciphertext.length < 16) throw new Error('密文参数长度不合法')
  const key = await deriveAesKey(password, salt, iterations)
  try {
    const subtle = getSubtle()
    const plaintext = await subtle.decrypt(
      { name: 'AES-GCM', iv, additionalData: AES_AAD, tagLength: 128 },
      key,
      ciphertext
    )
    return decoder.decode(plaintext)
  } catch {
    throw new Error('解密失败：密码错误或密文已损坏')
  }
}

function toPem(buffer, label) {
  const bytes = new Uint8Array(buffer)
  const base64 = toBase64(bytes)
  const lines = base64.match(/.{1,64}/g) || []
  return `-----BEGIN ${label}-----\n${lines.join('\n')}\n-----END ${label}-----`
}

export async function generateRsaKeyPair({ modulusLength = 2048, hash = 'SHA-256' } = {}) {
  const size = Number(modulusLength)
  if (![2048, 3072, 4096].includes(size)) throw new Error('RSA 模长仅支持 2048、3072、4096 位')
  if (!['SHA-256', 'SHA-384', 'SHA-512'].includes(hash)) throw new Error('RSA 摘要仅支持 SHA-256、SHA-384、SHA-512')
  const subtle = getSubtle()
  const pair = await subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: size,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash
    },
    true,
    ['encrypt', 'decrypt']
  )
  const [privateKey, publicKey] = await Promise.all([
    subtle.exportKey('pkcs8', pair.privateKey),
    subtle.exportKey('spki', pair.publicKey)
  ])
  return {
    algorithm: 'RSA-OAEP',
    hash,
    modulusLength: size,
    publicExponent: 65537,
    privateKeyPem: toPem(privateKey, 'PRIVATE KEY'),
    publicKeyPem: toPem(publicKey, 'PUBLIC KEY'),
    createdAt: new Date().toISOString()
  }
}
