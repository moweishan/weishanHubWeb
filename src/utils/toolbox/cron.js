/** 标准 5 字段 Crontab 解析、描述与后续执行时间计算。 */

const MONTH_NAMES = {
  JAN: 1,
  FEB: 2,
  MAR: 3,
  APR: 4,
  MAY: 5,
  JUN: 6,
  JUL: 7,
  AUG: 8,
  SEP: 9,
  OCT: 10,
  NOV: 11,
  DEC: 12
}

const WEEKDAY_NAMES = {
  SUN: 0,
  MON: 1,
  TUE: 2,
  WED: 3,
  THU: 4,
  FRI: 5,
  SAT: 6
}

const FIELDS = [
  { name: '分钟', min: 0, max: 59 },
  { name: '小时', min: 0, max: 23 },
  { name: '日', min: 1, max: 31 },
  { name: '月', min: 1, max: 12, names: MONTH_NAMES },
  { name: '星期', min: 0, max: 7, names: WEEKDAY_NAMES }
]

const MACROS = {
  '@yearly': '0 0 1 1 *',
  '@annually': '0 0 1 1 *',
  '@monthly': '0 0 1 * *',
  '@weekly': '0 0 * * 0',
  '@daily': '0 0 * * *',
  '@midnight': '0 0 * * *',
  '@hourly': '0 * * * *'
}

function parseValue(raw, field) {
  const text = String(raw).trim().toUpperCase()
  if (field.names && Object.prototype.hasOwnProperty.call(field.names, text)) return field.names[text]
  if (!/^\d+$/.test(text)) throw new Error(`${field.name}字段包含无效值：${raw}`)
  const value = Number(text)
  if (value < field.min || value > field.max) {
    throw new Error(`${field.name}字段的值 ${value} 超出 ${field.min}-${field.max}`)
  }
  return value
}

function parseField(raw, field) {
  const values = new Set()
  const pieces = String(raw).split(',')
  if (pieces.some((piece) => piece === '')) throw new Error(`${field.name}字段存在空列表项`)
  for (const piece of pieces) {
    if (piece.includes('?')) throw new Error('不支持 Quartz 的 ? 语法，本工具仅支持标准 5 字段 Crontab')
    const [rangePart, stepPart, extra] = piece.split('/')
    if (extra !== undefined) throw new Error(`${field.name}字段的步长语法不合法：${piece}`)
    let step = 1
    if (stepPart !== undefined) {
      if (!/^\d+$/.test(stepPart) || Number(stepPart) < 1) {
        throw new Error(`${field.name}字段步长必须是正整数`)
      }
      step = Number(stepPart)
    }
    let start
    let end
    if (rangePart === '*') {
      start = field.min
      end = field.max
    } else if (rangePart.includes('-')) {
      const parts = rangePart.split('-')
      if (parts.length !== 2) throw new Error(`${field.name}字段范围不合法：${rangePart}`)
      start = parseValue(parts[0], field)
      end = parseValue(parts[1], field)
      if (start > end) throw new Error(`${field.name}字段范围起点不能大于终点：${rangePart}`)
    } else {
      start = parseValue(rangePart, field)
      end = stepPart === undefined ? start : field.max
    }
    if (step > 1 && stepPart === undefined) throw new Error(`${field.name}字段步长语法不合法`)
    for (let value = start; value <= end; value += step) values.add(value)
  }
  return values
}

export function parseCron(expression) {
  const original = String(expression ?? '').trim()
  if (!original) throw new Error('请输入 Crontab 表达式')
  if (MACROS[original.toLowerCase()]) {
    return parseCron(MACROS[original.toLowerCase()])
  }
  if (original.startsWith('@')) {
    throw new Error(`不支持的 Cron 宏：${original}，请展开为标准 5 字段`)
  }
  const parts = original.split(/\s+/)
  if (parts.length !== 5) {
    throw new Error(`标准 Crontab 必须是 5 字段（分 时 日 月 周），当前为 ${parts.length} 个字段`)
  }
  const sets = parts.map((part, index) => parseField(part, FIELDS[index]))
  // 7 与 0 都表示星期日；统一按 0 匹配。
  if (sets[4].has(7)) {
    sets[4].delete(7)
    sets[4].add(0)
  }
  return {
    expression: parts.join(' '),
    fields: parts,
    minutes: sets[0],
    hours: sets[1],
    daysOfMonth: sets[2],
    months: sets[3],
    daysOfWeek: sets[4],
    domRestricted: sets[2].size < 31,
    dowRestricted: sets[4].size < 7
  }
}

export function validateCron(expression) {
  const parsed = parseCron(expression)
  return { valid: true, expression: parsed.expression, errors: [] }
}

