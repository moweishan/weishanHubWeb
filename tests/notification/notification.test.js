import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  buildLoginRedirect,
  formatRemaining,
  isPublicExpired,
  isValidNotificationToken,
  serverTimeOffset
} from '../../src/utils/notification/public.js'
import { renderNotificationMarkdownSource } from '../../src/utils/notification/markdown-source.js'
import {
  detailUrlSourceLabel,
  normalizeDetailBaseUrl,
  providerDetailFields,
  providerLabel,
  providerSummary
} from '../../src/utils/notification/channel.js'

const root = new URL('../../', import.meta.url)

function read(relativePath) {
  return readFileSync(fileURLToPath(new URL(relativePath, root)), 'utf8')
}

test('通知详情票据与时间判定为纯函数', () => {
  assert.equal(isValidNotificationToken('a'.repeat(43)), true)
  assert.equal(isValidNotificationToken('short'), false)
  assert.equal(isValidNotificationToken('bad/token'), false)
  assert.equal(isPublicExpired('2026-10-21 10:00:00', new Date('2026/10/21 10:00:00')), true)
  assert.equal(isPublicExpired('2026-10-21 10:00:00', new Date('2026/10/21 09:59:59')), false)
  assert.equal(formatRemaining('2026-10-21 10:00:00', new Date('2026/10/21 09:59:01')), '00:59')
  assert.equal(formatRemaining('2026-10-21 10:00:00', new Date('2026/10/21 09:00:00')), '01:00:00')
  assert.equal(formatRemaining('2026-10-21 10:00:00', new Date('2026/10/21 10:00:00')), '已过期')
  assert.equal(serverTimeOffset('2026-10-21 10:00:00', new Date('2026/10/21 09:59:00')), 60000)
})

test('登录回跳只接受站内路径，避免开放重定向', () => {
  assert.equal(buildLoginRedirect('/notification/detail/abc'), '/login?redirect=%2Fnotification%2Fdetail%2Fabc')
  assert.equal(buildLoginRedirect('//evil.example.com'), '/login?redirect=%2F')
  assert.equal(buildLoginRedirect('https://evil.example.com'), '/login?redirect=%2F')
})

