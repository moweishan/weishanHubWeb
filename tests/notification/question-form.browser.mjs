// node tests/notification/question-form.browser.mjs；需先启动本地 Vite，仅拦截合成通知接口。
import { chromium } from 'playwright'
import assert from 'node:assert/strict'
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
const token = 'Q'.repeat(43)
let state = 'WAITING', submitted
const errors = []
page.on('pageerror', error => errors.push(error.message))
await page.route('**/dev-api/notification/detail/**', async route => {
  const url = new URL(route.request().url())
  const questions = [{ id: 'q', question: '合成测试：请选择方案', options: [{ label: '测试 A', description: '第一个选项' }, { label: '测试 B', description: '第二个选项' }] }]
  let data
  if (url.pathname.endsWith('/answer')) {
    submitted = route.request().postDataJSON()
    state = 'ANSWERED'
    data = { state, questions, answer: submitted }
  } else if (url.pathname.endsWith('/question')) data = { state, questions, answer: submitted }
  else data = { title: '合成通知', summary: '选择测试', detail: '# 任务详情', messageType: 'CARD', accessMode: 'WECHAT',
    sentAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 3600000).toISOString(), serverTime: new Date().toISOString() }
  await route.fulfill({ json: { code: 200, data } })
})
try {
  await page.goto(`http://127.0.0.1/notification/detail/${token}`)
  await page.locator('label.el-radio').filter({ hasText: '测试 B' }).click()
  await page.getByRole('button', { name: '提交答案', exact: true }).click()
  await page.getByRole('button', { name: '确定', exact: true }).click()
  await page.getByText('答案已提交，等待 DeepSeek 应用', { exact: true }).waitFor()
  assert.deepEqual(submitted, { answers: [{ id: 'q', selected: ['测试 B'] }] })
  state = 'APPLIED'
  await page.getByText('DeepSeek 已应用远程答案', { exact: true }).waitFor()
  assert.equal(await page.getByRole('button', { name: '提交答案', exact: true }).count(), 0)
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false)
  assert.deepEqual(errors, [])
  console.log('PASS：移动端原生选项表单、提交内容、等待应用、应用后只读、无横向溢出')
} finally { await browser.close() }