function listValues(set, formatter = (value) => value) {
  return Array.from(set)
    .sort((a, b) => a - b)
    .map(formatter)
    .join('、')
}

function describeMinutes(set, raw) {
  if (raw === '*') return '每分钟'
  if (/^\*\/\d+$/.test(raw)) return `每 ${raw.split('/')[1]} 分钟`
  if (set.size === 1) return `第 ${Array.from(set)[0]} 分钟`
  return `第 ${listValues(set)} 分钟`
}

function describeHours(set, raw) {
  if (raw === '*') return '每小时'
  if (/^\*\/\d+$/.test(raw)) return `每 ${raw.split('/')[1]} 小时`
  if (set.size === 1) return `${Array.from(set)[0]} 点`
  return `${listValues(set)} 点`
}

function describeMonth(set) {
  if (set.size === 12) return '每月'
  return `${listValues(set)} 月`
}

const WEEKDAY_TEXT = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

export function describeCron(expression) {
  const parsed = parseCron(expression)
  const [rawMinute, rawHour, rawDay, rawMonth, rawWeekday] = parsed.fields
  const minutes = describeMinutes(parsed.minutes, rawMinute)
  const hours = describeHours(parsed.hours, rawHour)
  const month = describeMonth(parsed.months)
  let day
  if (parsed.domRestricted) {
    day = parsed.daysOfMonth.size === 1 ? `${Array.from(parsed.daysOfMonth)[0]} 日` : `${listValues(parsed.daysOfMonth)} 日`
  } else if (parsed.dowRestricted) {
    day = listValues(parsed.daysOfWeek, (value) => WEEKDAY_TEXT[value])
  } else {
    day = '每天'
  }
  if (parsed.domRestricted && parsed.dowRestricted) {
    day = `${listValues(parsed.daysOfMonth)} 日或 ${listValues(parsed.daysOfWeek, (value) => WEEKDAY_TEXT[value])}`
  }
  const datePart = parsed.months.size === 12 ? day : `${month}${day}`
  return `${datePart}，${hours}${minutes === '每分钟' ? '每分钟' : `的${minutes}`}执行（本地时区）`
}

function dayMatches(parsed, date) {
  const dom = parsed.daysOfMonth.has(date.getDate())
  const dow = parsed.daysOfWeek.has(date.getDay())
  if (parsed.domRestricted && parsed.dowRestricted) return dom || dow
  if (parsed.domRestricted) return dom
  if (parsed.dowRestricted) return dow
  return true
}

export function matchesCron(parsed, date) {
  return (
    parsed.minutes.has(date.getMinutes()) &&
    parsed.hours.has(date.getHours()) &&
    parsed.months.has(date.getMonth() + 1) &&
    dayMatches(parsed, date)
  )
}

export function nextCronRuns(expression, count = 5, from = new Date()) {
  const parsed = parseCron(expression)
  const size = Math.min(20, Math.max(1, Number(count) || 5))
  const start = new Date(from)
  if (Number.isNaN(start.getTime())) throw new Error('起始时间无效')
  start.setSeconds(0, 0)
  start.setMinutes(start.getMinutes() + 1)
  const results = []
  const limit = start.getTime() + 1000 * 60 * 60 * 24 * 366 * 5
  let cursor = start.getTime()
  let guard = 0
  while (cursor <= limit && results.length < size && guard < 3_000_000) {
    const date = new Date(cursor)
    if (matchesCron(parsed, date)) {
      results.push({
        iso: date.toISOString(),
        local: formatLocalDate(date),
        timestamp: date.getTime()
      })
    }
    cursor += 60 * 1000
    guard++
  }
  if (results.length < size) {
    throw new Error('未来 5 年内未找到足够的执行时间，请检查日期组合是否可达（例如 2 月 31 日）')
  }
  return results
}

function formatLocalDate(date) {
  const pad = (value) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(
    date.getMinutes()
  )}`
}

export const CRON_PRESETS = Object.freeze([
  { label: '每分钟', expression: '* * * * *' },
  { label: '每 5 分钟', expression: '*/5 * * * *' },
  { label: '每小时', expression: '0 * * * *' },
  { label: '每天 00:00', expression: '0 0 * * *' },
  { label: '每天 09:00', expression: '0 9 * * *' },
  { label: '工作日 09:00', expression: '0 9 * * 1-5' },
  { label: '每周一 00:00', expression: '0 0 * * 1' },
  { label: '每月 1 日 00:00', expression: '0 0 1 * *' },
  { label: '每年 1 月 1 日 00:00', expression: '0 0 1 1 *' }
])
