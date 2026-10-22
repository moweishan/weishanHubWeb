import test from 'node:test'
import assert from 'node:assert/strict'
import {
  describeCron,
  matchesCron,
  nextCronRuns,
  parseCron,
  validateCron
} from '../../src/utils/toolbox/cron.js'
import { chmodInfo, explainMode, parseOctalMode, symbolicToState } from '../../src/utils/toolbox/chmod.js'

test('标准 5 字段 Cron 校验、描述与后续执行', () => {
  const parsed = parseCron('*/15 9-17 * * 1-5')
  assert.equal(parsed.expression, '*/15 9-17 * * 1-5')
  assert.equal(parsed.minutes.has(0), true)
  assert.equal(parsed.minutes.has(15), true)
  assert.equal(parsed.hours.has(12), true)
  assert.equal(parsed.daysOfWeek.has(5), true)
  assert.match(describeCron('0 9 * * 1-5'), /9 点|工作日|周一/)
  assert.equal(validateCron('@daily').expression, '0 0 * * *')

  const from = new Date(2024, 0, 1, 8, 0, 0)
  const runs = nextCronRuns('*/15 9-17 * * 1-5', 5, from)
  assert.equal(runs.length, 5)
  assert.equal(runs[0].local, '2024-01-01 09:00')
  for (const run of runs) {
    const date = new Date(run.timestamp)
    assert.ok(date.getDay() >= 1 && date.getDay() <= 5)
    assert.ok(date.getHours() >= 9 && date.getHours() <= 17)
    assert.equal(date.getMinutes() % 15, 0)
  }
  const feb29 = nextCronRuns('0 0 29 2 *', 1, new Date(2024, 0, 1))
  assert.equal(feb29[0].local, '2024-02-29 00:00')
})

test('Cron 拒绝 Quartz 六字段、? 与非法范围', () => {
  assert.throws(() => parseCron('0 0 0 * * *'), /5 字段/)
  assert.throws(() => parseCron('0 0 ? * *'), /不支持 Quartz/)
  assert.throws(() => parseCron('0 0 * * 8'), /超出/)
  assert.throws(() => parseCron('5-1 * * * *'), /起点不能大于终点/)
  assert.throws(() => parseCron('* * * * * *'), /5 字段/)
})

test('Cron 日/星期 OR 语义与本地匹配', () => {
  const parsed = parseCron('0 0 1 * 1')
  assert.equal(parsed.domRestricted, true)
  assert.equal(parsed.dowRestricted, true)
  const first = new Date(2024, 0, 1, 0, 0)
  assert.equal(matchesCron(parsed, first), true)
  const monday = new Date(2024, 0, 8, 0, 0)
  assert.equal(matchesCron(parsed, monday), true)
  const tuesday = new Date(2024, 0, 9, 0, 0)
  assert.equal(matchesCron(parsed, tuesday), false)
})

test('chmod 八进制、符号与特殊位换算', () => {
  const mode = parseOctalMode('755')
  assert.equal(mode.octal, '755')
  assert.equal(mode.symbolic, 'rwxr-xr-x')
  const setuid = parseOctalMode('4755')
  assert.equal(setuid.special.setuid, true)
  assert.equal(setuid.symbolic, 'rwsr-xr-x')
  const sticky = parseOctalMode('1777')
  assert.equal(sticky.symbolic, 'rwxrwxrwt')
  assert.equal(symbolicToState('rwxr-x---').octal, '750')
  assert.equal(symbolicToState('u=rwx,g=rx,o=').octal, '750')
  assert.equal(symbolicToState('a+x').octal, '111')
  assert.match(explainMode(setuid), /setuid/)
  assert.match(chmodInfo('644').explanation, /所有者可读取/)
  assert.throws(() => parseOctalMode('888'), /0-7/)
  assert.throws(() => symbolicToState('u+q'), /无法识别/)
})
