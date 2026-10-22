<template>
  <ToolPage
    title="Base64 文件转换"
    description="文件只在当前浏览器内读取，不会上传。编码结果可复制或下载为文本；解码时可指定文件名与 MIME 后下载原始字节。"
    category="convert"
  >
    <div class="toolbox-panel">
      <el-radio-group v-model="mode">
        <el-radio-button value="encode">文件 → Base64</el-radio-button>
        <el-radio-button value="decode">Base64 → 文件</el-radio-button>
      </el-radio-group>
    </div>

    <div v-if="mode === 'encode'" class="toolbox-grid toolbox-grid--2">
      <div class="toolbox-panel">
        <h3 class="toolbox-panel__title"><el-icon><UploadFilled /></el-icon>选择文件</h3>
        <FileDrop v-model="file" :max-mb="4" hint="点击或拖入不超过 4 MB 的文件；大文件可改用命令行工具。" />
        <el-form label-position="top" class="toolbox-form" style="margin-top: 14px">
          <el-form-item label="输出格式">
            <el-checkbox v-model="dataUrl">包含 data: URL 前缀</el-checkbox>
          </el-form-item>
        </el-form>
        <div class="toolbox-actions">
          <el-button type="primary" icon="Switch" :disabled="!file" @click="encodeFile">开始编码</el-button>
          <el-button icon="Delete" @click="clearAll">清空</el-button>
        </div>
      </div>
      <div class="toolbox-panel">
        <h3 class="toolbox-panel__title"><el-icon><Document /></el-icon>文件信息</h3>
        <el-descriptions v-if="file" :column="1" border size="small">
          <el-descriptions-item label="文件名">{{ file.name }}</el-descriptions-item>
          <el-descriptions-item label="大小">{{ formatBytes(file.size) }}</el-descriptions-item>
          <el-descriptions-item label="MIME">{{ file.type || '未知（按扩展名推断）' }}</el-descriptions-item>
        </el-descriptions>
        <div v-else class="toolbox-empty">尚未选择文件。</div>
      </div>
    </div>

    <div v-else class="toolbox-panel">
      <el-form label-position="top" class="toolbox-form">
        <el-form-item label="Base64 内容">
          <el-input v-model="base64Input" type="textarea" :rows="8" placeholder="粘贴 Base64 文本，支持换行与 URL-safe 字符" class="toolbox-mono" />
        </el-form-item>
        <el-row :gutter="14">
          <el-col :xs="24" :sm="12">
            <el-form-item label="下载文件名">
              <el-input v-model="filename" placeholder="decoded.bin" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12">
            <el-form-item label="MIME 类型">
              <el-input v-model="mime" placeholder="application/octet-stream" />
            </el-form-item>
          </el-col>
        </el-row>
        <div class="toolbox-actions">
          <el-button type="primary" icon="Download" @click="decodeFile">解码并下载</el-button>
          <el-button icon="Delete" @click="clearAll">清空</el-button>
        </div>
      </el-form>
    </div>

    <ToolResult
      label="转换结果"
      :text="result"
      :rows="rows"
      :error="error"
      :warning="warning"
      filename="base64.txt"
      clearable
      @clear="clearAll"
    >
      <div v-if="decodedBlob" class="toolbox-actions">
        <el-button type="success" icon="Download" @click="downloadDecoded">下载解码文件</el-button>
      </div>
    </ToolResult>
  </ToolPage>
</template>

<script setup>
import { ElMessage } from 'element-plus'
import ToolPage from '@/components/Toolbox/ToolPage.vue'
import ToolResult from '@/components/Toolbox/ToolResult.vue'
import FileDrop from '@/components/Toolbox/FileDrop.vue'
import { base64ToBytes, bytesToBase64 } from '@/utils/toolbox/encoding'
import { downloadBase64, formatBytes, readFileAsArrayBuffer, sanitizeFilename } from '@/utils/toolbox/io'

const mode = ref('encode')
const file = ref(null)
const dataUrl = ref(false)
const base64Input = ref('')
const filename = ref('decoded.bin')
const mime = ref('application/octet-stream')
const result = ref('')
const rows = ref([])
const error = ref('')
const warning = ref('')
const decodedBlob = ref(null)
const decodedBase64 = ref('')

async function encodeFile() {
  error.value = ''
  warning.value = ''
  result.value = ''
  rows.value = []
  try {
    if (!file.value) throw new Error('请先选择文件')
    const buffer = await readFileAsArrayBuffer(file.value, { maxBytes: 4 * 1024 * 1024 })
    const base64 = bytesToBase64(new Uint8Array(buffer))
    const prefix = dataUrl.value ? `data:${file.value.type || 'application/octet-stream'};base64,` : ''
    result.value = `${prefix}${base64}`
    rows.value = [
      { label: '原始大小', value: formatBytes(file.value.size) },
      { label: 'Base64 长度', value: `${base64.length} 字符` },
      { label: 'MIME', value: file.value.type || '未知' }
    ]
    warning.value = 'Base64 体积约为原始文件的 4/3；请确认目标系统允许的长度。'
  } catch (err) {
    error.value = err.message
  }
}

async function decodeFile() {
  error.value = ''
  warning.value = ''
  result.value = ''
  rows.value = []
  decodedBlob.value = null
  try {
    const bytes = base64ToBytes(base64Input.value)
    if (!bytes.length) throw new Error('解码结果为空')
    decodedBase64.value = bytesToBase64(bytes)
    decodedBlob.value = new Blob([bytes], { type: mime.value || 'application/octet-stream' })
    rows.value = [
      { label: '解码大小', value: formatBytes(bytes.length) },
      { label: '文件名', value: sanitizeFilename(filename.value || 'decoded.bin') },
      { label: 'MIME', value: mime.value || 'application/octet-stream' }
    ]
    result.value = `已成功解码 ${bytes.length} 字节，可点击下方按钮下载。`
  } catch (err) {
    error.value = err.message
  }
}

function downloadDecoded() {
  try {
    if (!decodedBase64.value) throw new Error('请先解码')
    downloadBase64(decodedBase64.value, sanitizeFilename(filename.value || 'decoded.bin'), mime.value)
    ElMessage.success('已开始下载')
  } catch (err) {
    error.value = err.message
  }
}

function clearAll() {
  file.value = null
  base64Input.value = ''
  result.value = ''
  rows.value = []
  error.value = ''
  warning.value = ''
  decodedBlob.value = null
  decodedBase64.value = ''
}

watch(mode, clearAll)
onDeactivated(clearAll)
</script>
