/** 文本、编码与命名转换的纯函数。浏览器与 Node 20+ 均可直接使用。 */

import he from 'he'

const utf8Encoder = new TextEncoder()
const utf8Decoder = new TextDecoder('utf-8', { fatal: true })

export function bytesToBase64(bytes) {
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

export function base64ToBytes(input) {
  let value = String(input ?? '').replace(/\s+/g, '')
  if (!value) throw new Error('Base64 内容为空')
  value = value.replace(/-/g, '+').replace(/_/g, '/')
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(value)) throw new Error('包含非法的 Base64 字符')
  if (value.length % 4 === 1) throw new Error('Base64 长度不合法')
  value = value.padEnd(Math.ceil(value.length / 4) * 4, '=')
  let binary
  try {
    binary = atob(value)
  } catch {
    throw new Error('Base64 解码失败，请检查内容是否完整')
  }
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

export function utf8ToBase64(text) {
  return bytesToBase64(utf8Encoder.encode(String(text)))
}

export function base64ToUtf8(input) {
  const bytes = base64ToBytes(input)
  try {
    return utf8Decoder.decode(bytes)
  } catch {
    throw new Error('解码结果不是合法的 UTF-8 文本，可改用「Base64 文件转换」还原二进制')
  }
}

export function textToBytes(text) {
  return utf8Encoder.encode(String(text))
}

export function bytesToText(bytes) {
  try {
    return utf8Decoder.decode(bytes)
  } catch {
    throw new Error('字节内容不是合法的 UTF-8 文本')
  }
}

/** 使用 BigInt 在任意 2-36 进制间转换，不经过 Number。 */
export function convertBase(value, fromBase, toBase, { uppercase = true } = {}) {
  const from = Number(fromBase)
  const to = Number(toBase)
  if (!Number.isInteger(from) || from < 2 || from > 36) throw new Error('源进制必须是 2 至 36 的整数')
  if (!Number.isInteger(to) || to < 2 || to > 36) throw new Error('目标进制必须是 2 至 36 的整数')
  const parsed = parseBigInt(value, from)
  return formatBigInt(parsed, to, uppercase)
}

export function parseBigInt(value, base) {
  let text = String(value ?? '').trim().replace(/[\s_]/g, '')
  if (!text) throw new Error('请输入要转换的整数')
  let sign = 1n
  if (text[0] === '-' || text[0] === '+') {
    if (text[0] === '-') sign = -1n
    text = text.slice(1)
  }
  if (base === 16 && /^0x/i.test(text)) text = text.slice(2)
  if (base === 2 && /^0b/i.test(text)) text = text.slice(2)
  if (base === 8 && /^0o/i.test(text)) text = text.slice(2)
  if (!text) throw new Error('请输入要转换的整数')
  const bigBase = BigInt(base)
  let result = 0n
  for (const char of text.toLowerCase()) {
    const digit = digitValue(char)
    if (digit < 0 || digit >= base) {
      throw new Error(`字符「${char}」不是 ${base} 进制数字`)
    }
    result = result * bigBase + BigInt(digit)
  }
  return result * sign
}

export function formatBigInt(value, base, uppercase = true) {
  let number = typeof value === 'bigint' ? value : BigInt(value)
  const negative = number < 0n
  if (negative) number = -number
  const bigBase = BigInt(base)
  if (number === 0n) return '0'
  let result = ''
  while (number > 0n) {
    result = digitChar(Number(number % bigBase), uppercase) + result
    number /= bigBase
  }
  return negative ? `-${result}` : result
}

function digitValue(char) {
  const code = char.charCodeAt(0)
  if (code >= 48 && code <= 57) return code - 48
  if (code >= 97 && code <= 122) return code - 87
  return -1
}

function digitChar(value, uppercase = true) {
  if (value < 10) return String(value)
  const char = String.fromCharCode(87 + value)
  return uppercase ? char.toUpperCase() : char
}

const ROMAN_VALUES = [
  [1000, 'M'],
  [900, 'CM'],
  [500, 'D'],
  [400, 'CD'],
  [100, 'C'],
  [90, 'XC'],
  [50, 'L'],
  [40, 'XL'],
  [10, 'X'],
  [9, 'IX'],
  [5, 'V'],
  [4, 'IV'],
  [1, 'I']
]

export function toRoman(input) {
  const value = typeof input === 'bigint' ? input : BigInt(String(input).trim())
  if (value < 1n || value > 3999n) throw new Error('罗马数字仅支持 1 至 3999 的整数')
  let number = Number(value)
  let result = ''
  for (const [amount, symbol] of ROMAN_VALUES) {
    while (number >= amount) {
      result += symbol
      number -= amount
    }
  }
  return result
}

export function fromRoman(input) {
  const text = String(input ?? '').trim().toUpperCase()
  if (!text) throw new Error('请输入罗马数字')
  if (!/^[IVXLCDM]+$/.test(text)) throw new Error('罗马数字只能包含 I、V、X、L、C、D、M')
  let index = 0
  let result = 0
  for (const [amount, symbol] of ROMAN_VALUES) {
    while (text.startsWith(symbol, index)) {
      result += amount
      index += symbol.length
    }
  }
  if (index !== text.length) throw new Error('罗马数字格式不合法')
  if (result < 1 || result > 3999) throw new Error('罗马数字超出 1 至 3999 范围')
  if (toRoman(result) !== text) throw new Error('罗马数字不是规范写法')
  return result
}

const NATO_WORDS = {
  A: 'Alfa',
  B: 'Bravo',
  C: 'Charlie',
  D: 'Delta',
  E: 'Echo',
  F: 'Foxtrot',
  G: 'Golf',
  H: 'Hotel',
  I: 'India',
  J: 'Juliett',
  K: 'Kilo',
  L: 'Lima',
  M: 'Mike',
  N: 'November',
  O: 'Oscar',
  P: 'Papa',
  Q: 'Quebec',
  R: 'Romeo',
  S: 'Sierra',
  T: 'Tango',
  U: 'Uniform',
  V: 'Victor',
  W: 'Whiskey',
  X: 'X-ray',
  Y: 'Yankee',
  Z: 'Zulu',
  0: 'Zero',
  1: 'One',
  2: 'Two',
  3: 'Three',
  4: 'Four',
  5: 'Five',
  6: 'Six',
  7: 'Seven',
  8: 'Eight',
  9: 'Nine'
}

const NATO_LOOKUP = Object.fromEntries(
  Object.entries(NATO_WORDS).map(([key, value]) => [value.toLowerCase().replace(/-/g, ''), key])
)

export function textToNato(text, separator = ' ') {
  const tokens = Array.from(String(text).toUpperCase()).map((char) => {
    if (NATO_WORDS[char]) return NATO_WORDS[char]
    if (char === ' ') return '(space)'
    if (char === '\n') return '(newline)'
    if (char === '\t') return '(tab)'
    return char
  })
  return tokens.join(separator)
}

export function natoToText(input, separator = ' ') {
  const source = String(input ?? '').trim()
  if (!source) throw new Error('请输入 NATO 音标文本')
  const tokens = separator ? source.split(separator) : Array.from(source)
  return tokens
    .map((token) => {
      const cleaned = token.trim()
      if (!cleaned) return ''
      if (cleaned === '(space)') return ' '
      if (cleaned === '(newline)') return '\n'
      if (cleaned === '(tab)') return '\t'
      const key = NATO_LOOKUP[cleaned.toLowerCase().replace(/-/g, '')]
      if (key) return key
      if (cleaned.length === 1) return cleaned
      throw new Error(`无法识别的 NATO 词：${cleaned}`)
    })
    .join('')
}

export function textToBinary(text, separator = ' ') {
  return Array.from(textToBytes(text))
    .map((byte) => byte.toString(2).padStart(8, '0'))
    .join(separator)
}

export function binaryToText(input) {
  const digits = String(input ?? '').replace(/[^01]/g, '')
  if (!digits) throw new Error('请输入二进制内容')
  if (digits.length % 8 !== 0) throw new Error('二进制位数必须是 8 的倍数')
  const bytes = new Uint8Array(digits.length / 8)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Number.parseInt(digits.slice(i * 8, i * 8 + 8), 2)
  }
  return bytesToText(bytes)
}

