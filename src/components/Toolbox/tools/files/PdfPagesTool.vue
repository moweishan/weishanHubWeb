<template>
  <ToolPage
    title="PDF 页面处理"
    description="本地合并、拆分、提取、旋转与重排 PDF 页面，保留原始页面内容。暂不支持加密或损坏的 PDF。"
    category="files"
  >
    <div class="toolbox-panel">
      <el-radio-group v-model="mode">
        <el-radio-button value="merge">合并</el-radio-button>
        <el-radio-button value="split">拆分</el-radio-button>
        <el-radio-button value="extract">提取</el-radio-button>
        <el-radio-button value="rotate">旋转</el-radio-button>
        <el-radio-button value="reorder">重排</el-radio-button>
      </el-radio-group>
    </div>

    <template v-if="mode === 'merge'">
      <div class="toolbox-panel">
        <MultiFileDrop
          v-model="mergeFiles"
          label="选择多个 PDF"
          accept=".pdf,application/pdf"
          :max-mb="60"
          :max-files="10"
          hint="最多 10 个 PDF，单个不超过 60 MB；拖动下方文件调整合并顺序。"
        />
        <div v-if="mergeItems.length" class="toolbox-actions">
          <el-button type="primary" icon="Document" :loading="busy" @click="merge">合并 PDF</el-button>
          <el-button icon="Delete" @click="clearAll">清空</el-button>
        </div>
      </div>
      <div v-if="mergeItems.length" class="toolbox-panel">
        <h3 class="toolbox-panel__title"><el-icon><Sort /></el-icon>合并顺序（拖动调整）</h3>
        <draggable v-model="mergeItems" item-key="key" handle=".drag-handle" class="toolbox-pdf-file-list">
          <template #item="{ element, index }">
            <div class="toolbox-pdf-file-card">
              <span class="drag-handle"><el-icon><Rank /></el-icon></span>
              <span>{{ index + 1 }}. {{ element.name }}</span>
              <span class="toolbox-meta">{{ element.pageCount ? `${element.pageCount} 页` : element.error || '读取中…' }}</span>
              <el-button link type="danger" icon="Delete" @click="removeMerge(index)">移除</el-button>
            </div>
          </template>
        </draggable>
      </div>
    </template>

    <template v-else>
      <div class="toolbox-panel">
        <FileDrop v-model="singleFile" label="选择本地 PDF" accept=".pdf,application/pdf" :max-mb="60" hint="单个 PDF 不超过 60 MB；不会上传。" />
        <div v-if="singlePageCount" class="toolbox-inline" style="margin-top: 12px">
          <el-tag type="info">共 {{ singlePageCount }} 页</el-tag>
          <span class="toolbox-meta">{{ singleFile?.name }}</span>
        </div>
      </div>

      <div v-if="singlePageCount" class="toolbox-panel">
        <el-form label-position="top" class="toolbox-form">
          <template v-if="mode === 'split'">
            <el-form-item label="拆分区间（分号分隔，每段输出一个 PDF）">
              <el-input v-model="splitInput" class="toolbox-mono" placeholder="1-2;3-4" />
            </el-form-item>
            <div class="toolbox-inline" style="margin-bottom: 8px">
              <el-button size="small" @click="fillEveryPage">每页一组</el-button>
            </div>
            <p class="toolbox-hint">区间之间不能重复页；例如 1-2;3-4 会生成两个 PDF，并提供 ZIP 下载。</p>
            <el-button type="primary" icon="Scissor" :loading="busy" @click="split">拆分</el-button>
          </template>

          <template v-else-if="mode === 'extract'">
            <el-form-item label="提取页码（可重排，例如 3,1-2）">
              <el-input v-model="extractInput" class="toolbox-mono" placeholder="3,1-2" />
            </el-form-item>
            <el-button type="primary" icon="DocumentCopy" :loading="busy" @click="extract">提取为一个 PDF</el-button>
          </template>

          <template v-else-if="mode === 'rotate'">
            <el-form-item label="旋转页码（留空表示全部）">
              <el-input v-model="rotateInput" class="toolbox-mono" placeholder="例如 1,3-5；留空全部" />
            </el-form-item>
            <el-form-item label="旋转角度">
              <el-radio-group v-model="rotation">
                <el-radio-button :value="90">90°</el-radio-button>
                <el-radio-button :value="180">180°</el-radio-button>
                <el-radio-button :value="270">270°</el-radio-button>
              </el-radio-group>
            </el-form-item>
            <el-button type="primary" icon="RefreshRight" :loading="busy" @click="rotate">旋转</el-button>
          </template>

          <template v-else>
            <el-form-item label="新顺序（必须包含每一页且不重复，例如 3,1,2）">
              <el-input v-model="reorderInput" class="toolbox-mono" :placeholder="`1-${singlePageCount} 或 3,1,2`" />
            </el-form-item>
            <p class="toolbox-hint">重排会复制页面生成新 PDF，不修改原文件。</p>
            <el-button type="primary" icon="Sort" :loading="busy" @click="reorder">重排</el-button>
          </template>
        </el-form>
      </div>
    </template>

    <el-alert v-if="error" type="error" :closable="false" show-icon :title="error" />

    <div v-if="outputs.length" class="toolbox-panel">
      <div class="toolbox-inline" style="margin-bottom: 12px">
        <el-tag type="success">已生成 {{ outputs.length }} 个 PDF</el-tag>
        <el-button v-if="outputs.length > 1" type="success" icon="Download" @click="downloadZip">ZIP 下载全部</el-button>
      </div>
      <div class="toolbox-pdf-output-list">
        <div v-for="item in outputs" :key="item.name" class="toolbox-pdf-output-card">
          <el-icon :size="22"><Document /></el-icon>
          <div class="toolbox-pdf-output-meta">
            <strong>{{ item.name }}</strong>
            <span>{{ item.pages.join(',') }} 页 · {{ formatBytes(item.size) }}</span>
          </div>
          <el-button size="small" icon="Download" @click="downloadOutput(item)">下载</el-button>
        </div>
      </div>
    </div>
  </ToolPage>
