/** HTML 预览净化。仅在浏览器中调用；生成文本不做 DOM 执行。 */

import DOMPurify from 'dompurify'

const CONFIG = {
  USE_PROFILES: { html: true },
  FORBID_TAGS: [
    'script',
    'iframe',
    'object',
    'embed',
    'form',
    'input',
    'button',
    'textarea',
    'select',
    'option',
    'link',
    'meta',
    'base',
    'style',
    'video',
    'audio',
    'source',
    'track',
    'svg',
    'math',
    'img',
    'picture',
    'canvas'
  ],
  FORBID_ATTR: ['style', 'srcset', 'poster', 'formaction', 'xlink:href', 'action', 'srcdoc'],
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):)/i
}

/** 返回可安全放入 sandbox iframe 的 HTML 片段。 */
export function sanitizeHtml(input) {
  const clean = DOMPurify.sanitize(String(input ?? ''), CONFIG)
  const template = document.createElement('template')
  template.innerHTML = clean
  template.content.querySelectorAll('a').forEach((anchor) => {
    anchor.setAttribute('target', '_blank')
    anchor.setAttribute('rel', 'noopener noreferrer')
  })
  return template.innerHTML
}

/** 预览文档：无脚本 sandbox + CSP 双重限制，外链资源不会被加载。 */
export function buildPreviewDocument(html, { title = 'HTML 预览' } = {}) {
  const safe = sanitizeHtml(html)
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'">
<title>${escapeHtml(title)}</title>
<style>
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;line-height:1.65;padding:16px;color:#303133;word-break:break-word}
a{color:#409eff}
pre{white-space:pre-wrap;word-break:break-word;background:#f5f7fa;padding:12px;border-radius:6px}
</style>
</head>
<body>${safe}</body>
</html>`
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
