/**
 * 通知 Markdown 的“去原始 HTML”渲染层。
 *
 * 单独拆出便于 Node 单元测试；危险 URL、脚本标签等最终仍由 DOMPurify 的配置过滤。
 */

import { marked } from 'marked'

export function renderNotificationMarkdownSource(markdown) {
  const renderer = new marked.Renderer()
  // 原始 HTML 直接丢弃，不允许脚本/图片等标签从 Markdown 透出
  renderer.html = () => ''
  return String(marked.parse(String(markdown ?? ''), {
    async: false,
    gfm: true,
    breaks: false,
    renderer
  }))
}
