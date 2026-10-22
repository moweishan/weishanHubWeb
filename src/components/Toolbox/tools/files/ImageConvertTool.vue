<template>
  <ToolPage
    title="图片格式转换"
    description="本地批量转换 JPG、PNG、WebP，支持质量、宽高与保持比例，JPEG 可设置透明背景颜色。输出以浏览器实际编码的 MIME 为准，不支持 WebP 编码时会明确失败。"
    category="files"
  >
    <div class="toolbox-panel">
      <MultiFileDrop
        v-model="selectedFiles"
        label="选择 JPG / PNG / WebP"
        accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
        :max-mb="limits.maxFileMB"
        :max-files="limits.maxFiles"
        hint="支持批量选择；单个不超过 25 MB，最多 20 个。不会上传。"
      />

      <el-form label-position="top" class="toolbox-form" style="margin-top: 16px">
        <el-row :gutter="14">
          <el-col :xs="24" :sm="6">
            <el-form-item label="输出格式">
              <el-select v-model="format" class="toolbox-field-full">
                <el-option label="PNG" value="png" />
                <el-option label="JPEG" value="jpeg" />
                <el-option label="WebP" value="webp" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col v-if="format !== 'png'" :xs="24" :sm="6">
            <el-form-item label="质量">
              <el-slider v-model="quality" :min="0.1" :max="1" :step="0.05" show-input />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="6">
            <el-form-item label="目标宽度 px（留空原尺寸）">
              <el-input-number v-model="targetWidth" :min="1" :max="limits.maxDimension" class="toolbox-field-full" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="6">
            <el-form-item label="目标高度 px（留空原尺寸）">
              <el-input-number v-model="targetHeight" :min="1" :max="limits.maxDimension" class="toolbox-field-full" />
            </el-form-item>
          </el-col>
        </el-row>
        <div class="toolbox-check-group">
          <el-checkbox v-model="keepRatio">保持比例（宽高作为边界，不拉伸）</el-checkbox>
          <div v-if="format === 'jpeg'" class="toolbox-inline">
            <span class="toolbox-hint">透明背景颜色：</span>
            <el-color-picker v-model="background" />
          </div>
        </div>
        <div class="toolbox-actions">
          <el-button type="primary" icon="MagicStick" :loading="processing" :disabled="!items.length" @click="processAll">
            批量转换
          </el-button>
          <el-button icon="Download" :disabled="!doneItems.length || processing" @click="downloadZip">ZIP 批量下载</el-button>
          <el-button icon="Delete" @click="clearAll">清空</el-button>
        </div>
        <p class="toolbox-hint">
          限制：最多 {{ limits.maxFiles }} 个文件、单个 {{ limits.maxFileMB }} MB、源图 {{ limits.maxSourcePixels / 1000000 }} MP、输出
          {{ limits.maxOutputPixels / 1000000 }} MP、批量输出 {{ limits.maxBatchOutputPixels / 1000000 }} MP、单边 {{ limits.maxDimension }}px；超出会报错，不静默裁切。
        </p>
      </el-form>
    </div>

    <div v-if="items.length" class="toolbox-panel">
      <h3 class="toolbox-panel__title"><el-icon><Picture /></el-icon>转换列表（{{ items.length }}）</h3>
      <div class="toolbox-table-wrap">
        <el-table :data="items" size="small" border>
          <el-table-column prop="name" label="文件" min-width="200" show-overflow-tooltip />
          <el-table-column label="原尺寸" width="120">
            <template #default="{ row }">{{ row.sourceWidth ? `${row.sourceWidth}×${row.sourceHeight}` : '-' }}</template>
          </el-table-column>
          <el-table-column label="输出尺寸" width="120">
            <template #default="{ row }">{{ row.outputWidth ? `${row.outputWidth}×${row.outputHeight}` : '-' }}</template>
          </el-table-column>
          <el-table-column label="输出大小" width="100">
            <template #default="{ row }">{{ row.outputSize ? formatBytes(row.outputSize) : '-' }}</template>
          </el-table-column>
          <el-table-column label="状态" width="220">
            <template #default="{ row }">
              <el-tag :type="statusType(row)" size="small">{{ statusText(row) }}</el-tag>
              <div v-if="row.error" class="toolbox-meta">{{ row.error }}</div>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="100" fixed="right">
            <template #default="{ row }">
              <el-button v-if="row.outputUrl" link type="primary" size="small" icon="Download" @click="downloadItem(row)">
                下载
              </el-button>
              <span v-else class="toolbox-meta">-</span>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>
  </ToolPage>
