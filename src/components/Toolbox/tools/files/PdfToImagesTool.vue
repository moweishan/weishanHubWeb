<template>
  <ToolPage
    title="PDF 转图片"
    description="将全部或指定 PDF 页面转换为 PNG/JPEG，支持调整清晰度、逐页预览、单张下载和 ZIP 批量下载。"
    category="files"
  >
    <div class="toolbox-panel">
      <FileDrop v-model="file" label="选择本地 PDF" accept=".pdf,application/pdf" :max-mb="60" hint="单个 PDF 不超过 60 MB；不会上传。" />
      <div class="toolbox-actions">
        <el-button type="primary" icon="Reading" :loading="loading" :disabled="!file" @click="loadPdf">载入 PDF</el-button>
        <el-button icon="Delete" @click="clearAll">清空</el-button>
      </div>
      <p class="toolbox-hint">限制：最多渲染 500 页，单页输出不超过 30 MP，总输出不超过 120 MP；超出会明确报错。</p>
    </div>

    <div v-if="pageCount" class="toolbox-panel">
      <el-form label-position="top" class="toolbox-form">
        <el-row :gutter="14">
          <el-col :xs="24" :sm="8">
            <el-form-item :label="`页码范围（总页数 ${pageCount}）`">
              <el-input v-model="pageRange" class="toolbox-mono" placeholder="例如 1,3-5；留空表示全部" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="4">
            <el-form-item label="格式">
              <el-select v-model="format" class="toolbox-field-full">
                <el-option label="PNG" value="png" />
                <el-option label="JPEG" value="jpeg" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col v-if="format === 'jpeg'" :xs="24" :sm="4">
            <el-form-item label="JPEG 质量">
              <el-input-number v-model="quality" :min="0.1" :max="1" :step="0.05" class="toolbox-field-full" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="4">
            <el-form-item label="清晰度倍率">
              <el-input-number v-model="scale" :min="0.5" :max="4" :step="0.25" class="toolbox-field-full" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="4">
            <el-form-item label="操作">
              <div class="toolbox-inline">
                <el-button type="primary" icon="Picture" :loading="rendering" @click="renderPages">渲染</el-button>
                <el-button v-if="rendering" type="danger" icon="Close" @click="cancelRender">取消</el-button>
              </div>
            </el-form-item>
          </el-col>
        </el-row>
        <el-alert v-if="rangeWarning" type="warning" :closable="false" show-icon :title="rangeWarning" />
        <p class="toolbox-hint">页面按输入顺序逐页处理；重复页码会去重并提示，越界或 5-3 倒序范围会报错。</p>
      </el-form>
    </div>

    <el-alert v-if="error" type="error" :closable="false" show-icon :title="error" />

    <div v-if="images.length" class="toolbox-panel">
      <div class="toolbox-inline" style="margin-bottom: 12px">
        <el-tag type="success">已渲染 {{ images.length }} 页</el-tag>
        <el-button type="success" size="small" icon="Download" @click="downloadZip">ZIP 批量下载</el-button>
      </div>
      <div class="toolbox-page-image-grid">
        <div v-for="item in images" :key="item.pageNumber" class="toolbox-page-image-card">
          <img :src="item.url" :alt="`第 ${item.pageNumber} 页`" loading="lazy" />
          <div class="toolbox-page-image-meta">
            <strong>第 {{ item.pageNumber }} 页</strong>
            <span>{{ item.width }}×{{ item.height }} · {{ formatBytes(item.size) }}</span>
          </div>
          <el-button size="small" icon="Download" @click="downloadOne(item)">下载</el-button>
        </div>
      </div>
    </div>
  </ToolPage>
</template>

<script setup>
import * as pdfjsLib from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { ElMessage } from 'element-plus'
import ToolPage from '@/components/Toolbox/ToolPage.vue'
import FileDrop from '@/components/Toolbox/FileDrop.vue'
import { downloadBlob, formatBytes, readFileAsArrayBuffer } from '@/utils/toolbox/io'
import { parsePageSelection } from '@/utils/toolbox/pdfRanges'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