</template>

<script setup>
import { ElMessage } from 'element-plus'
import draggable from 'vuedraggable'
import ToolPage from '@/components/Toolbox/ToolPage.vue'
import FileDrop from '@/components/Toolbox/FileDrop.vue'
import MultiFileDrop from '@/components/Toolbox/MultiFileDrop.vue'
import { downloadBlob, formatBytes, readFileAsArrayBuffer } from '@/utils/toolbox/io'
import {
  extractPdfPages,
  getPdfPageCount,
  mergePdfDocuments,
  reorderPdfPages,
  rotatePdfPages,
  splitPdfGroups
} from '@/utils/toolbox/pdfPages'
import { parsePageSelection, parseRangeGroups, parseRotationPages } from '@/utils/toolbox/pdfRanges'

const mode = ref('merge')
const mergeFiles = ref([])
const mergeItems = ref([])
const singleFile = ref(null)
const singlePageCount = ref(0)
const singleBytes = ref(null)
const splitInput = ref('1-2;3-4')
const extractInput = ref('1')
const rotateInput = ref('')
const reorderInput = ref('')
const rotation = ref(90)
const busy = ref(false)
const error = ref('')
const outputs = ref([])
let runId = 0
let operationId = 0
let disposed = false

function fileKey(file) {
  return `${file.name}|${file.size}|${file.lastModified}`
}

function revokeOutputs() {
  for (const item of outputs.value) URL.revokeObjectURL(item.url)
  outputs.value = []
}

function addOutputs(list) {
  revokeOutputs()
  outputs.value = list.map((item) => ({
    name: item.name,
    pages: item.pages,
    blob: item.blob,
    url: URL.createObjectURL(item.blob),
    size: item.blob.size
  }))
}

function toPdfBlob(bytes) {
  return new Blob([bytes], { type: 'application/pdf' })
}

function syncMergeItems(files) {
  operationId++
  const fileMap = new Map(files.map((file) => [fileKey(file), file]))
  const existingKeys = new Set(mergeItems.value.map((item) => item.key))
  const next = mergeItems.value.filter((item) => fileMap.has(item.key))
  for (const file of files) {
    const key = fileKey(file)
    if (existingKeys.has(key)) continue
    next.push({ key, file, name: file.name, pageCount: 0, bytes: null, error: '' })
  }
  mergeItems.value = next
  const token = ++runId
  disposed = false
  for (const item of next) {
    if (item.pageCount || item.error) continue
    readFileAsArrayBuffer(item.file, { maxBytes: 60 * 1024 * 1024 })
      .then(async (buffer) => {
        const bytes = new Uint8Array(buffer)
        const count = await getPdfPageCount(bytes)
        if (token !== runId || disposed) return
        item.pageCount = count
        item.bytes = bytes
      })
      .catch((err) => {
        if (token !== runId || disposed) return
        item.error = err.message
      })
  }
}

watch(mergeFiles, (files) => syncMergeItems(files || []))

watch(singleFile, async (file) => {
  operationId++
  error.value = ''
  singlePageCount.value = 0
  singleBytes.value = null
  revokeOutputs()
  if (!file) return
  busy.value = true
  const token = ++runId
  disposed = false
  try {
    const buffer = await readFileAsArrayBuffer(file, { maxBytes: 60 * 1024 * 1024 })
    if (token !== runId || disposed) return
    const bytes = new Uint8Array(buffer)
    const count = await getPdfPageCount(bytes)
    if (token !== runId || disposed) return
    singleBytes.value = bytes
    singlePageCount.value = count
    splitInput.value = count > 1 ? `1-${count}` : '1'
    extractInput.value = '1'
    reorderInput.value = Array.from({ length: count }, (_, index) => String(index + 1)).join(',')
  } catch (err) {
    if (token !== runId) return
    error.value = err.message
  } finally {
    if (token === runId) busy.value = false
  }
})

watch(mode, () => {
  operationId++
  revokeOutputs()
  error.value = ''
})

