/** 图片处理公共限制与尺寸计算。浏览器编码部分在组件中完成。 */

export const IMAGE_LIMITS = Object.freeze({
  maxFiles: 20,
  maxFileMB: 25,
  maxSourcePixels: 40 * 1000 * 1000,
  maxOutputPixels: 40 * 1000 * 1000,
  maxBatchOutputPixels: 200 * 1000 * 1000,
  maxDimension: 12000
})

export const IMAGE_FORMATS = Object.freeze({
  png: { label: 'PNG', mime: 'image/png', extension: 'png', supportsQuality: false, transparent: true },
  jpeg: { label: 'JPEG', mime: 'image/jpeg', extension: 'jpg', supportsQuality: true, transparent: false },
  webp: { label: 'WebP', mime: 'image/webp', extension: 'webp', supportsQuality: true, transparent: true }
})

export function formatFromMime(mime) {
  const value = String(mime || '').toLowerCase()
  if (value === 'image/png') return 'png'
  if (value === 'image/jpeg' || value === 'image/jpg') return 'jpeg'
  if (value === 'image/webp') return 'webp'
  return ''
}

export function formatFromFilename(name) {
  const extension = String(name || '').toLowerCase().split('.').pop()
  if (extension === 'png') return 'png'
  if (extension === 'jpg' || extension === 'jpeg') return 'jpeg'
  if (extension === 'webp') return 'webp'
  return ''
}

export function outputMime(format) {
  const meta = IMAGE_FORMATS[format]
  if (!meta) throw new Error(`不支持的输出格式：${format}`)
  return meta.mime
}

export function outputExtension(format) {
  const meta = IMAGE_FORMATS[format]
  if (!meta) throw new Error(`不支持的输出格式：${format}`)
  return meta.extension
}

export function parsePositiveDimension(value, label) {
  if (value === '' || value === null || value === undefined) return null
  const number = Number(value)
  if (!Number.isInteger(number) || number < 1) throw new Error(`${label}必须是正整数或留空`)
  if (number > IMAGE_LIMITS.maxDimension) throw new Error(`${label}不能超过 ${IMAGE_LIMITS.maxDimension}px`)
  return number
}

/**
 * 计算输出尺寸。keepRatio 时 width/height 作为边界做 contain，不拉伸、不裁切。
 */
export function calculateOutputSize(sourceWidth, sourceHeight, { width = null, height = null, keepRatio = true } = {}) {
  const sw = Number(sourceWidth)
  const sh = Number(sourceHeight)
  if (!Number.isInteger(sw) || sw < 1 || !Number.isInteger(sh) || sh < 1) throw new Error('源图片尺寸无效')
  if (sw * sh > IMAGE_LIMITS.maxSourcePixels) {
    throw new Error(`源图片 ${sw}×${sh} 超过 ${IMAGE_LIMITS.maxSourcePixels} 像素上限`)
  }
  let targetWidth = width
  let targetHeight = height
  if (!targetWidth && !targetHeight) {
    targetWidth = sw
    targetHeight = sh
  } else if (keepRatio) {
    if (targetWidth && targetHeight) {
      const scale = Math.min(targetWidth / sw, targetHeight / sh)
      targetWidth = Math.max(1, Math.round(sw * scale))
      targetHeight = Math.max(1, Math.round(sh * scale))
    } else if (targetWidth) {
      targetHeight = Math.max(1, Math.round((sh * targetWidth) / sw))
    } else {
      targetWidth = Math.max(1, Math.round((sw * targetHeight) / sh))
    }
  } else {
    targetWidth = targetWidth || sw
    targetHeight = targetHeight || sh
  }
  if (targetWidth > IMAGE_LIMITS.maxDimension || targetHeight > IMAGE_LIMITS.maxDimension) {
    throw new Error(`输出尺寸 ${targetWidth}×${targetHeight} 超过 ${IMAGE_LIMITS.maxDimension}px 上限`)
  }
  if (targetWidth * targetHeight > IMAGE_LIMITS.maxOutputPixels) {
    throw new Error(`输出尺寸 ${targetWidth}×${targetHeight} 超过 ${IMAGE_LIMITS.maxOutputPixels} 像素上限`)
  }
  return { width: targetWidth, height: targetHeight }
}

export function baseName(filename) {
  return String(filename || 'image').replace(/\.[^.]+$/, '').replace(/[\\/:*?"<>|]+/g, '_').slice(0, 100) || 'image'
}

export function outputFilename(filename, format, suffix = '') {
  return `${baseName(filename)}${suffix}.${outputExtension(format)}`
}

/** 在单次转换批次中生成确定性唯一输出名，避免 ZIP 同名覆盖。 */
export function createUniqueOutputName(filename, format, used = new Set()) {
  const extension = outputExtension(format)
  const stem = baseName(filename)
  let candidate = `${stem}.${extension}`
  let suffix = 2
  while (used.has(candidate)) {
    candidate = `${stem}_${suffix++}.${extension}`
  }
  used.add(candidate)
  return candidate
}

export function isSupportedImageFile(file) {
  const mime = String(file?.type || '').toLowerCase()
  if (['image/png', 'image/jpeg', 'image/webp'].includes(mime)) return true
  return ['png', 'jpg', 'jpeg', 'webp'].includes(formatFromFilename(file?.name))
}

/** 读取文件头判断真实图片格式，避免仅凭扩展名/MIME 误判。 */
export function detectImageFormat(bytes) {
  const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || [])
  if (
    data.length >= 8 &&
    data[0] === 0x89 &&
    data[1] === 0x50 &&
    data[2] === 0x4e &&
    data[3] === 0x47 &&
    data[4] === 0x0d &&
    data[5] === 0x0a &&
    data[6] === 0x1a &&
    data[7] === 0x0a
  ) {
    return 'png'
  }
  if (data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return 'jpeg'
  if (
    data.length >= 12 &&
    data[0] === 0x52 &&
    data[1] === 0x49 &&
    data[2] === 0x46 &&
    data[3] === 0x46 &&
    data[8] === 0x57 &&
    data[9] === 0x45 &&
    data[10] === 0x42 &&
    data[11] === 0x50
  ) {
    return 'webp'
  }
  return ''
}
