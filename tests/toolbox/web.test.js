import test from 'node:test'
import assert from 'node:assert/strict'
import {
  generateMetaTags,
  isHttpUrl,
  parseSafeLinks,
  parseUrl,
  parseUserAgent
} from '../../src/utils/toolbox/web.js'

test('URL 解析保留重复查询参数并标记非 http 协议', () => {
  const parsed = parseUrl('https://example.com:8443/path?a=1&a=2&q=%E4%BD%A0%E5%A5%BD#part')
  assert.equal(parsed.protocol, 'https:')
  assert.equal(parsed.port, '8443')
  assert.deepEqual(parsed.params, [
    { name: 'a', value: '1' },
    { name: 'a', value: '2' },
    { name: 'q', value: '你好' }
  ])
  assert.equal(parsed.hash, '#part')
  assert.equal(parsed.isHttp, true)
  const mailto = parseUrl('mailto:a@example.com')
  assert.equal(mailto.isHttp, false)
  assert.throws(() => parseUrl('not a url'), /格式不合法/)
  assert.equal(isHttpUrl('https://a.com'), true)
  assert.equal(isHttpUrl('javascript:alert(1)'), false)
})

test('Safe Links 只解析 url 参数，不访问目标', () => {
  const target = 'https://example.com/path?q=hello%20world'
  const result = parseSafeLinks(
    `https://nam12.safelinks.protection.outlook.com/?url=${encodeURIComponent(target)}&data=abc&reserved=0`
  )
  assert.equal(result.target, target)
  assert.equal(result.safeLinksHost, 'nam12.safelinks.protection.outlook.com')
  assert.equal(result.hasDataParam, true)
  assert.ok(result.warnings.some((item) => item.includes('data')))
  assert.throws(() => parseSafeLinks('https://x.test/?data=abc'), /未找到/)
  assert.throws(
    () => parseSafeLinks(`https://x.test/?url=${encodeURIComponent('javascript:alert(1)')}`),
    /只允许 http/
  )
  assert.throws(() => parseSafeLinks('not a url'), /格式不合法/)
})

test('Meta 标签生成会转义属性并校验绝对 URL', () => {
  const html = generateMetaTags({
    title: 'A < B',
    description: '引号"与<标签>',
    canonical: 'https://example.com/a?b=1&c=2',
    ogImage: 'https://example.com/a.png',
    twitterCard: 'summary_large_image'
  })
  assert.match(html, /<title>A &lt; B<\/title>/)
  assert.match(html, /content="引号&quot;与&lt;标签&gt;"/)
  assert.match(html, /rel="canonical" href="https:\/\/example.com\/a\?b=1&amp;c=2"/)
  assert.match(html, /twitter:card/)
  assert.throws(() => generateMetaTags({ canonical: 'javascript:alert(1)' }), /必须是 http/)
})

test('UA 解析返回浏览器、系统与设备结构', () => {
  const result = parseUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
  )
  assert.match(result.browser.name, /Chrome/)
  assert.equal(result.os.name, 'Windows')
  assert.equal(result.engine.name, 'Blink')
  assert.throws(() => parseUserAgent('  '), /请输入/)
})
