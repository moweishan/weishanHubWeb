/** Web 相关：URL 解析、Meta 标签、Safe Links 与 UA 包装。 */

import { UAParser } from 'ua-parser-js'

const HTTP_PROTOCOLS = new Set(['http:', 'https:'])

export function isHttpUrl(value) {
  try {
    return HTTP_PROTOCOLS.has(new URL(value).protocol)
  } catch {
    return false
  }
}

export function parseUrl(input) {
  const text = String(input ?? '').trim()
  if (!text) throw new Error('请输入 URL')
  let url
  try {
    url = new URL(text)
  } catch {
    throw new Error('URL 格式不合法，请包含协议，例如 https://example.com/path?q=1')
  }
  const params = []
  for (const [name, value] of url.searchParams.entries()) params.push({ name, value })
  return {
    href: url.href,
    protocol: url.protocol,
    username: url.username,
    password: url.password,
    host: url.host,
    hostname: url.hostname,
    port: url.port,
    origin: url.origin,
    pathname: url.pathname,
    search: url.search,
    hash: url.hash,
    params,
    isHttp: HTTP_PROTOCOLS.has(url.protocol)
  }
}

function escapeAttribute(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function escapeText(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function optionalUrl(value, label) {
  const text = String(value ?? '').trim()
  if (!text) return ''
  if (!isHttpUrl(text)) throw new Error(`${label} 必须是 http(s) 绝对地址`)
  return text
}

export function generateMetaTags(fields = {}) {
  const title = String(fields.title ?? '').trim()
  const description = String(fields.description ?? '').trim()
  const lines = []
  if (title) lines.push(`<title>${escapeText(title)}</title>`)
  const simple = {
    description,
    keywords: fields.keywords,
    author: fields.author,
    robots: fields.robots,
    'theme-color': fields.themeColor
  }
  for (const [name, value] of Object.entries(simple)) {
    if (String(value ?? '').trim()) {
      lines.push(`<meta name="${name}" content="${escapeAttribute(value)}" />`)
    }
  }
  const canonical = optionalUrl(fields.canonical, 'Canonical')
  if (canonical) lines.push(`<link rel="canonical" href="${escapeAttribute(canonical)}" />`)
  const og = [
    ['og:title', fields.ogTitle || title],
    ['og:description', fields.ogDescription || description],
    ['og:type', fields.ogType || 'website'],
    ['og:url', fields.ogUrl],
    ['og:image', fields.ogImage],
    ['og:site_name', fields.siteName]
  ]
  for (const [property, value] of og) {
    const text = String(value ?? '').trim()
    if (!text) continue
    if (['og:url', 'og:image'].includes(property)) optionalUrl(text, property)
    lines.push(`<meta property="${property}" content="${escapeAttribute(text)}" />`)
  }
  const twitter = [
    ['twitter:card', fields.twitterCard || (fields.twitterImage ? 'summary_large_image' : 'summary')],
    ['twitter:title', fields.twitterTitle || title],
    ['twitter:description', fields.twitterDescription || description],
    ['twitter:image', fields.twitterImage]
  ]
  for (const [name, value] of twitter) {
    const text = String(value ?? '').trim()
    if (!text) continue
    if (name === 'twitter:image') optionalUrl(text, name)
    lines.push(`<meta name="${name}" content="${escapeAttribute(text)}" />`)
  }
  if (!lines.length) throw new Error('至少填写一个 Meta 字段')
  return lines.join('\n')
}

/**
 * 只解析 Microsoft Safe Links 的受支持 url 参数。
 * 不访问任何第三方网址，也不解析 data 等未支持参数。
 */
export function parseSafeLinks(input) {
  const text = String(input ?? '').trim()
  if (!text) throw new Error('请输入 Safe Links 地址')
  let safeUrl
  try {
    safeUrl = new URL(text)
  } catch {
    throw new Error('Safe Links 地址格式不合法')
  }
  if (!HTTP_PROTOCOLS.has(safeUrl.protocol)) throw new Error('只支持 http(s) Safe Links 地址')
  let targetValue = safeUrl.searchParams.get('url')
  if (!targetValue) {
    for (const [name, value] of safeUrl.searchParams.entries()) {
      if (name.toLowerCase() === 'url') {
        targetValue = value
        break
      }
    }
  }
  if (!targetValue) throw new Error('未找到受支持的 url 参数，本工具不解析其他参数')
  let target
  try {
    target = new URL(targetValue)
  } catch {
    throw new Error('url 参数解码后不是合法 URL')
  }
  if (!HTTP_PROTOCOLS.has(target.protocol)) throw new Error('url 参数只允许 http(s) 地址')
  const warnings = []
  if (target.username || target.password) warnings.push('目标 URL 含有用户名或密码，请谨慎处理。')
  if (safeUrl.hostname === target.hostname) warnings.push('目标主机与 Safe Links 主机相同，请确认是否被再次包装。')
  for (const [name] of safeUrl.searchParams.entries()) {
    if (name.toLowerCase() === 'url') continue
    if (['data', 'sdata', 'reserved'].includes(name.toLowerCase())) {
      warnings.push(`未解析受支持列表之外的参数：${name}`)
    } else {
      warnings.push(`忽略未支持参数：${name}`)
    }
  }
  return {
    safeLinksHost: safeUrl.host,
    target: target.href,
    targetHost: target.host,
    targetProtocol: target.protocol,
    targetPath: `${target.pathname}${target.search}${target.hash}`,
    isHttp: true,
    hasDataParam: safeUrl.searchParams.has('data'),
    warnings
  }
}

export function parseUserAgent(userAgent) {
  const text = String(userAgent ?? '')
  if (!text.trim()) throw new Error('请输入 User-Agent')
  const result = new UAParser(text).getResult()
  return {
    ua: text,
    browser: {
      name: result.browser.name || '未知',
      version: result.browser.version || '未知',
      major: result.browser.major || ''
    },
    engine: {
      name: result.engine.name || '未知',
      version: result.engine.version || '未知'
    },
    os: {
      name: result.os.name || '未知',
      version: result.os.version || '未知'
    },
    device: {
      vendor: result.device.vendor || '未知',
      model: result.device.model || '未知',
      type: result.device.type || 'desktop / 未识别'
    },
    cpu: {
      architecture: result.cpu.architecture || '未知'
    }
  }
}