const MAX_PAGES = 500
const MAX_PAGE_PIXELS = 30 * 1000 * 1000
const MAX_TOTAL_PIXELS = 120 * 1000 * 1000

const file = ref(null)
const loading = ref(false)
const rendering = ref(false)
const pageCount = ref(0)
const pageRange = ref('')
const format = ref('png')
const quality = ref(0.92)
const scale = ref(2)
const images = ref([])
const error = ref('')
const rangeWarning = ref('')
let pdfDocument = null
let currentRenderTask = null
let cancelRequested = false
let runId = 0
let loadToken = 0
let disposed = false

function assetBase() {
  const base = import.meta.env.BASE_URL || '/'
  return `${base.endsWith('/') ? base : `${base}/`}toolbox-generated/pdfjs/`
}

function clearImages() {
  for (const item of images.value) URL.revokeObjectURL(item.url)
  images.value = []
}

async function destroyDocument() {
  if (pdfDocument) {
    try {
      await pdfDocument.destroy()
    } catch {
      // 文档已释放或 Worker 已终止
    }
    pdfDocument = null
  }
}

async function loadPdf() {
  error.value = ''
  rangeWarning.value = ''
  disposed = false
  loading.value = true
  const token = ++loadToken
  await destroyDocument()
  clearImages()
  pageCount.value = 0
  try {
    const buffer = await readFileAsArrayBuffer(file.value, { maxBytes: 60 * 1024 * 1024 })
    if (token !== loadToken || disposed) return
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(buffer),
      cMapUrl: `${assetBase()}cmaps/`,
      cMapPacked: true,
      standardFontDataUrl: `${assetBase()}standard_fonts/`,
      wasmUrl: `${assetBase()}wasm/`,
      isEvalSupported: false
    })
    const document = await loadingTask.promise
    if (token !== loadToken || disposed) {
      await document.destroy()
      return
    }
    pdfDocument = document
    pageCount.value = document.numPages
    if (pageCount.value > MAX_PAGES) throw new Error(`PDF 共 ${pageCount.value} 页，超过 ${MAX_PAGES} 页限制`)
    pageRange.value = ''
  } catch (err) {
    if (token !== loadToken) return
    error.value = /password/i.test(err?.name || '') || /password/i.test(err?.message || '')
      ? 'PDF 已加密或受密码保护，本工具不支持输入密码，请先移除密码后再处理。'
      : err.message
    await destroyDocument()
    pageCount.value = 0
  } finally {
    if (token === loadToken) loading.value = false
  }
}

function cancelRender() {
  cancelRequested = true
  if (currentRenderTask) {
    try {
      currentRenderTask.cancel()
    } catch {
      // 已经结束
    }
  }
}