</template>

<script setup>
import { ElMessage } from 'element-plus'
import ToolPage from '@/components/Toolbox/ToolPage.vue'
import MultiFileDrop from '@/components/Toolbox/MultiFileDrop.vue'
import { downloadBlob, formatBytes } from '@/utils/toolbox/io'
import {
  IMAGE_FORMATS,
  IMAGE_LIMITS,
  calculateOutputSize,
  createUniqueOutputName,
  isSupportedImageFile,
  outputFilename,
  outputMime
} from '@/utils/toolbox/image'

const limits = IMAGE_LIMITS
const selectedFiles = ref([])
const items = ref([])
const format = ref('webp')
const quality = ref(0.92)
const targetWidth = ref(null)
const targetHeight = ref(null)
const keepRatio = ref(true)
const background = ref('#ffffff')
const processing = ref(false)
let runId = 0
let processToken = 0
let disposed = false

const doneItems = computed(() => items.value.filter((item) => item.outputBlob))

function statusType(row) {
  if (row.status === 'done') return 'success'
  if (row.status === 'error') return 'danger'
  if (row.status === 'processing') return 'warning'
  return 'info'
}

function statusText(row) {
  if (row.status === 'done') return '完成'
  if (row.status === 'error') return '失败'
  if (row.status === 'processing') return '处理中'
  return '待处理'
}

function revokeOutputs() {
  for (const item of items.value) {
    if (item.outputUrl) URL.revokeObjectURL(item.outputUrl)
    item.outputUrl = ''
    item.outputBlob = null
    item.outputSize = 0
    item.outputWidth = 0
    item.outputHeight = 0
    item.outputFormat = ''
    item.outputName = ''
    item.outputMime = ''
    if (item.status === 'done' || item.status === 'processing') item.status = 'ready'
  }
}

