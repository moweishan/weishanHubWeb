<template>
  <ToolPage
    title="HTML 可视化编辑"
    description="代码与可视编辑组合，预览在隔离环境中运行，脚本、图片、表单与外部资源会被阻止。"
    category="web"
  >
    <div class="toolbox-grid toolbox-grid--2">
      <div class="toolbox-panel">
        <h3 class="toolbox-panel__title"><el-icon><Edit /></el-icon>HTML 代码</h3>
        <el-input v-model="code" type="textarea" :rows="14" class="toolbox-mono" placeholder="<h1>标题</h1>" />
        <div class="toolbox-actions">
          <el-button type="primary" icon="View" @click="applyCode">应用到可视编辑</el-button>
          <el-button icon="RefreshRight" @click="syncFromVisual">从可视区同步代码</el-button>
        </div>
        <p class="toolbox-hint">代码中的脚本、事件属性、外链图片等会在进入可视区与预览时被移除。</p>
      </div>

      <div class="toolbox-panel">
        <h3 class="toolbox-panel__title"><el-icon><Brush /></el-icon>可视编辑</h3>
        <div class="toolbox-editor-toolbar">
          <el-button size="small" @click="exec('bold')"><b>B</b></el-button>
          <el-button size="small" @click="exec('italic')"><i>I</i></el-button>
          <el-button size="small" @click="exec('underline')"><u>U</u></el-button>
          <el-button size="small" @click="exec('formatBlock', '<h2>')">H2</el-button>
          <el-button size="small" @click="exec('formatBlock', '<p>')">正文</el-button>
          <el-button size="small" @click="exec('insertUnorderedList')">列表</el-button>
          <el-button size="small" @click="exec('insertOrderedList')">编号</el-button>
          <el-button size="small" @click="exec('removeFormat')">清除格式</el-button>
        </div>
        <div class="toolbox-inline" style="margin: 8px 0">
          <el-input v-model="linkUrl" placeholder="https://example.com" style="flex: 1" />
          <el-button size="small" @click="insertLink">插入链接</el-button>
        </div>
        <div
          ref="visualRef"
          class="toolbox-visual-editor"
          contenteditable="true"
          role="textbox"
          aria-label="HTML 可视编辑区"
          @input="syncFromVisual"
          @click="handleEditorClick"
          @blur="sanitizeVisual"
          @paste.prevent="handlePaste"
          @dragover.prevent
          @drop.prevent="handleDrop"
        />
        <p class="toolbox-hint">粘贴与拖放只插入纯文本；预览在隔离环境中运行，不会执行脚本。</p>
      </div>
    </div>

    <div class="toolbox-panel">
      <div class="toolbox-inline">
        <el-button type="primary" icon="View" @click="preview">更新安全预览</el-button>
        <el-button icon="Download" @click="downloadHtml">下载安全 HTML</el-button>
      </div>
      <iframe
        v-if="previewDocument"
        class="toolbox-preview-frame"
        title="HTML 安全预览"
        sandbox=""
        referrerpolicy="no-referrer"
        :srcdoc="previewDocument"
        style="margin-top: 12px"
      />
      <div v-else class="toolbox-empty" style="margin-top: 12px">点击“更新安全预览”查看过滤后的效果。</div>
    </div>

    <ToolResult
      label="安全 HTML"
      :text="safeCode"
      :rows="rows"
      :error="error"
      filename="edited.html"
      mime="text/html;charset=utf-8"
    />
  </ToolPage>
</template>

<script setup>
import { ElMessage } from 'element-plus'
import ToolPage from '@/components/Toolbox/ToolPage.vue'
import ToolResult from '@/components/Toolbox/ToolResult.vue'
import { buildPreviewDocument, sanitizeHtml } from '@/utils/toolbox/html'
import { downloadText } from '@/utils/toolbox/io'

const sample =
  '<h1>weishanHub</h1>\n<p>这是一个 <strong>HTML</strong> 可视化编辑示例。</p>\n<ul><li>脚本不会执行</li><li>外链资源不会加载</li></ul>'
const code = ref(sample)
const linkUrl = ref('https://example.com')
const safeCode = ref('')
const previewDocument = ref('')
const error = ref('')
const rows = ref([])
const visualRef = ref(null)

function applyCode() {
  error.value = ''
  try {
    const safe = sanitizeHtml(code.value)
    if (visualRef.value) visualRef.value.innerHTML = safe
    safeCode.value = safe
    rows.value = [
      { label: '原始字符数', value: String(code.value.length) },
      { label: '过滤后字符数', value: String(safe.length) },
      { label: '过滤方式', value: '安全过滤（脚本与外链资源已移除）' }
    ]
  } catch (err) {
    error.value = err.message
  }
}

function syncFromVisual() {
  if (!visualRef.value) return
  code.value = visualRef.value.innerHTML
}

function sanitizeVisual() {
  if (!visualRef.value) return
  try {
    const safe = sanitizeHtml(visualRef.value.innerHTML)
    if (visualRef.value.innerHTML !== safe) visualRef.value.innerHTML = safe
    code.value = safe
    safeCode.value = safe
  } catch (err) {
    error.value = err.message
  }
}

function exec(command, value = null) {
  if (!visualRef.value) return
  visualRef.value.focus()
  document.execCommand(command, false, value)
  syncFromVisual()
}

function insertLink() {
  error.value = ''
  try {
    const value = linkUrl.value.trim()
    if (!value) throw new Error('请输入链接地址')
    const url = new URL(value)
    if (!['http:', 'https:', 'mailto:', 'tel:'].includes(url.protocol)) {
      throw new Error('链接只允许 http(s)、mailto 或 tel 协议')
    }
    exec('createLink', url.href)
  } catch (err) {
    error.value = err.message
  }
}

function handlePaste(event) {
  const text = event.clipboardData?.getData('text/plain') || ''
  document.execCommand('insertText', false, text)
  syncFromVisual()
}

function handleDrop(event) {
  const text = event.dataTransfer?.getData('text/plain') || ''
  document.execCommand('insertText', false, text)
  syncFromVisual()
}

function handleEditorClick(event) {
  const anchor = event.target?.closest?.('a')
  if (anchor) event.preventDefault()
}

function preview() {
  error.value = ''
  try {
    const safe = sanitizeHtml(code.value)
    safeCode.value = safe
    previewDocument.value = buildPreviewDocument(safe)
  } catch (err) {
    error.value = err.message
  }
}

function downloadHtml() {
  try {
    const safe = sanitizeHtml(code.value)
    downloadText(buildPreviewDocument(safe), 'edited.html', 'text/html;charset=utf-8')
    ElMessage.success('已开始下载')
  } catch (err) {
    error.value = err.message
  }
}

onMounted(() => {
  if (visualRef.value) visualRef.value.innerHTML = sanitizeHtml(code.value)
  safeCode.value = sanitizeHtml(code.value)
})
</script>

<style scoped>
.toolbox-editor-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.toolbox-visual-editor {
  min-height: 260px;
  max-height: 420px;
  overflow: auto;
  padding: 12px;
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  line-height: 1.65;
  background: var(--el-bg-color);
  outline: none;
}

.toolbox-visual-editor:focus {
  border-color: var(--el-color-primary);
  box-shadow: 0 0 0 2px var(--el-color-primary-light-8);
}
</style>
