/** 日期时间解析与格式化。所有函数不依赖浏览器 UI。 */

const ISO_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?)?(Z|[+-]\d{2}:?\d{2})?$/

function pad(value, length = 2) {
  return String(value).padStart(length, '0')
}

function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

function parseOffsetMinutes(zone) {
  if (!zone || zone === 'Z') return 0
  const match = /^([+-])(\d{2}):?(\d{2})$/.exec(zone)
  if (!match) throw new Error('时区偏移格式不合法')
  const minutes = Number(match[2]) * 60 + Number(match[3])
  return match[1] === '-' ? -minutes : minutes
}

function parseStrictIso(text, { defaultZone = 'local' } = {}) {
  const match = ISO_PATTERN.exec(text)
  if (!match) throw new Error('ISO 时间格式不合法，示例：2024-05-01T12:30:00+08:00')
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const hour = match[4] === undefined ? 0 : Number(match[4])
  const minute = match[5] === undefined ? 0 : Number(match[5])
  const second = match[6] === undefined ? 0 : Number(match[6])
  const millisecond = match[7] === undefined ? 0 : Number(match[7].padEnd(3, '0'))
  if (month < 1 || month > 12) throw new Error('月份必须在 1 至 12 之间')
  if (day < 1 || day > daysInMonth(year, month)) throw new Error('日期不存在，请检查当月天数')
  if (hour > 23 || minute > 59 || second > 59) throw new Error('时间不合法，请检查时分秒')
  if (match[8]) {
    const offset = parseOffsetMinutes(match[8])
    const date = new Date(
      Date.UTC(year, month - 1, day, hour, minute, second, millisecond) - offset * 60 * 1000
    )
    if (Number.isNaN(date.getTime())) throw new Error('时区或日期超出可表示范围')
    return { date, zone: match[8] === 'Z' ? 'UTC' : `UTC${match[8]}` }
  }
  if (defaultZone === 'utc') {
    return {
      date: new Date(Date.UTC(year, month - 1, day, hour, minute, second, millisecond)),
      zone: 'UTC（按输入解释）'
    }
  }
  const date = new Date(year, month - 1, day, hour, minute, second, millisecond)
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date.getHours() !== hour ||
    date.getMinutes() !== minute ||
    date.getSeconds() !== second
  ) {
    throw new Error('本地日期时间超出可表示范围')
  }
  return { date, zone: '本地时区（按输入解释）' }
}

function parseUnix(value, unit) {
  const text = String(value ?? '').trim()
  if (!/^-?\d+$/.test(text)) throw new Error('Unix 时间戳必须是整数')
  const big = BigInt(text)
  const ms = unit === 'seconds' ? big * 1000n : big
  if (ms < -8640000000000000n || ms > 8640000000000000n) {
    throw new Error('时间戳超出 JavaScript Date 可表示范围')
  }
  const number = Number(ms)
  if (!Number.isSafeInteger(number)) throw new Error('时间戳精度超出安全整数范围')
  return new Date(number)
}

export function detectDateTimeSource(input) {
  const text = String(input ?? '').trim()
  if (/^-?\d+$/.test(text)) {
    const digits = text.replace('-', '').length
    if (digits === 10) return 'unix-seconds'
    if (digits === 13) return 'unix-ms'
    return 'unknown'
  }
  return ISO_PATTERN.test(text) ? 'iso' : 'unknown'
}

/**
 * 解析日期输入。
 * source: auto | unix-seconds | unix-ms | iso | local | utc
 * 无时区的 ISO 默认按本地时间解释；source=utc 时按 UTC 解释。
 */
export function parseDateTime(input, source = 'auto') {
  const text = String(input ?? '').trim()
  if (!text) throw new Error('请输入日期时间或 Unix 时间戳')
  if (source === 'unix-seconds') return parseUnix(text, 'seconds')
  if (source === 'unix-ms') return parseUnix(text, 'ms')
  if (source === 'local') return parseStrictIso(text, { defaultZone: 'local' }).date
  if (source === 'utc') return parseStrictIso(text, { defaultZone: 'utc' }).date
  if (source === 'iso') return parseStrictIso(text, { defaultZone: 'local' }).date
  const detected = detectDateTimeSource(text)
  if (detected === 'unix-seconds') return parseUnix(text, 'seconds')
  if (detected === 'unix-ms') return parseUnix(text, 'ms')
  if (detected === 'iso') return parseStrictIso(text, { defaultZone: 'local' }).date
  throw new Error('无法自动识别格式，请手动选择输入类型')
}

export function formatOffset(minutes) {
  const sign = minutes < 0 ? '-' : '+'
  const absolute = Math.abs(minutes)
  return `${sign}${pad(Math.floor(absolute / 60))}:${pad(absolute % 60)}`
}

export function formatLocal(date) {
  assertDate(date)
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  )
}

export function formatLocalWithOffset(date) {
  assertDate(date)
  return `${formatLocal(date)} ${formatOffset(-date.getTimezoneOffset())}`
}

export function formatUtc(date) {
  assertDate(date)
  return date.toISOString().replace('T', ' ').replace('Z', ' UTC')
}

export function formatIso(date, { milliseconds = true } = {}) {
  assertDate(date)
  const value = date.toISOString()
  return milliseconds ? value : value.replace(/\.\d{3}Z$/, 'Z')
}

export function weekdayCn(date) {
  assertDate(date)
  return ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'][date.getDay()]
}

export function dateTimeInfo(date) {
  assertDate(date)
  const timestamp = date.getTime()
  if (!Number.isFinite(timestamp)) throw new Error('日期无效')
  return {
    local: formatLocalWithOffset(date),
    utc: formatUtc(date),
    iso: formatIso(date),
    isoSeconds: formatIso(date, { milliseconds: false }),
    unixSeconds: Math.floor(timestamp / 1000),
    unixMilliseconds: timestamp,
    weekday: weekdayCn(date),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '本地时区',
    offset: formatOffset(-date.getTimezoneOffset()),
    relative: relativeTime(date, new Date())
  }
}

export function relativeTime(date, now = new Date()) {
  assertDate(date)
  const diff = date.getTime() - now.getTime()
  const abs = Math.abs(diff)
  const units = [
    [1000, '秒'],
    [60 * 1000, '分钟'],
    [60 * 60 * 1000, '小时'],
    [24 * 60 * 60 * 1000, '天'],
    [30 * 24 * 60 * 60 * 1000, '个月'],
    [365 * 24 * 60 * 60 * 1000, '年']
  ]
  let unit = units[0]
  for (const item of units) {
    if (abs >= item[0]) unit = item
  }
  const value = Math.round(diff / unit[0])
  if (value === 0) return '现在'
  return value > 0 ? `${value} ${unit[1]}后` : `${Math.abs(value)} ${unit[1]}前`
}

export function toDatetimeLocalValue(date) {
  assertDate(date)
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  )
}

export function assertDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    throw new Error('日期无效')
  }
}
