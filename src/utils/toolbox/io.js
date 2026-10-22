/** 浏览器侧复制、下载与本地文件读取辅助。不上传文件。 */

export async function copyText(text) {
  const value = String(text ?? '')
  if (!value) throw new Error('没有可复制的内容')
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(value)
      return true
    } catch {
      // 某些浏览器/权限环境会拒绝剪贴板 API，继续使用兼容方案。
    }
  }
  const textarea = document.createElement('textarea')
  textarea.value = value
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  textarea.style.left = '-9999px'
  document.body.appendChild(textarea)
  textarea.select()
  textarea.setSelectionRange(0, value.length)
  let ok = false
  try {
    ok = document.execCommand('copy')
  } catch {
    ok = false
  } finally {
    textarea.remove()
  }
  if (!ok) throw new Error('复制失败，请手动选择文本')
  return true
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = sanitizeFilename(filename)
  anchor.rel = 'noopener'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function downloadText(text, filename = 'toolbox.txt', mime = 'text/plain;charset=utf-8') {
  downloadBlob(new Blob([String(text ?? '')], { type: mime }), filename)
}

export function downloadBase64(base64, filename, mime = 'application/octet-stream') {
  const binary = atob(String(base64).replace(/\s+/g, ''))
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index)
  downloadBlob(new Blob([bytes], { type: mime }), filename)
}

export function sanitizeFilename(name) {
  return (
    String(name || 'toolbox')
      .replace(/[\\/:*?"<>|]+/g, '_')
      .replace(/^\.+/, '')
      .slice(0, 180) || 'toolbox'
  )
}

export function readFileAsArrayBuffer(file, { maxBytes = 20 * 1024 * 1024 } = {}) {
  if (!(file instanceof Blob)) return Promise.reject(new Error('请选择文件'))
  if (file.size > maxBytes) {
    return Promise.reject(new Error(`文件过大，当前上限为 ${formatBytes(maxBytes)}`))
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('读取文件失败'))
    reader.readAsArrayBuffer(file)
  })
}

export function readFileAsText(file, options = {}) {
  return readFileAsArrayBuffer(file, options).then((buffer) => {
    try {
      return new TextDecoder('utf-8', { fatal: true }).decode(buffer)
    } catch {
      throw new Error('文件不是合法的 UTF-8 文本')
    }
  })
}

export function formatBytes(bytes) {
  const value = Number(bytes)
  if (!Number.isFinite(value) || value < 0) return '-'
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  return `${(value / 1024 / 1024).toFixed(2)} MB`
}

export function guessFilenameFromMime(mime, fallback = 'download') {
  const map = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'application/pdf': 'pdf',
    'application/zip': 'zip',
    'text/plain': 'txt'
  }
  const extension = map[String(mime).toLowerCase()]
  return extension ? `${fallback}.${extension}` : `${fallback}.bin`
}
