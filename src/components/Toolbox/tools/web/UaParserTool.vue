<template>
  <ToolPage
    title="User-Agent 解析"
    description="使用 ua-parser-js v1 在本地解析浏览器、引擎、操作系统、设备与 CPU 信息。UA 可被伪造，结果仅作参考。"
    category="web"
  >
    <div class="toolbox-panel">
      <el-form label-position="top" class="toolbox-form">
        <el-form-item label="User-Agent">
          <el-input v-model="input" type="textarea" :rows="4" class="toolbox-mono" />
        </el-form-item>
        <div class="toolbox-actions">
          <el-button type="primary" icon="Search" @click="parse">解析</el-button>
          <el-button icon="Refresh" @click="useCurrent">使用当前浏览器 UA</el-button>
          <el-button icon="Delete" @click="clearAll">清空</el-button>
        </div>
        <div class="toolbox-inline" style="margin-top: 8px">
          <span class="toolbox-hint">示例：</span>
          <el-button size="small" @click="loadSample('chrome')">Chrome</el-button>
          <el-button size="small" @click="loadSample('iphone')">iPhone</el-button>
          <el-button size="small" @click="loadSample('android')">Android</el-button>
          <el-button size="small" @click="loadSample('bot')">Googlebot</el-button>
        </div>
      </el-form>
    </div>

    <ToolResult
      label="解析结果"
      :text="jsonText"
      :rows="rows"
      :error="error"
      :warning="'UA 字符串由客户端提供，可能被任意伪造；不要用于安全判定。'"
      filename="ua.json"
    />
  </ToolPage>
</template>

<script setup>
import ToolPage from '@/components/Toolbox/ToolPage.vue'
import ToolResult from '@/components/Toolbox/ToolResult.vue'
import { parseUserAgent } from '@/utils/toolbox/web'

const samples = {
  chrome:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  iphone:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  android:
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
  bot: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
}

const input = ref('')
const parsed = ref(null)
const error = ref('')

const rows = computed(() => {
  if (!parsed.value) return []
  return [
    { label: '浏览器', value: `${parsed.value.browser.name} ${parsed.value.browser.version}` },
    { label: '引擎', value: `${parsed.value.engine.name} ${parsed.value.engine.version}` },
    { label: '操作系统', value: `${parsed.value.os.name} ${parsed.value.os.version}` },
    { label: '设备厂商', value: parsed.value.device.vendor },
    { label: '设备型号', value: parsed.value.device.model },
    { label: '设备类型', value: parsed.value.device.type },
    { label: 'CPU 架构', value: parsed.value.cpu.architecture }
  ]
})
const jsonText = computed(() => (parsed.value ? JSON.stringify(parsed.value, null, 2) : ''))

function parse() {
  error.value = ''
  parsed.value = null
  try {
    parsed.value = parseUserAgent(input.value)
  } catch (err) {
    error.value = err.message
  }
}

function useCurrent() {
  input.value = navigator.userAgent
  parse()
}

function loadSample(key) {
  input.value = samples[key]
  parse()
}

function clearAll() {
  input.value = ''
  parsed.value = null
  error.value = ''
}

onMounted(useCurrent)
</script>
