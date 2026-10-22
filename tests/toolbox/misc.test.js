import test from 'node:test'
import assert from 'node:assert/strict'
import {
  dateTimeInfo,
  formatLocal,
  formatUtc,
  parseDateTime
} from '../../src/utils/toolbox/date.js'
import { colorInfo, contrastRatio, formatHex, parseColor } from '../../src/utils/toolbox/color.js'
import { normalizeEmail } from '../../src/utils/toolbox/email.js'

test('日期时间解析 Unix 秒/毫秒、ISO 与非法日期', () => {
  const seconds = parseDateTime('1714537800', 'unix-seconds')
  assert.equal(seconds.toISOString(), '2024-05-01T04:30:00.000Z')
  assert.equal(parseDateTime('1714537800000', 'unix-ms').toISOString(), '2024-05-01T04:30:00.000Z')
  assert.equal(parseDateTime('0', 'unix-seconds').toISOString(), '1970-01-01T00:00:00.000Z')
  assert.throws(() => parseDateTime('not-a-date', 'iso'), /格式不合法/)
  assert.throws(() => parseDateTime('2024-02-30', 'local'), /不存在/)
  assert.throws(() => parseDateTime('2024-13-01', 'iso'), /月份/)
  assert.throws(() => parseDateTime('99999999999999999999', 'unix-ms'), /范围/)
  const info = dateTimeInfo(parseDateTime('1714537800', 'unix-seconds'))
  assert.equal(info.unixSeconds, 1714537800)
  assert.equal(info.unixMilliseconds, 1714537800000)
  assert.match(formatUtc(seconds), /UTC$/)
  assert.match(formatLocal(seconds), /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)
})

test('颜色 HEX/RGB/HSL 解析与转换', () => {
  const color = parseColor('#409EFF')
  assert.deepEqual({ r: color.r, g: color.g, b: color.b, a: color.a }, { r: 64, g: 158, b: 255, a: 1 })
  assert.equal(formatHex(color), '#409eff')
  assert.match(colorInfo('rgb(64, 158, 255)').hsl, /^hsl\(/)
  assert.equal(parseColor('#abc').r, 170)
  assert.equal(parseColor('rgba(0, 0, 0, 0.5)').a, 0.5)
  assert.equal(parseColor('hsl(210, 100%, 63%)').b, 255)
  assert.equal(contrastRatio('#000', '#fff'), 21)
  assert.throws(() => parseColor('not-a-color'), /无法识别/)
  assert.throws(() => parseColor('#12'), /HEX/)
})

test('邮箱规范化与 Gmail 规则', () => {
  const result = normalizeEmail(' User.Name+tag@Gmail.com ', {
    lowerLocal: true,
    lowerDomain: true,
    removePlusTag: true,
    removeGmailDots: true
  })
  assert.equal(result.email, 'username@gmail.com')
  assert.equal(result.isGmail, true)
  assert.ok(result.changes.length >= 3)
  const nonGmail = normalizeEmail('a.b@example.com', { removeGmailDots: true })
  assert.equal(nonGmail.email, 'a.b@example.com')
  assert.match(nonGmail.warnings.join(''), /Gmail/)
  assert.throws(() => normalizeEmail('a@@b.com'), /一个 @/)
  assert.throws(() => normalizeEmail('a..b@example.com'), /点号/)
  assert.throws(() => normalizeEmail('a@-bad.com'), /域名/)
  assert.match(normalizeEmail('user@例子.测试').email, /^user@xn--/)
})