export function textToUnicode(text, style = 'code-point', separator = '') {
  return Array.from(String(text))
    .map((char) => {
      const point = char.codePointAt(0)
      if (style === 'js') {
        return point <= 0xffff
          ? `\\u${point.toString(16).padStart(4, '0')}`
          : `\\u{${point.toString(16).toUpperCase()}}`
      }
      if (style === 'utf16') {
        return Array.from({ length: char.length }, (_, index) =>
          `\\u${char.charCodeAt(index).toString(16).padStart(4, '0')}`
        ).join('')
      }
      if (style === 'html') return `&#x${point.toString(16).toUpperCase()};`
      return `U+${point.toString(16).toUpperCase().padStart(4, '0')}`
    })
    .join(separator)
}

export function unicodeToText(input) {
  const source = String(input ?? '')
  if (!source.trim()) throw new Error('请输入 Unicode 转义内容')
  return source
    .replace(/\\u\{([0-9a-fA-F]{1,6})\}/g, (_, hex) => fromCodePoint(hex))
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(Number.parseInt(hex, 16)))
    .replace(/(?:U\+|&#x)([0-9a-fA-F]{1,6});?/g, (_, hex) => fromCodePoint(hex))
    .replace(/&#(\d{1,7});?/g, (_, dec) => fromCodePoint(Number(dec)))
}

function fromCodePoint(value) {
  const point = typeof value === 'string' ? Number.parseInt(value, 16) : Number(value)
  if (!Number.isInteger(point) || point < 0 || point > 0x10ffff) {
    throw new Error(`无效的 Unicode 码点：${value}`)
  }
  return String.fromCodePoint(point)
}

export function encodeHtmlEntities(text, mode = 'basic') {
  const input = String(text)
  if (mode === 'all') return he.encode(input, { encodeEverything: true, useNamedReferences: false })
  if (mode === 'non-ascii') return he.encode(input, { useNamedReferences: true, allowUnsafeSymbols: false })
  return Array.from(input)
    .map((char) => {
      if (char === '&') return '&amp;'
      if (char === '<') return '&lt;'
      if (char === '>') return '&gt;'
      if (char === '"') return '&quot;'
      if (char === "'") return '&#39;'
      return char
    })
    .join('')
}

export function decodeHtmlEntities(text) {
  return he.decode(String(text ?? '').replace(/&#X/g, '&#x'))
}

export function encodeUrl(text, mode = 'component') {
  try {
    return mode === 'full' ? encodeURI(String(text)) : encodeURIComponent(String(text))
  } catch {
    throw new Error('URL 编码失败，内容可能包含孤立代理字符')
  }
}

export function decodeUrl(text, mode = 'component') {
  try {
    return mode === 'full' ? decodeURI(String(text)) : decodeURIComponent(String(text))
  } catch {
    throw new Error('URL 解码失败，可能存在不完整的百分号转义')
  }
}

export function slugify(text, { separator = '-', lowercase = true, keepUnicode = false } = {}) {
  let value = String(text ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
  if (!keepUnicode) value = value.replace(/[^\x00-\x7F]/g, ' ')
  if (lowercase) value = value.toLowerCase()
  const pattern = keepUnicode ? /[^\p{L}\p{N}]+/gu : /[^a-zA-Z0-9]+/g
  value = value.replace(pattern, separator || '-').replace(new RegExp(`^\\${separator}+|\\${separator}+$`, 'g'), '')
  return value
}

export function buildBasicAuth(username, password) {
  return `Basic ${utf8ToBase64(`${username}:${password}`)}`
}

export function parseBasicAuth(input) {
  const text = String(input ?? '').trim()
  const value = text.replace(/^Basic\s+/i, '')
  if (!value) throw new Error('请输入 Basic Authorization 内容')
  const decoded = base64ToUtf8(value)
  const index = decoded.indexOf(':')
  if (index < 0) throw new Error('解码结果缺少冒号，无法区分用户名与密码')
  return { username: decoded.slice(0, index), password: decoded.slice(index + 1) }
}

export function splitWords(text) {
  return String(text ?? '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/[_\-.\/\\]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
}

export function convertCase(text, target) {
  const words = splitWords(text)
  if (!words.length) return ''
  const lower = words.map((word) => word.toLowerCase())
  const capitalize = (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  switch (target) {
    case 'lower':
      return String(text).toLowerCase()
    case 'upper':
      return String(text).toUpperCase()
    case 'title':
      return words.map(capitalize).join(' ')
    case 'sentence':
      return capitalize(lower.join(' '))
    case 'camel':
      return lower.map((word, index) => (index === 0 ? word : capitalize(word))).join('')
    case 'pascal':
      return lower.map(capitalize).join('')
    case 'snake':
      return lower.join('_')
    case 'kebab':
      return lower.join('-')
    case 'constant':
      return lower.join('_').toUpperCase()
    case 'dot':
      return lower.join('.')
    case 'path':
      return lower.join('/')
    case 'train':
      return lower.map(capitalize).join('-')
    default:
      throw new Error(`未知的命名格式：${target}`)
  }
}

export function processList(text, options = {}) {
  const {
    trim = true,
    removeEmpty = true,
    dedupe = false,
    sort = 'none',
    prefix = '',
    suffix = '',
    numbering = 'none',
    separator = '\n'
  } = options
  let items = String(text ?? '').split(/\r?\n/)
  if (trim) items = items.map((item) => item.trim())
  if (removeEmpty) items = items.filter(Boolean)
  if (dedupe) items = Array.from(new Set(items))
  if (sort === 'asc') items.sort((a, b) => a.localeCompare(b, 'zh-CN'))
  if (sort === 'desc') items.sort((a, b) => b.localeCompare(a, 'zh-CN'))
  if (sort === 'length') items.sort((a, b) => a.length - b.length || a.localeCompare(b, 'zh-CN'))
  return items
    .map((item, index) => {
      const number = numbering === 'number' ? `${index + 1}. ` : numbering === 'dash' ? '- ' : ''
      return `${number}${prefix}${item}${suffix}`
    })
    .join(separator)
}
