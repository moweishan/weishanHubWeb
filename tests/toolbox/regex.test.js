import test from 'node:test'
import assert from 'node:assert/strict'
import { Worker } from 'node:worker_threads'
import { executeRegex } from '../../src/utils/toolbox/regexCore.js'
import { createRegexRunner } from '../../src/utils/toolbox/regexRunner.js'

test('正则核心返回匹配、捕获组、具名组与替换结果', () => {
  const result = executeRegex({
    pattern: '(?<user>\\w+)@(\\w+\\.\\w+)',
    flags: 'g',
    text: 'a@example.com b@test.org',
    replacement: '<$1>'
  })
  assert.equal(result.count, 2)
  assert.equal(result.matches[0].value, 'a@example.com')
  assert.deepEqual(result.matches[0].groups, ['a', 'example.com'])
  assert.equal(result.matches[0].namedGroups.user, 'a')
  assert.equal(result.replaced, '<a> <b>')
  assert.equal(result.truncated, false)
})

test('零长度全局匹配不会死循环，非法标志会报错', () => {
  const result = executeRegex({ pattern: '(?=a)', flags: 'g', text: 'aaa' })
  assert.equal(result.count, 3)
  const empty = executeRegex({ pattern: '^', flags: 'gm', text: 'a\nb' })
  assert.equal(empty.count, 2)
  assert.throws(() => executeRegex({ pattern: 'a', flags: 'z' }), /不支持的标志/)
  assert.throws(() => executeRegex({ pattern: '(', flags: '' }), /语法错误/)
  assert.throws(() => executeRegex({ pattern: '', flags: '' }), /请输入/)
})

test('零宽匹配按 Unicode code point 推进，普通模式仍按 code unit', () => {
  const astral = executeRegex({ pattern: '(?:)', flags: 'gu', text: '😊' })
  assert.deepEqual(astral.matches.map((match) => match.index), [0, 2])
  const astralPair = executeRegex({ pattern: '(?:)', flags: 'gu', text: '😊😊' })
  assert.deepEqual(astralPair.matches.map((match) => match.index), [0, 2, 4])
  const bmp = executeRegex({ pattern: '(?:)', flags: 'g', text: 'ab' })
  assert.deepEqual(bmp.matches.map((match) => match.index), [0, 1, 2])
  const units = executeRegex({ pattern: '(?:)', flags: 'g', text: '😊' })
  assert.deepEqual(units.matches.map((match) => match.index), [0, 1, 2])
  const empty = executeRegex({ pattern: '(?:)', flags: 'gu', text: '' })
  assert.deepEqual(empty.matches.map((match) => match.index), [0])
})

test('匹配数量达到上限时标记截断', () => {
  const result = executeRegex({ pattern: 'a', flags: 'g', text: 'a'.repeat(1200) })
  assert.equal(result.matches.length, 1000)
  assert.equal(result.truncated, true)
})

test('Worker 正常执行正则', async () => {
  const runner = createRegexRunner(() => new Worker(new URL('./fixtures/regex-worker.mjs', import.meta.url)), 3000)
  const result = await runner.run({ pattern: '\\d+', flags: 'g', text: 'a1b22' })
  assert.equal(result.count, 2)
  assert.deepEqual(
    result.matches.map((match) => match.value),
    ['1', '22']
  )
})

test('灾难性回溯会硬超时并 terminate Worker', async () => {
  const runner = createRegexRunner(() => new Worker(new URL('./fixtures/regex-worker.mjs', import.meta.url)), 250)
  await assert.rejects(
    () =>
      runner.run({
        pattern: '(a+)+$',
        flags: '',
        text: `${'a'.repeat(2000)}!`
      }),
    (error) => error.name === 'RegexTimeoutError' && /超过 250ms/.test(error.message)
  )
})
