<template>
  <ToolPage
    title="URL 解析"
    description="使用浏览器 URL 解析协议、主机、端口、路径、查询参数与片段。解析结果不会触发网络请求，非 http(s) 协议会明确提示。"
    category="web"
  >
    <div class="toolbox-panel">
      <el-form label-position="top" class="toolbox-form">
        <el-form-item label="URL">
          <el-input v-model="input" clearable placeholder="https://example.com:8443/path?a=1&a=2&q=你好#part" />
        </el-form-item>
        <div class="toolbox-actions">
          <el-button type="primary" icon="Search" @click="parse">解析</el-button>
          <el-button icon="Delete" @click="clearAll">清空</el-button>
        </div>
      </el-form>
    </div>

    <div v-if="parsed" class="toolbox-grid toolbox-grid--2">
      <ToolResult label="解析结果" :text="jsonText" :rows="rows" :error="error" :warning="warning" filename="url.json" />
      <div class="toolbox-panel">
        <h3 class="toolbox-panel__title"><el-icon><List /></el-icon>查询参数（{{ parsed.params.length }}）</h3>
        <el-table v-if="parsed.params.length" :data="parsed.params" size="small" border>
          <el-table-column prop="name" label="参数名" width="160" />
          <el-table-column prop="value" label="值" />
        </el-table>
        <div v-else class="toolbox-empty">该 URL 没有查询参数。</div>
      </div>
    </div>
    <ToolResult v-else label="解析结果" :text="''" :error="error" empty-text="输入 URL 后点击解析。" />
  </ToolPage>
</template>

<script setup>
import ToolPage from '@/components/Toolbox/ToolPage.vue'
import ToolResult from '@/components/Toolbox/ToolResult.vue'
import { parseUrl } from '@/utils/toolbox/web'

const input = ref('https://example.com:8443/path?a=1&a=2&q=你好#part')
const parsed = ref(null)
const error = ref('')
const warning = ref('')

const rows = computed(() => {
  if (!parsed.value) return []
  return [
    { label: '协议', value: parsed.value.protocol },
    { label: '主机', value: parsed.value.host },
    { label: '主机名', value: parsed.value.hostname },
    { label: '端口', value: parsed.value.port || '默认' },
    { label: 'Origin', value: parsed.value.origin },
    { label: '路径', value: parsed.value.pathname },
    { label: '查询字符串', value: parsed.value.search || '（空）' },
    { label: '片段', value: parsed.value.hash || '（空）' },
    { label: '用户名', value: parsed.value.username || '（无）' },
    { label: '密码', value: parsed.value.password ? '***（已隐藏）' : '（无）' }
  ]
})

const jsonText = computed(() => {
  if (!parsed.value) return ''
  const value = { ...parsed.value, password: parsed.value.password ? '***' : '' }
  return JSON.stringify(value, null, 2)
})

function parse() {
  error.value = ''
  warning.value = ''
  parsed.value = null
  try {
    parsed.value = parseUrl(input.value)
    if (!parsed.value.isHttp) warning.value = `当前协议为 ${parsed.value.protocol}，不是 http(s)；本工具只解析文本，不会访问该地址。`
    if (parsed.value.password) warning.value = 'URL 中包含密码字段，结果中已隐藏显示。'
  } catch (err) {
    error.value = err.message
  }
}

function clearAll() {
  input.value = ''
  parsed.value = null
  error.value = ''
  warning.value = ''
}
</script>