async function decodeImage(file) {
  if (typeof createImageBitmap === 'function') {
    return await createImageBitmap(file)
  }
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

async function analyzeFiles(files) {
  processToken++
  const token = ++runId
  disposed = false
  revokeOutputs()
  items.value = files.map((file, index) => ({
    id: `${Date.now()}-${index}-${file.name}`,
    file,
    name: file.name,
    sourceWidth: 0,
    sourceHeight: 0,
    outputWidth: 0,
    outputHeight: 0,
    outputBlob: null,
    outputUrl: '',
    outputSize: 0,
    outputFormat: '',
    outputName: '',
    outputMime: '',
    status: 'ready',
    error: ''
  }))
  for (const item of items.value) {
    if (token !== runId || disposed) return
    try {
      if (!isSupportedImageFile(item.file)) throw new Error('只支持 JPG、PNG 或 WebP 图片')
      const image = await decodeImage(item.file)
      if (token !== runId || disposed) {
        releaseImage(image)
        return
      }
      item.sourceWidth = image.width || image.naturalWidth
      item.sourceHeight = image.height || image.naturalHeight
      releaseImage(image)
    } catch (error) {
      item.status = 'error'
      item.error = error.message
    }
  }
}

watch(
  selectedFiles,
  (files) => {
    analyzeFiles(files || [])
  },
  { deep: false }
)

watch([format, quality, targetWidth, targetHeight, keepRatio, background], () => {
  processToken++
  revokeOutputs()
})

async function processAll() {
  if (processing.value) return
  if (!items.value.length) return
  processing.value = true
  disposed = false
  const token = ++processToken
  revokeOutputs()
  const renderFormat = format.value
  const renderQuality = quality.value
  const renderWidth = targetWidth.value
  const renderHeight = targetHeight.value
  const renderKeepRatio = keepRatio.value
  const renderBackground = background.value
  const usedOutputNames = new Set()
  let totalOutputPixels = 0
  try {
    for (const item of items.value) {
      if (token !== processToken || disposed) break
      if (item.status === 'error' && !item.sourceWidth) continue
      item.status = 'processing'
      item.error = ''
      let image = null
      let canvas = null
      try {
        image = await decodeImage(item.file)
        if (token !== processToken || disposed) {
          releaseImage(image)
          break
        }
        const sourceWidth = image.width || image.naturalWidth
        const sourceHeight = image.height || image.naturalHeight
        item.sourceWidth = sourceWidth
        item.sourceHeight = sourceHeight
        const size = calculateOutputSize(sourceWidth, sourceHeight, {
          width: renderWidth,
          height: renderHeight,
          keepRatio: renderKeepRatio
        })
        totalOutputPixels += size.width * size.height
        if (totalOutputPixels > limits.maxBatchOutputPixels) {
          throw new Error(`批量输出总像素超过 ${limits.maxBatchOutputPixels / 1000000} MP 限制，请减少文件或尺寸`)
        }
        canvas = document.createElement('canvas')
        canvas.width = size.width
        canvas.height = size.height
        const context = canvas.getContext('2d')
        if (!context) throw new Error('浏览器无法创建 Canvas 2D 上下文')
        if (renderFormat === 'jpeg') {
          context.fillStyle = renderBackground || '#ffffff'
          context.fillRect(0, 0, size.width, size.height)
        }
        context.imageSmoothingEnabled = true
        context.imageSmoothingQuality = 'high'
        context.drawImage(image, 0, 0, size.width, size.height)
        releaseImage(image)
        image = null
        const mime = outputMime(renderFormat)
        const blob = await new Promise((resolve, reject) => {
          canvas.toBlob(
            (value) => (value ? resolve(value) : reject(new Error('Canvas 编码失败'))),
            mime,
            IMAGE_FORMATS[renderFormat].supportsQuality ? renderQuality : undefined
          )
        })
        canvas.width = 0
        canvas.height = 0
        canvas = null
        if (token !== processToken || disposed) break
        if (blob.type !== mime) {
          throw new Error(
            `当前浏览器不支持 ${IMAGE_FORMATS[renderFormat].label} 编码（实际返回 ${blob.type || '空 MIME'}），不能改扩展名冒充成功`
          )
        }
        item.outputBlob = blob
        item.outputUrl = URL.createObjectURL(blob)
        item.outputSize = blob.size
        item.outputWidth = size.width
        item.outputHeight = size.height
        item.outputFormat = renderFormat
        item.outputMime = blob.type
        item.outputName = createUniqueOutputName(item.name, renderFormat, usedOutputNames)
        item.status = 'done'
      } catch (error) {
        item.status = 'error'
        item.error = error.message
      } finally {
        releaseImage(image)
        if (canvas) {
          canvas.width = 0
          canvas.height = 0
        }
      }
    }
  } finally {
    processing.value = false
  }
}

function downloadItem(item) {
  if (!item.outputBlob) return
  const filename = item.outputName || outputFilename(item.name, item.outputFormat || format.value)
  downloadBlob(item.outputBlob, filename)
}

async function downloadZip() {
  const ready = doneItems.value
  if (!ready.length) {
    ElMessage.warning('没有可下载的转换结果')
    return
  }
  try {
    const { default: JSZip } = await import('jszip')
    const zip = new JSZip()
    for (const item of ready) {
      const filename = item.outputName || outputFilename(item.name, item.outputFormat || format.value)
      zip.file(filename, item.outputBlob)
    }
    const blob = await zip.generateAsync({ type: 'blob' })
    downloadBlob(blob, 'toolbox-images.zip')
  } catch (error) {
    ElMessage.error(error.message)
  }
}

function clearAll() {
  runId++
  processToken++
  disposed = true
  processing.value = false
  revokeOutputs()
  items.value = []
  selectedFiles.value = []
}

function cleanup() {
  runId++
  processToken++
  disposed = true
  processing.value = false
  revokeOutputs()
  items.value = []
  selectedFiles.value = []
}

onDeactivated(cleanup)
onBeforeUnmount(cleanup)
</script>