function removeMerge(index) {
  const item = mergeItems.value[index]
  if (!item) return
  mergeFiles.value = mergeFiles.value.filter((file) => fileKey(file) !== item.key)
  mergeItems.value = mergeItems.value.filter((_, itemIndex) => itemIndex !== index)
}

function fillEveryPage() {
  splitInput.value = Array.from({ length: singlePageCount.value }, (_, index) => String(index + 1)).join(';')
}

async function merge() {
  error.value = ''
  revokeOutputs()
  if (mergeItems.value.length < 2) {
    error.value = '合并至少需要两个 PDF'
    return
  }
  if (mergeItems.value.some((item) => item.error || !item.bytes)) {
    error.value = '存在无法读取的 PDF，请移除后再合并'
    return
  }
  if (mergeItems.value.reduce((total, item) => total + item.pageCount, 0) > 2000) {
    error.value = '合并总页数超过 2000 页限制'
    return
  }
  const token = ++operationId
  busy.value = true
  try {
    const bytes = await mergePdfDocuments(mergeItems.value.map((item) => ({ name: item.name, bytes: item.bytes })))
    if (token !== operationId || disposed) return
    const totalPages = mergeItems.value.reduce((total, item) => total + item.pageCount, 0)
    addOutputs([{ name: 'merged.pdf', pages: [`1-${totalPages}`], blob: toPdfBlob(bytes) }])
  } catch (err) {
    error.value = err.message
  } finally {
    busy.value = false
  }
}

async function split() {
  error.value = ''
  revokeOutputs()
  const token = ++operationId
  busy.value = true
  try {
    const groups = parseRangeGroups(splitInput.value, singlePageCount.value)
    const results = await splitPdfGroups(singleBytes.value, groups)
    if (token !== operationId || disposed) return
    addOutputs(
      results.map((item, index) => ({
        name: `split-${index + 1}-${item.pages.join('-')}.pdf`,
        pages: item.pages,
        blob: toPdfBlob(item.bytes)
      }))
    )
  } catch (err) {
    error.value = err.message
  } finally {
    busy.value = false
  }
}

async function extract() {
  error.value = ''
  revokeOutputs()
  const token = ++operationId
  busy.value = true
  try {
    const selection = parsePageSelection(extractInput.value, singlePageCount.value, { allowReorder: true })
    const bytes = await extractPdfPages(singleBytes.value, selection.pages)
    if (token !== operationId || disposed) return
    addOutputs([{ name: 'extracted.pdf', pages: selection.pages, blob: toPdfBlob(bytes) }])
  } catch (err) {
    error.value = err.message
  } finally {
    busy.value = false
  }
}

async function rotate() {
  error.value = ''
  revokeOutputs()
  const token = ++operationId
  busy.value = true
  try {
    const selection = parseRotationPages(rotateInput.value, singlePageCount.value)
    const bytes = await rotatePdfPages(singleBytes.value, selection.pages, rotation.value)
    if (token !== operationId || disposed) return
    addOutputs([{ name: `rotated-${rotation.value}.pdf`, pages: selection.pages, blob: toPdfBlob(bytes) }])
  } catch (err) {
    error.value = err.message
  } finally {
    busy.value = false
  }
}

async function reorder() {
  error.value = ''
  revokeOutputs()
  const token = ++operationId
  busy.value = true
  try {
    const selection = parsePageSelection(reorderInput.value, singlePageCount.value, { allowReorder: true, requireAll: true })
    const bytes = await reorderPdfPages(singleBytes.value, selection.pages)
    if (token !== operationId || disposed) return
    addOutputs([{ name: 'reordered.pdf', pages: selection.pages, blob: toPdfBlob(bytes) }])
  } catch (err) {
    error.value = err.message
  } finally {
    busy.value = false
  }
}

function downloadOutput(item) {
  downloadBlob(item.blob, item.name)
}

async function downloadZip() {
  if (!outputs.value.length) return
  try {
    const { default: JSZip } = await import('jszip')
    const zip = new JSZip()
    for (const item of outputs.value) zip.file(item.name, item.blob)
    downloadBlob(await zip.generateAsync({ type: 'blob' }), 'pdf-pages-output.zip')
  } catch (err) {
    ElMessage.error(err.message)
  }
}

function clearAll() {
  runId++
  operationId++
  disposed = true
  mergeFiles.value = []
  mergeItems.value = []
  singleFile.value = null
  singlePageCount.value = 0
  singleBytes.value = null
  revokeOutputs()
  busy.value = false
  error.value = ''
}

onDeactivated(clearAll)
onBeforeUnmount(clearAll)
</script>

<style scoped>
.toolbox-pdf-file-list,
.toolbox-pdf-output-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.toolbox-pdf-file-card,
.toolbox-pdf-output-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  background: var(--el-bg-color);
  font-size: 13px;
}

.drag-handle {
  cursor: grab;
  color: var(--el-text-color-secondary);
  display: flex;
}

.toolbox-pdf-file-card > span:nth-child(2),
.toolbox-pdf-output-meta {
  flex: 1;
  min-width: 0;
  word-break: break-all;
}

.toolbox-pdf-output-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.toolbox-pdf-output-meta span {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>
