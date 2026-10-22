<template>
  <ToolPage
    title="Markdown 转 HTML"
    description="将 Markdown 转为 HTML 并预览，支持复制或下载结果。为安全预览，脚本、表单、嵌入页面、图片与外部样式会被移除。"
    category="convert"
  >
    <div class="toolbox-panel">
      <el-form label-position="top" class="toolbox-form">
        <el-form-item label="Markdown">
          <el-input v-model="input" type="textarea" :rows="12" class="toolbox-mono" />
        </el-form-item>
        <div class="toolbox-actions">
          <el-button type="primary" icon="View" @click="render">渲染并预览</el-button>
          <el-button icon="DocumentAdd" @click="loadSample">载入示例</el-button>
          <el-button icon="Delete" @click="clearAll">清空</el-button>
        </div>
      </el-form>
    </div>

    <div v-if="rendered" class="toolbox-grid toolbox-grid--2">
      <div class="toolbox-panel">
        <h3 class="toolbox-panel__title"><el-icon><View /></el-icon>安全预览</h3>
        <iframe
          class="toolbox-preview-frame"
          title="Markdown 渲染预览"
          sandbox=""
          referrerpolicy="no-referrer"
          :srcdoc="previewDocument"
        />
        <p class="toolbox-hint">预览 iframe 没有 allow-scripts，且 CSP 禁止外部资源；链接不会自动跳转。</p>
      </div>
      <ToolResult label="安全 HTML" :text="rendered" :rows="rows" :error="error" filename="markdown.html" mime="text/html;charset=utf-8">
        <div class="toolbox-actions">
          <el-button type="success" icon="Download" @click="downloadFull">下载完整 HTML</el-button>
        </div>
      </ToolResult>
    </div>

    <ToolResult v-else label="安全 HTML" :text="''" :error="error" empty-text="点击“渲染并预览”生成经过过滤的 HTML。" />
  </ToolPage>
</template>

<script setup>
import { ElMessage } from 'element-plus'
import ToolPage from '@/components/Toolbox/ToolPage.vue'
import ToolResult from '@/components/Toolbox/ToolResult.vue'
import { buildPreviewDocument, sanitizeHtml } from '@/utils/toolbox/html'
import { downloadText } from '@/utils/toolbox/io'
import { markdownToHtml } from '@/utils/toolbox/structured'

const sample = `# weishanHub 工具箱

这是一个 **Markdown** 示例，包含 [链接](https://example.com)、列表与代码。

- 本地处理
- 不上传文件
- 预览无脚本

\`\`\`js
console.log('hello')
\`\`\`

> 原始 HTML 与脚本会被 DOMPurify 过滤。
`
const input = ref(sample)
const rendered = ref('')
const previewDocument = ref('')
const error = ref('')
const rows = ref([])

function render() {
  error.value = ''
  rendered.value = ''
  previewDocument.value = ''
  rows.value = []
  try {
    const html = markdownToHtml(input.value)
    const safe = sanitizeHtml(html)
    rendered.value = safe
    previewDocument.value = buildPreviewDocument(safe)
    rows.value = [
      { label: '原始 Markdown 字符数', value: String(input.value.length) },
      { label: '过滤后 HTML 字符数', value: String(safe.length) },
      { label: '过滤方式', value: 'DOMPurify + sandbox + CSP' }
    ]
  } catch (err) {
    error.value = err.message
  }
}

function downloadFull() {
  try {
    if (!previewDocument.value) throw new Error('请先渲染')
    downloadText(previewDocument.value, 'markdown-preview.html', 'text/html;charset=utf-8')
    ElMessage.success('已开始下载')
  } catch (err) {
    ElMessage.error(err.message)
  }
}

function loadSample() {
  input.value = sample
  rendered.value = ''
  previewDocument.value = ''
  error.value = ''
}

function clearAll() {
  input.value = ''
  rendered.value = ''
  previewDocument.value = ''
  error.value = ''
  rows.value = []
}
</script>
