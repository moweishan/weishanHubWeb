<template>
  <ToolPage
    title="图片转 PDF"
    description="把多张 JPG、PNG、WebP 按指定顺序合成多页 PDF。WebP 会先在本地转为 PNG 再嵌入；等比居中，不拉伸。"
    category="files"
  >
    <div class="toolbox-panel">
      <MultiFileDrop
        v-model="selectedFiles"
        label="选择 JPG / PNG / WebP"
        accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
        :max-mb="25"
        :max-files="30"
        hint="支持多选，最多 30 张，单张不超过 25 MB；可拖动下方卡片调整顺序。"
      />

      <el-form label-position="top" class="toolbox-form" style="margin-top: 16px">
        <el-row :gutter="14">
          <el-col :xs="24" :sm="6">
            <el-form-item label="纸张">
              <el-select v-model="paper" class="toolbox-field-full">
                <el-option label="A4" value="a4" />
                <el-option label="Letter" value="letter" />
                <el-option label="按图片尺寸" value="image" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="6">
            <el-form-item label="方向">
              <el-select v-model="orientation" class="toolbox-field-full" :disabled="paper === 'image'">
                <el-option label="纵向" value="portrait" />
                <el-option label="横向" value="landscape" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="6">
            <el-form-item label="边距（mm）">
              <el-input-number v-model="marginMm" :min="0" :max="50" class="toolbox-field-full" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="6">
            <el-form-item label="操作">
              <div class="toolbox-inline">
                <el-button type="primary" icon="Document" :loading="building" :disabled="!items.length" @click="buildPdf">
                  生成 PDF
                </el-button>
                <el-button icon="Delete" @click="clearAll">清空</el-button>
              </div>
            </el-form-item>
          </el-col>
        </el-row>
        <p class="toolbox-hint">
          图片等比缩放到可用区域并居中，不裁切；按图片尺寸时页面由图片尺寸加边距决定。最多 30 页，单张源图 40 MP，总源图 120 MP。
        </p>
      </el-form>
    </div>

    <div v-if="items.length" class="toolbox-panel">
      <h3 class="toolbox-panel__title"><el-icon><Sort /></el-icon>页面顺序（{{ items.length }}），拖动调整</h3>
      <draggable v-model="items" item-key="key" handle=".drag-handle" class="toolbox-pdf-image-list">
        <template #item="{ element, index }">
          <div class="toolbox-pdf-image-card">
            <span class="drag-handle" title="拖动排序"><el-icon><Rank /></el-icon></span>
            <img :src="element.previewUrl" :alt="element.name" class="toolbox-pdf-image-thumb" />
            <div class="toolbox-pdf-image-meta">
              <strong>{{ index + 1 }}. {{ element.name }}</strong>
              <span>{{ element.width && element.height ? `${element.width}×${element.height}` : '读取中…' }}</span>
              <span v-if="element.kind === 'webp'" class="toolbox-meta">已在本机转为 PNG 后嵌入</span>
              <span v-if="element.error" class="toolbox-error-text">{{ element.error }}</span>
            </div>
            <el-button link type="danger" icon="Delete" @click="removeItem(index)">移除</el-button>
          </div>
        </template>
      </draggable>
    </div>

    <div v-if="resultUrl" class="toolbox-panel">
      <div class="toolbox-inline">
        <el-tag type="success">PDF 已生成</el-tag>
        <el-button type="success" icon="Download" @click="downloadPdf">下载 PDF</el-button>
        <span class="toolbox-meta">{{ resultSize ? formatBytes(resultSize) : '' }}</span>
      </div>
    </div>

    <el-alert v-if="error" type="error" :closable="false" show-icon :title="error" />
  </ToolPage>
</template>

<script setup>
import { PDFDocument } from 'pdf-lib'
import draggable from 'vuedraggable'
import ToolPage from '@/components/Toolbox/ToolPage.vue'
import MultiFileDrop from '@/components/Toolbox/MultiFileDrop.vue'
import { detectImageFormat, formatFromFilename, formatFromMime, isSupportedImageFile } from '@/utils/toolbox/image'
import { downloadBlob, formatBytes, readFileAsArrayBuffer } from '@/utils/toolbox/io'

const PAPER = {
  a4: [595.28, 841.89],
  letter: [612, 792]
}

