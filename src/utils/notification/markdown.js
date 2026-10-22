/**
 * 通知 Markdown 安全渲染。
 *
 * 复用现有 marked + DOMPurify：关闭原始 HTML，过滤脚本/表单/iframe/图片等标签与危险协议，
 * 链接补充 target=_blank 与 rel="noopener noreferrer"，不自动加载外部图片。
 */

import DOMPurify from 'dompurify'
import { renderNotificationMarkdownSource } from './markdown-source'

export const NOTIFICATION_MARKDOWN_CONFIG = {
  USE_PROFILES: { html: true },
  ALLOW_DATA_ATTR: false,
  FORBID_TAGS: [
    'script', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'textarea', 'select', 'option',
    'link', 'meta', 'base', 'style', 'video', 'audio', 'source', 'track', 'svg', 'math',
    'img', 'picture', 'canvas'
  ],
  FORBID_ATTR: ['style', 'srcset', 'poster', 'formaction', 'xlink:href', 'action', 'srcdoc'],
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):)/i
}

/**
 * 将通知 Markdown 渲染为可安全放入 v-html 的 HTML 片段。
 */
export function renderNotificationMarkdown(markdown) {
  const raw = renderNotificationMarkdownSource(markdown)
  const clean = DOMPurify.sanitize(String(raw), NOTIFICATION_MARKDOWN_CONFIG)
  const template = document.createElement('template')
  template.innerHTML = clean
  template.content.querySelectorAll('a').forEach((anchor) => {
    anchor.setAttribute('target', '_blank')
    anchor.setAttribute('rel', 'noopener noreferrer')
    anchor.setAttribute('referrerpolicy', 'no-referrer')
  })
  return template.innerHTML
}
