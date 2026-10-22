/** PDF 页面处理核心：使用 pdf-lib 复制页面，不截图、不忽略加密。 */

import { PDFDocument, degrees } from 'pdf-lib'

function mapLoadError(error) {
  const message = String(error?.message || error)
  if (/encrypt|password|EncryptedPDFError/i.test(message)) {
    return new Error('PDF 已加密或受密码保护，本工具拒绝解密或绕过，请先移除密码后再处理。')
  }
  return new Error(`PDF 结构损坏或无法解析：${message}`)
}

export async function loadPdfDocument(bytes) {
  try {
    return await PDFDocument.load(bytes, { ignoreEncryption: false, updateMetadata: false })
  } catch (error) {
    throw mapLoadError(error)
  }
}

export async function getPdfPageCount(bytes) {
  const document = await loadPdfDocument(bytes)
  return document.getPageCount()
}

export async function mergePdfDocuments(inputs) {
  if (!Array.isArray(inputs) || inputs.length < 2) throw new Error('合并至少需要两个 PDF 文件')
  const output = await PDFDocument.create()
  for (const input of inputs) {
    const source = await loadPdfDocument(input.bytes)
    const indices = source.getPageIndices()
    if (!indices.length) throw new Error(`文件「${input.name || '未命名'}」没有页面`)
    const pages = await output.copyPages(source, indices)
    pages.forEach((page) => output.addPage(page))
  }
  return output.save()
}

export async function extractPdfPages(bytes, pages) {
  const source = await loadPdfDocument(bytes)
  const total = source.getPageCount()
  const normalized = normalizePages(pages, total)
  const output = await PDFDocument.create()
  const copied = await output.copyPages(source, normalized.map((page) => page - 1))
  copied.forEach((page) => output.addPage(page))
  return output.save()
}

export async function reorderPdfPages(bytes, pages) {
  const source = await loadPdfDocument(bytes)
  const total = source.getPageCount()
  const normalized = normalizePages(pages, total)
  if (normalized.length !== total) {
    throw new Error(`重排必须包含全部 ${total} 页，当前为 ${normalized.length} 页`)
  }
  const seen = new Set(normalized)
  if (seen.size !== total || normalized.some((page) => page < 1 || page > total)) {
    throw new Error('重排页码必须覆盖 1 到总页数且不能重复')
  }
  const output = await PDFDocument.create()
  const copied = await output.copyPages(source, normalized.map((page) => page - 1))
  copied.forEach((page) => output.addPage(page))
  return output.save()
}

export async function rotatePdfPages(bytes, pages, angle) {
  const rotation = Number(angle)
  if (![90, 180, 270].includes(rotation)) throw new Error('旋转角度只支持 90、180、270 度')
  const document = await loadPdfDocument(bytes)
  const total = document.getPageCount()
  const normalized = normalizePages(pages, total)
  for (const pageNumber of normalized) {
    const page = document.getPage(pageNumber - 1)
    const current = page.getRotation().angle || 0
    page.setRotation(degrees((current + rotation) % 360))
  }
  return document.save()
}

export async function splitPdfGroups(bytes, groups) {
  if (!Array.isArray(groups) || !groups.length) throw new Error('至少需要一个拆分区间')
  const source = await loadPdfDocument(bytes)
  const total = source.getPageCount()
  const results = []
  for (let index = 0; index < groups.length; index++) {
    const normalized = normalizePages(groups[index].pages, total)
    const output = await PDFDocument.create()
    const copied = await output.copyPages(source, normalized.map((page) => page - 1))
    copied.forEach((page) => output.addPage(page))
    results.push({
      index,
      pages: normalized,
      bytes: await output.save()
    })
  }
  return results
}

export function normalizePages(pages, total) {
  if (!Array.isArray(pages) || !pages.length) throw new Error('页码列表为空')
  const size = Number(total)
  if (!Number.isInteger(size) || size < 1) throw new Error('PDF 总页数无效')
  const normalized = pages.map((page) => {
    const value = Number(page)
    if (!Number.isInteger(value) || value < 1 || value > size) {
      throw new Error(`页码 ${page} 超出 1-${size}`)
    }
    return value
  })
  if (new Set(normalized).size !== normalized.length) throw new Error('页码不能重复')
  return normalized
}
