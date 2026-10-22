<template>
  <ToolPage
    title="JSON 压缩"
    description="校验 JSON 后移除可省略的空白，生成紧凑文本。可选按键名排序，不改变值；不做注释删除（JSON 本身不允许注释）。"
    category="development"
  >
    <div class="toolbox-panel">
      <el-form label-position="top" class="toolbox-form">
        <el-form-item label="JSON">
          <el-input v-model="input" type="textarea" :rows="10" class="toolbox-mono" />
        </el-form-item>
        <div class="toolbox-inline">
          <el-checkbox v-model="sortKeys">按键名排序</el-checkbox>
          <el-button type="primary" icon="MagicStick" @click="minify">压缩</el-button>
          <el-button icon="Delete" @click="clearAll">清空</el-button>
        </div>
      </el-form>
    </div>

    <ToolResult
      label="压缩结果"
      :text="result"
      :rows="rows"
      :error="error"
      filename="minified.json"
      mime="application/json;charset=utf-8"
      clearable
      @clear="result = ''"
    />
  </ToolPage>
</template>

<script setup>
import ToolPage from '@/components/Toolbox/ToolPage.vue'
import ToolResult from '@/components/Toolbox/ToolResult.vue'
import { minifyJson } from '@/utils/toolbox/structured'

const input = ref('{\n  "name": "weishanHub",\n  "features": ["native", "local"]\n}')
const sortKeys = ref(false)
const result = ref('')
const rows = ref([])
const error = ref('')

function minify() {
  error.value = ''
  result.value = ''
  rows.value = []
  try {
    result.value = minifyJson(input.value, { sortKeys: sortKeys.value })
    rows.value = [
      { label: '原始字节数', value: String(new TextEncoder().encode(input.value).length) },
      { label: '压缩后字节数', value: String(new TextEncoder().encode(result.value).length) },
      { label: '减少比例', value: `${Math.max(0, Math.round((1 - result.value.length / Math.max(1, input.value.length)) * 100))}%` }
    ]
  } catch (err) {
    error.value = err.message
  }
}

function clearAll() {
  input.value = ''
  result.value = ''
  rows.value = []
  error.value = ''
}

onMounted(minify)
</script>