const selectedFiles = ref([])
const items = ref([])
const paper = ref('a4')
const orientation = ref('portrait')
const marginMm = ref(10)
const building = ref(false)
const error = ref('')
const resultUrl = ref('')
const resultBlob = ref(null)
const resultSize = ref(0)
let disposed = false
let runId = 0

function fileKey(file) {
  return `${file.name}|${file.size}|${file.lastModified}`
}

async function decodeImage(file) {
  if (typeof createImageBitmap === 'function') return await createImageBitmap(file)
  return await new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('浏览器无法解码该图片'))
    }
    image.src = url
  })
}

function releaseImage(image) {
  if (image && typeof image.close === 'function') image.close()
}

async function analyzeItem(item) {
  try {
    if (!isSupportedImageFile(item.file)) throw new Error('只支持 JPG、PNG 或 WebP 图片')
    const image = await decodeImage(item.file)
    item.width = image.width || image.naturalWidth
    item.height = image.height || image.naturalHeight
    releaseImage(image)
    if (!item.width || !item.height) throw new Error('图片尺寸无效')
    if (item.width * item.height > 40 * 1000 * 1000) throw new Error('图片超过 40 MP 限制')
    item.kind = formatFromMime(item.file.type) || formatFromFilename(item.file.name)
    if (item.kind === 'webp') {
      item.embedKind = 'png'
    } else if (item.kind === 'jpeg') {
      item.embedKind = 'jpeg'
    } else if (item.kind === 'png') {
      item.embedKind = 'png'
    } else {
      throw new Error('无法识别图片格式')
    }
  } catch (err) {
    item.error = err.message
  }
}

function syncItems(files) {
  const filesByKey = new Map(files.map((file) => [fileKey(file), file]))
  const existingKeys = new Set(items.value.map((item) => item.key))
  const next = items.value.filter((item) => {
    if (filesByKey.has(item.key)) return true
    URL.revokeObjectURL(item.previewUrl)
    return false
  })
  for (const file of files) {
    const key = fileKey(file)
    if (existingKeys.has(key)) continue
    next.push({
      key,
      file,
      name: file.name,
      previewUrl: URL.createObjectURL(file),
      width: 0,
      height: 0,
      kind: '',
      embedKind: '',
      error: ''
    })
  }
  items.value = next
  const token = ++runId
  disposed = false
  for (const item of next) {
    if (!item.width && !item.error) {
      analyzeItem(item).then(() => {
        if (token !== runId || disposed) return
      })
    }
  }
}

watch(selectedFiles, (files) => {
  syncItems(files || [])
})

function removeItem(index) {
  const item = items.value[index]
  if (!item) return
  URL.revokeObjectURL(item.previewUrl)
  const key = item.key
  selectedFiles.value = selectedFiles.value.filter((file) => fileKey(file) !== key)
  items.value = items.value.filter((_, itemIndex) => itemIndex !== index)
}

async function convertWebpToPng(file) {
  const image = await decodeImage(file)
  try {
    const canvas = document.createElement('canvas')
    canvas.width = image.width || image.naturalWidth
    canvas.height = image.height || image.naturalHeight
    const context = canvas.getContext('2d')
    if (!context) throw new Error('无法创建 Canvas')
    context.drawImage(image, 0, 0)
    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob((value) => (value ? resolve(value) : reject(new Error('WebP 转 PNG 失败'))), 'image/png')
    })
    canvas.width = 0
    canvas.height = 0
    if (blob.type !== 'image/png') throw new Error('浏览器未能把 WebP 转为 PNG')
    return new Uint8Array(await blob.arrayBuffer())
  } finally {
    releaseImage(image)
  }
}

function pageSizeFor(item, marginPt, paperValue, orientationValue) {
  if (paperValue === 'image') {
    return [item.width * (72 / 96) + marginPt * 2, item.height * (72 / 96) + marginPt * 2]
  }
  const base = PAPER[paperValue]
  return orientationValue === 'portrait' ? [...base] : [base[1], base[0]]
}