test('通知 API 使用统一请求器、幂等关闭 session 缓存、公共详情跳过全局登录弹窗', () => {
  const channel = read('src/api/notification/channel.js')
  const credential = read('src/api/notification/credential.js')
  const record = read('src/api/notification/record.js')
  const publicApi = read('src/api/notification/public.js')

  assert.match(channel, /url: '\/notification\/channel\/list'/)
  assert.match(channel, /url: '\/notification\/channel\/options'/)
  assert.match(channel, /url: '\/notification\/channel\/detail-url'/)
  assert.match(channel, /method: 'put'/)
  assert.match(channel, /data: \{ url \}/)
  assert.match(credential, /url: '\/notification\/credential\/list'/)
  assert.match(credential, /url: '\/notification\/credential\/' \+ credentialId \+ '\/reset'/)
  assert.match(record, /url: '\/notification\/record\/list'/)
  assert.match(record, /url: '\/notification\/record\/' \+ recordId \+ '\/retry'/)
  assert.match(record, /url: '\/notification\/record\/' \+ recordId \+ '\/revoke'/)

  assert.ok((channel.match(/repeatSubmit: false/g) || []).length >= 4)
  assert.ok((credential.match(/repeatSubmit: false/g) || []).length >= 4)
  assert.ok((record.match(/repeatSubmit: false/g) || []).length >= 3)
  assert.match(publicApi, /skipAuthHandler: true/)
  assert.match(publicApi, /encodeURIComponent\(token\)/)
  assert.doesNotMatch(publicApi, /localhost|https?:\/\/[^']*/)
  assert.doesNotMatch(channel + credential + record + publicApi, /sessionStorage|localStorage/)
})

test('渠道 provider 标签、摘要、详情字段集中扩展且不泄漏密钥', () => {
  assert.equal(providerLabel('WECOM_APP'), '企业微信应用')
  assert.equal(providerLabel('FUTURE_PROVIDER'), '未知类型')

  const channel = {
    provider: 'WECOM_APP',
    agentId: 1000002,
    toUser: 'u1|u2',
    corpId: 'corp-hidden',
    secretConfigured: true,
    secret: 'plain-secret',
    secretCipher: 'cipher'
  }
  assert.equal(providerSummary(channel), '应用1000002 · 接收2人 · 密钥已配置')
  assert.equal(providerSummary({ ...channel, toUser: '@all' }), '应用1000002 · 接收全体成员 · 密钥已配置')
  assert.equal(providerSummary({ ...channel, provider: 'FUTURE_PROVIDER' }), '暂不支持的渠道类型')

  const fields = providerDetailFields(channel)
  assert.ok(fields.some(field => field.label === 'CorpID' && field.value === 'corp-hidden'))
  assert.ok(fields.some(field => field.label === 'AgentID' && field.value === 1000002))
  assert.ok(fields.some(field => field.label === '接收 UserID' && field.value === 'u1、u2'))
  assert.ok(fields.some(field => field.label === 'Secret 状态' && field.value === '已配置'))
  assert.doesNotMatch(JSON.stringify(fields), /plain-secret|cipher/)
  assert.equal(detailUrlSourceLabel('DATABASE'), '页面设置')
  assert.equal(detailUrlSourceLabel('CONFIG'), '配置文件回退')
})

test('统一详情页地址校验与后端规则一致', () => {
  assert.deepEqual(normalizeDetailBaseUrl('https://hub.example.com/'), {
    valid: true,
    value: 'https://hub.example.com',
    error: ''
  })
  assert.equal(normalizeDetailBaseUrl('https://hub.example.com/app/').value, 'https://hub.example.com/app')
  assert.equal(normalizeDetailBaseUrl('http://localhost:8080/').value, 'http://localhost:8080')
  assert.equal(normalizeDetailBaseUrl('http://127.0.0.1:8081/sub').value, 'http://127.0.0.1:8081/sub')
  assert.equal(normalizeDetailBaseUrl('http://[::1]:8080').valid, true)

  for (const value of [
    '',
    '   ',
    'http://hub.example.com',
    'ftp://hub.example.com',
    'https://user:pass@hub.example.com',
    'https://hub.example.com?a=1',
    'https://hub.example.com#part',
    'https://hub.example.com/a b',
    `https://hub.example.com/${'a'.repeat(500)}`
  ]) {
    assert.equal(normalizeDetailBaseUrl(value).valid, false, `应拒绝：${value}`)
  }
})

test('渠道页通用表头、详情抽屉与地址卡片使用集中渲染', () => {
  const page = read('src/views/notification/channel/index.vue')
  assert.match(page, /label="渠道名称"/)
  assert.match(page, /label="路径编码"/)
  assert.match(page, /label="通知方式"/)
  assert.match(page, /label="配置摘要"/)
  assert.match(page, /label="更新时间"/)
  assert.match(page, /providerLabel\(scope\.row\.provider\)/)
  assert.match(page, /providerSummary\(scope\.row\)/)
  assert.doesNotMatch(page, /label="CorpID" prop="corpId" min-width/)
  assert.match(page, /<el-drawer/)
  assert.match(page, /providerDetailFields/)
  assert.match(page, /getDetailUrl/)
  assert.match(page, /updateDetailUrl/)
  assert.match(page, /保存后立即生效，仅影响后续新通知/)
  assert.doesNotMatch(page, /localStorage|sessionStorage/)
})

test('详情隐藏路由精确放行且不触发后台菜单初始化', () => {
  const router = read('src/router/index.js')
  const permission = read('src/permission.js')
  const request = read('src/utils/request.js')

  assert.match(router, /path: '\/notification\/detail\/:token'/)
  assert.match(router, /views\/notification\/detail\/index\.vue/)
  assert.match(permission, /publicNotificationDetailPattern/)
  assert.ok(permission.includes('publicNotificationDetailPattern = /^\\/notification\\/detail\\/[A-Za-z0-9_-]+$/'))
  const guardIndex = permission.indexOf('publicNotificationDetailPattern.test(to.path)')
  const tokenIndex = permission.indexOf('if (getToken())')
  assert.ok(guardIndex >= 0 && guardIndex < tokenIndex, '公开详情放行必须发生在 token/菜单初始化之前')
  assert.match(request, /res\.config\.skipAuthHandler === true/)
  assert.match(request, /Promise\.reject\(res\.data\)/)
})

test('通知 SQL 幂等建表、菜单组件真实存在、图标均为现有 SVG', () => {
  const sql = readFileSync(fileURLToPath(new URL('../server/sql/20261021_add_notification_center.sql', root)), 'utf8')
  assert.match(sql, /START TRANSACTION/)
  assert.match(sql, /COMMIT/)
  for (const table of ['notification_channel', 'notification_credential', 'notification_record', 'notification_record_channel']) {
    assert.match(sql, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`))
  }
  assert.doesNotMatch(sql, /\b(DROP|TRUNCATE)\b/i)
  assert.doesNotMatch(sql, /\bDELETE\b/i)

  assert.ok(sql.includes("'通知中心'"))
  assert.ok(sql.includes("'notification/channel/index'"))
  assert.ok(sql.includes("'notification/credential/index'"))
  assert.ok(sql.includes("'notification/record/index'"))
  assert.ok(sql.includes("'notification:record:query'"))
  assert.ok(sql.includes("'notification:credential:reset'"))

  const migration = readFileSync(fileURLToPath(new URL('../server/sql/20261022_notification_detail_url.sql', root)), 'utf8')
  assert.match(migration, /information_schema\.COLUMNS/)
  assert.match(migration, /PREPARE/)
  assert.match(migration, /detail_base_url varchar\(500\)/)
  assert.match(migration, /notification\.publicBaseUrl/)
  assert.match(migration, /WHERE NOT EXISTS/)
  assert.doesNotMatch(migration, /\b(DROP|TRUNCATE|DELETE)\b/i)
  assert.doesNotMatch(migration, /https?:\/\//)

  for (const component of ['notification/channel/index', 'notification/credential/index', 'notification/record/index']) {
    const file = new URL(`src/views/${component}.vue`, root)
    assert.ok(existsSync(fileURLToPath(file)), `动态 component 对应页面不存在：${component}`)
  }

  const icons = new Set(readdirSync(fileURLToPath(new URL('src/assets/icons/svg', root)))
    .filter((name) => name.endsWith('.svg'))
    .map((name) => name.slice(0, -4)))
  for (const icon of ['message', 'link', 'password', 'log']) {
    assert.ok(icons.has(icon), `缺少现有 SVG 图标：${icon}`)
  }
  assert.ok(sql.includes("'message'"))
  assert.ok(sql.includes("'link'"))
  assert.ok(sql.includes("'password'"))
  assert.ok(sql.includes("'log'"))
})

test('Markdown 渲染配置禁用原始 HTML、脚本、危险 URL 与外部图片', () => {
  const source = read('src/utils/notification/markdown.js')
  const sourceRenderer = read('src/utils/notification/markdown-source.js')
  assert.match(sourceRenderer, /renderer\.html = \(\) => ''/)
  assert.match(source, /'script'/)
  assert.match(source, /'iframe'/)
  assert.match(source, /'img'/)
  assert.match(source, /ALLOWED_URI_REGEXP: \/\^\(\?:\(\?:https\?\|mailto\|tel\):\)\/i/)
  assert.match(source, /FORBID_TAGS/)
  assert.match(source, /rel', 'noopener noreferrer'/)
  assert.match(source, /DOMPurify\.sanitize/)
})

test('Markdown 原始 HTML 在净化前即被丢弃', () => {
  const html = renderNotificationMarkdownSource('# 标题\n\n<script>alert(1)</script>\n\n<img src=x onerror=alert(2)>')
  assert.match(html, /<h1>标题<\/h1>/)
  assert.doesNotMatch(html, /<script/i)
  assert.doesNotMatch(html, /<img/i)
})

test('公共详情页不持久化正文、卸载/切换清空且到期清除已渲染内容', () => {
  const page = read('src/views/notification/detail/index.vue')
  assert.doesNotMatch(page, /localStorage|sessionStorage/)
  assert.match(page, /onBeforeUnmount/)
  assert.match(page, /clearRendered\(\)/)
  assert.match(page, /isPublicExpired\(record\.value\.expiresAt/)
  assert.match(page, /state\.value = 'login'/)
  assert.match(page, /v-html="safeHtml"/)
  assert.match(page, /authFailed\.value = true/)
  assert.match(page, /if \(authFailed\.value\) \{\s*removeToken\(\)/)
  assert.doesNotMatch(page, /请勿转发链接/)
  assert.match(page, /普通浏览器需登录后/)
  assert.match(page, /name', 'referrer'/)
  assert.match(page, /content', 'no-referrer'/)
})
