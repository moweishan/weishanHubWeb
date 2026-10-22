/** HEX / RGB(A) / HSL(A) 颜色解析、转换与对比度计算。 */

const NAMED_COLORS = {
  black: '#000000',
  white: '#ffffff',
  red: '#ff0000',
  green: '#008000',
  blue: '#0000ff',
  yellow: '#ffff00',
  cyan: '#00ffff',
  magenta: '#ff00ff',
  gray: '#808080',
  grey: '#808080',
  orange: '#ffa500',
  purple: '#800080',
  pink: '#ffc0cb',
  brown: '#a52a2a',
  lime: '#00ff00',
  navy: '#000080',
  teal: '#008080',
  olive: '#808000',
  maroon: '#800000',
  silver: '#c0c0c0',
  transparent: '#00000000'
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function round(value, digits = 0) {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function parseChannel(value, max = 255) {
  const text = String(value).trim()
  if (text.endsWith('%')) {
    const percent = Number.parseFloat(text)
    if (!Number.isFinite(percent)) throw new Error(`通道值不合法：${value}`)
    return clamp(Math.round((percent / 100) * max), 0, max)
  }
  const number = Number.parseFloat(text)
  if (!Number.isFinite(number)) throw new Error(`通道值不合法：${value}`)
  return clamp(Math.round(number), 0, max)
}

function parseAlpha(value) {
  if (value === undefined) return 1
  const text = String(value).trim()
  const number = text.endsWith('%') ? Number.parseFloat(text) / 100 : Number.parseFloat(text)
  if (!Number.isFinite(number)) throw new Error(`透明度不合法：${value}`)
  return clamp(round(number, 3), 0, 1)
}

function parseHue(value) {
  const text = String(value).trim()
  const number = Number.parseFloat(text)
  if (!Number.isFinite(number)) throw new Error(`色相不合法：${value}`)
  return ((number % 360) + 360) % 360
}

function parsePercent(value) {
  const text = String(value).trim()
  const number = Number.parseFloat(text)
  if (!Number.isFinite(number)) throw new Error(`百分比不合法：${value}`)
  return clamp(text.endsWith('%') ? number : number, 0, 100)
}

export function hexToRgb(input) {
  let hex = String(input ?? '').trim().replace(/^#/, '')
  if (/^[0-9a-fA-F]{3,4}$/.test(hex)) {
    hex = hex
      .split('')
      .map((char) => char + char)
      .join('')
  }
  if (!/^[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/.test(hex)) throw new Error('HEX 颜色格式不合法')
  const r = Number.parseInt(hex.slice(0, 2), 16)
  const g = Number.parseInt(hex.slice(2, 4), 16)
  const b = Number.parseInt(hex.slice(4, 6), 16)
  const a = hex.length === 8 ? round(Number.parseInt(hex.slice(6, 8), 16) / 255, 3) : 1
  return { r, g, b, a }
}

export function rgbToHsl({ r, g, b, a = 1 }) {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const delta = max - min
  let h = 0
  let s = 0
  const l = (max + min) / 2
  if (delta !== 0) {
    s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min)
    if (max === rn) h = ((gn - bn) / delta + (gn < bn ? 6 : 0)) * 60
    else if (max === gn) h = ((bn - rn) / delta + 2) * 60
    else h = ((rn - gn) / delta + 4) * 60
  }
  return { h: round(h), s: round(s * 100, 1), l: round(l * 100, 1), a }
}

export function hslToRgb({ h, s, l, a = 1 }) {
  const hue = ((h % 360) + 360) % 360
  const saturation = clamp(s, 0, 100) / 100
  const lightness = clamp(l, 0, 100) / 100
  const c = (1 - Math.abs(2 * lightness - 1)) * saturation
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1))
  const m = lightness - c / 2
  let rgb
  if (hue < 60) rgb = [c, x, 0]
  else if (hue < 120) rgb = [x, c, 0]
  else if (hue < 180) rgb = [0, c, x]
  else if (hue < 240) rgb = [0, x, c]
  else if (hue < 300) rgb = [x, 0, c]
  else rgb = [c, 0, x]
  return {
    r: Math.round((rgb[0] + m) * 255),
    g: Math.round((rgb[1] + m) * 255),
    b: Math.round((rgb[2] + m) * 255),
    a
  }
}

function hslTextToRgb(body) {
  const parts = body.split(',').map((item) => item.trim())
  if (parts.length < 3) throw new Error('HSL 需要色相、饱和度、亮度三个值')
  return hslToRgb({
    h: parseHue(parts[0]),
    s: parsePercent(parts[1]),
    l: parsePercent(parts[2]),
    a: parseAlpha(parts[3])
  })
}

export function parseColor(input) {
  const text = String(input ?? '').trim()
  if (!text) throw new Error('请输入颜色值')
  const named = NAMED_COLORS[text.toLowerCase()]
  if (named) return parseColor(named)
  if (text.startsWith('#') || /^[0-9a-fA-F]{3,8}$/.test(text)) {
    const rgb = hexToRgb(text)
    return { ...rgb, ...rgbToHsl(rgb) }
  }
  const rgbMatch = /^rgba?\((.*)\)$/i.exec(text)
  if (rgbMatch) {
    const parts = rgbMatch[1].split(',').map((item) => item.trim())
    if (parts.length < 3) throw new Error('RGB 需要红、绿、蓝三个通道')
    const rgb = {
      r: parseChannel(parts[0]),
      g: parseChannel(parts[1]),
      b: parseChannel(parts[2]),
      a: parseAlpha(parts[3])
    }
    return { ...rgb, ...rgbToHsl(rgb) }
  }
  const hslMatch = /^hsla?\((.*)\)$/i.exec(text)
  if (hslMatch) {
    const rgb = hslTextToRgb(hslMatch[1])
    const hsl = rgbToHsl(rgb)
    return { ...rgb, ...hsl }
  }
  throw new Error('无法识别颜色，请使用 #RRGGBB、rgb()、rgba()、hsl() 或 hsla()')
}

export function formatHex({ r, g, b, a = 1 }) {
  const hex = `#${[r, g, b].map((value) => clamp(Math.round(value), 0, 255).toString(16).padStart(2, '0')).join('')}`
  return a < 1 ? `${hex}${Math.round(clamp(a, 0, 1) * 255).toString(16).padStart(2, '0')}` : hex
}

export function formatRgb({ r, g, b, a = 1 }) {
  return a < 1 ? `rgba(${r}, ${g}, ${b}, ${a})` : `rgb(${r}, ${g}, ${b})`
}

export function formatHsl({ h, s, l, a = 1 }) {
  return a < 1 ? `hsla(${h}, ${s}%, ${l}%, ${a})` : `hsl(${h}, ${s}%, ${l}%)`
}

export function relativeLuminance({ r, g, b }) {
  const channels = [r, g, b].map((value) => {
    const srgb = value / 255
    return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
}

export function contrastRatio(colorA, colorB) {
  const first = relativeLuminance(typeof colorA === 'string' ? parseColor(colorA) : colorA)
  const second = relativeLuminance(typeof colorB === 'string' ? parseColor(colorB) : colorB)
  const lighter = Math.max(first, second)
  const darker = Math.min(first, second)
  return round((lighter + 0.05) / (darker + 0.05), 2)
}

export function colorInfo(input) {
  const color = parseColor(input)
  return {
    hex: formatHex(color),
    rgb: formatRgb(color),
    hsl: formatHsl(color),
    channels: { r: color.r, g: color.g, b: color.b, a: color.a, h: color.h, s: color.s, l: color.l },
    contrastOnWhite: contrastRatio(color, { r: 255, g: 255, b: 255 }),
    contrastOnBlack: contrastRatio(color, { r: 0, g: 0, b: 0 }),
    readableText: relativeLuminance(color) > 0.35 ? '#111111' : '#ffffff'
  }
}