async function buildPdf() {
  error.value = ''
  if (resultUrl.value) URL.revokeObjectURL(resultUrl.value)
  resultUrl.value = ''
  resultBlob.value = null
  resultSize.value = 0
  if (building.value) return
  if (!items.value.length) {
    error.value = '请先添加图片'
    return
  }
  if (items.value.some((item) => item.error)) {
    error.value = '存在无法读取的图片，请先移除后再生成'
    return
  }
  if (items.value.some((item) => !item.width || !item.height)) {
    error.value = '图片仍在读取尺寸，请稍候再生成'
    return
  }
  if (items.value.reduce((total, item) => total + item.width * item.height, 0) > 120 * 1000 * 1000) {
    error.value = '所有图片源像素合计超过 120 MP 限制，请减少图片或缩小尺寸'
    return
  }
  building.value = true
  const token = ++runId
  const renderPaper = paper.value
  const renderOrientation = orientation.value
  const renderMargin = Number(marginMm.value) || 0
  try {
    const pdf = await PDFDocument.create()
    const marginPt = renderMargin * (72 / 25.4)
    for (let index = 0; index < items.value.length; index++) {
      if (token !== runId || disposed) return
      const item = items.value[index]
      const fileBuffer = await readFileAsArrayBuffer(item.file, { maxBytes: 25 * 1024 * 1024 })
      if (token !== runId || disposed) return
      let imageBytes = new Uint8Array(fileBuffer)
      const actualFormat = detectImageFormat(imageBytes)
      if (!actualFormat) throw new Error(`第 ${index + 1} 张图片不是可识别的 PNG/JPEG/WebP 文件`)
      let embedKind = actualFormat === 'jpeg' ? 'jpeg' : 'png'
      if (actualFormat === 'webp') {
        imageBytes = await convertWebpToPng(item.file)
        embedKind = 'png'
      }
      if (token !== runId || disposed) return
      const embedded = embedKind === 'jpeg' ? await pdf.embedJpg(imageBytes) : await pdf.embedPng(imageBytes)
      const [pageWidth, pageHeight] = pageSizeFor(item, marginPt, renderPaper, renderOrientation)
      if (pageWidth <= marginPt * 2 || pageHeight <= marginPt * 2) {
        throw new Error(`第 ${index + 1} 张图片在边距设置下没有可用区域`)
      }
      const availableWidth = pageWidth - marginPt * 2
      const availableHeight = pageHeight - marginPt * 2
      const scale = Math.min(availableWidth / item.width, availableHeight / item.height)
      const drawWidth = item.width * scale
      const drawHeight = item.height * scale
      const page = pdf.addPage([pageWidth, pageHeight])
      page.drawImage(embedded, {
        x: (pageWidth - drawWidth) / 2,
        y: (pageHeight - drawHeight) / 2,
        width: drawWidth,
        height: drawHeight
      })
    }
    const bytes = await pdf.save()
    if (token !== runId || disposed) return
    const blob = new Blob([bytes], { type: 'application/pdf' })
    if (resultUrl.value) URL.revokeObjectURL(resultUrl.value)
    resultBlob.value = blob
    resultUrl.value = URL.createObjectURL(blob)
    resultSize.value = blob.size
  } catch (err) {
    error.value = err.message
  } finally {
    building.value = false
  }
}

function downloadPdf() {
  if (resultBlob.value) downloadBlob(resultBlob.value, 'images.pdf')
}

function clearAll() {
  runId++
  disposed = true
  building.value = false
  for (const item of items.value) URL.revokeObjectURL(item.previewUrl)
  items.value = []
  selectedFiles.value = []
  if (resultUrl.value) URL.revokeObjectURL(resultUrl.value)
  resultUrl.value = ''
  resultBlob.value = null
  resultSize.value = 0
  error.value = ''
}

onDeactivated(clearAll)
onBeforeUnmount(clearAll)
</script>

<style scoped>
.toolbox-pdf-image-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.toolbox-pdf-image-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  background: var(--el-bg-color);
}

.drag-handle {
  cursor: grab;
  color: var(--el-text-color-secondary);
  display: flex;
}

.toolbox-pdf-image-thumb {
  width: 64px;
  height: 48px;
  object-fit: contain;
  border-radius: 4px;
  background: var(--el-fill-color-lighter);
}

.toolbox-pdf-image-meta {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.toolbox-pdf-image-meta strong {
  color: var(--el-text-color-primary);
  font-size: 13px;
  word-break: break-all;
}

.toolbox-error-text {
  color: var(--el-color-danger);
}
</style>