async function renderPages() {
  error.value = ''
  rangeWarning.value = ''
  if (!pdfDocument) {
    error.value = '请先载入 PDF'
    return
  }
  if (rendering.value) return
  let selection
  try {
    selection = pageRange.value.trim()
      ? parsePageSelection(pageRange.value, pageCount.value, { allowReorder: true })
      : { pages: Array.from({ length: pageCount.value }, (_, index) => index + 1), warnings: [] }
  } catch (err) {
    error.value = err.message
    return
  }
  if (selection.warnings.length) rangeWarning.value = selection.warnings.join('；')
  rendering.value = true
  cancelRequested = false
  const token = ++runId
  const renderFormat = format.value
  const renderQuality = quality.value
  const renderScale = Number(scale.value) || 2
  clearImages()
  let totalPixels = 0
  try {
    for (const pageNumber of selection.pages) {
      if (token !== runId || cancelRequested || disposed) break
      const page = await pdfDocument.getPage(pageNumber)
      const viewport = page.getViewport({ scale: renderScale })
      const pixels = viewport.width * viewport.height
      if (pixels > MAX_PAGE_PIXELS) {
        throw new Error(`第 ${pageNumber} 页输出 ${(pixels / 1000000).toFixed(1)} MP，超过单页 30 MP 限制，请降低清晰度`)
      }
      totalPixels += pixels
      if (totalPixels > MAX_TOTAL_PIXELS) throw new Error('累计输出像素超过 120 MP 限制，请减少页数或降低清晰度')
      const canvas = document.createElement('canvas')
      canvas.width = Math.ceil(viewport.width)
      canvas.height = Math.ceil(viewport.height)
      const context = canvas.getContext('2d')
      if (!context) throw new Error('无法创建 Canvas 2D 上下文')
      currentRenderTask = page.render({ canvasContext: context, canvas, viewport })
      try {
        await currentRenderTask.promise
      } catch (err) {
        if (cancelRequested || err?.name === 'RenderingCancelledException') break
        throw err
      } finally {
        currentRenderTask = null
        page.cleanup()
      }
      if (token !== runId || cancelRequested || disposed) {
        canvas.width = 0
        canvas.height = 0
        break
      }
      const mime = renderFormat === 'jpeg' ? 'image/jpeg' : 'image/png'
      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob(
          (value) => (value ? resolve(value) : reject(new Error(`第 ${pageNumber} 页编码失败`))),
          mime,
          renderFormat === 'jpeg' ? renderQuality : undefined
        )
      })
      const width = canvas.width
      const height = canvas.height
      canvas.width = 0
      canvas.height = 0
      if (blob.type !== mime) throw new Error(`浏览器未按 ${mime} 编码第 ${pageNumber} 页`)
      images.value.push({
        pageNumber,
        blob,
        url: URL.createObjectURL(blob),
        width,
        height,
        size: blob.size,
        extension: renderFormat === 'jpeg' ? 'jpg' : 'png'
      })
      await new Promise((resolve) => setTimeout(resolve, 0))
    }
    if (cancelRequested) ElMessage.info('渲染已取消')
  } catch (err) {
    error.value = err.message
  } finally {
    rendering.value = false
    currentRenderTask = null
  }
}

function downloadOne(item) {
  downloadBlob(item.blob, `page-${String(item.pageNumber).padStart(4, '0')}.${item.extension}`)
}

async function downloadZip() {
  if (!images.value.length) {
    ElMessage.warning('没有可下载的页面')
    return
  }
  try {
    const { default: JSZip } = await import('jszip')
    const zip = new JSZip()
    for (const item of images.value) {
      zip.file(`page-${String(item.pageNumber).padStart(4, '0')}.${item.extension}`, item.blob)
    }
    const blob = await zip.generateAsync({ type: 'blob' })
    downloadBlob(blob, 'pdf-pages.zip')
  } catch (err) {
    ElMessage.error(err.message)
  }
}

async function cleanup() {
  loadToken++
  runId++
  disposed = true
  cancelRequested = true
  cancelRender()
  clearImages()
  await destroyDocument()
  pageCount.value = 0
  pageRange.value = ''
  error.value = ''
  rangeWarning.value = ''
  loading.value = false
  rendering.value = false
}

function clearAll() {
  disposed = false
  cleanup()
}

onDeactivated(cleanup)
onBeforeUnmount(cleanup)
</script>

<style scoped>
.toolbox-page-image-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 14px;
}

.toolbox-page-image-card {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 10px;
  padding: 10px;
  background: var(--el-bg-color);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.toolbox-page-image-card img {
  width: 100%;
  height: 180px;
  object-fit: contain;
  background: var(--el-fill-color-lighter);
  border-radius: 6px;
}

.toolbox-page-image-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.toolbox-page-image-meta strong {
  color: var(--el-text-color-primary);
}
</style>
