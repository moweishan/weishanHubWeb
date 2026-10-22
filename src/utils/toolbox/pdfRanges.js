/** PDF 页码范围解析与校验。纯函数，方便 Node 测试与页面复用。 */

function normalizeInput(input) {
  return String(input ?? '')
    .replace(/[，、]/g, ',')
    .replace(/[；]/g, ';')
    .trim()
}

function parseToken(token, total) {
  const text = token.trim()
  if (!text) throw new Error('页码列表中包含空项')
  const rangeMatch = /^(\d+)\s*-\s*(\d+)$/.exec(text)
  if (rangeMatch) {
    const start = Number(rangeMatch[1])
    const end = Number(rangeMatch[2])
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end)) throw new Error(`页码不合法：${text}`)
    if (start < 1 || end < 1) throw new Error(`页码必须从 1 开始：${text}`)
    if (start > end) throw new Error(`页码范围起点不能大于终点：${text}`)
    if (end > total) throw new Error(`页码 ${end} 超出总页数 ${total}`)
    return Array.from({ length: end - start + 1 }, (_, index) => start + index)
  }
  if (!/^\d+$/.test(text)) throw new Error(`无法识别页码：${text}`)
  const page = Number(text)
  if (!Number.isSafeInteger(page) || page < 1 || page > total) {
    throw new Error(`页码 ${text} 超出 1-${total}`)
  }
  return [page]
}

/**
 * 解析 1,3-5 形式的页码。
 * allowReorder=true 时保留用户输入顺序（例如提取 3,1-2）；false 时按升序规范化。
 * requireAll=true 时要求 1..total 恰好各出现一次（用于重排）。
 */
export function parsePageSelection(input, total, { allowReorder = true, requireAll = false } = {}) {
  const totalPages = Number(total)
  if (!Number.isInteger(totalPages) || totalPages < 1) throw new Error('PDF 总页数无效')
  const text = normalizeInput(input)
  if (!text) throw new Error('请输入页码，例如 1,3-5')
  const warnings = []
  const rawPages = []
  for (const token of text.split(',')) {
    rawPages.push(...parseToken(token, totalPages))
  }
  const seen = new Set()
  const pages = []
  for (const page of rawPages) {
    if (seen.has(page)) {
      warnings.push(`页码 ${page} 重复，已保留第一次出现的位置`)
      continue
    }
    seen.add(page)
    pages.push(page)
  }
  if (requireAll && pages.length !== totalPages) {
    const missing = Array.from({ length: totalPages }, (_, index) => index + 1).filter((page) => !seen.has(page))
    throw new Error(`重排必须包含全部 ${totalPages} 页，缺少：${missing.join(',')}`)
  }
  if (!allowReorder) pages.sort((a, b) => a - b)
  return {
    pages,
    normalized: pages.join(','),
    warnings,
    total: totalPages
  }
}

/** 解析拆分区间：1-2;3-4，要求组间不重复，组内顺序保留。 */
export function parseRangeGroups(input, total) {
  const text = normalizeInput(input)
  if (!text) throw new Error('请输入拆分区间，例如 1-2;3-4')
  const groups = text
    .split(';')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item, index) => {
      const parsed = parsePageSelection(item, total, { allowReorder: true })
      return { index, input: item, pages: parsed.pages, warnings: parsed.warnings }
    })
  if (!groups.length) throw new Error('至少需要一个拆分区间')
  const seen = new Map()
  for (const group of groups) {
    for (const page of group.pages) {
      if (seen.has(page)) {
        throw new Error(`拆分区间存在重复页：第 ${page} 页同时出现在第 ${seen.get(page) + 1} 组和第 ${group.index + 1} 组`)
      }
      seen.set(page, group.index)
    }
  }
  return groups
}

export function parseRotationPages(input, total) {
  const text = normalizeInput(input)
  if (!text) {
    return { pages: Array.from({ length: Number(total) }, (_, index) => index + 1), warnings: [], total: Number(total) }
  }
  return parsePageSelection(text, total, { allowReorder: true })
}

export function formatPageSelection(pages) {
  return pages.join(',')
}
