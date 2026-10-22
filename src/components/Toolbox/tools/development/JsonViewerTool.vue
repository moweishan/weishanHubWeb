<template>
  <ToolPage
    title="JSON 查看与格式化"
    description="校验并美化 JSON，可选缩进与键排序，并显示根类型、键数、数组长度和嵌套深度。"
    category="development"
  >
    <div class="toolbox-panel">
      <el-form label-position="top" class="toolbox-form">
        <el-form-item label="JSON">
          <el-input v-model="input" type="textarea" :rows="12" class="toolbox-mono" />
        </el-form-item>
        <el-row :gutter="14">
          <el-col :xs="24" :sm="8">
            <el-form-item label="缩进">
              <el-select v-model="indent" class="toolbox-field-full">
                <el-option label="2 空格" :value="2" />
                <el-option label="4 空格" :value="4" />
                <el-option label="Tab" value="tab" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="8">
            <el-form-item label="键排序">
              <el-switch v-model="sortKeys" active-text="按键名排序" inactive-text="保留原顺序" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="8">
            <el-form-item label="操作">
              <div class="toolbox-inline">
                <el-button type="primary" icon="MagicStick" @click="format">格式化</el-button>
                <el-button icon="Delete" @click="clearAll">清空</el-button>
              </div>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
    </div>

    <ToolResult
      label="格式化结果"
      :text="result"
      :rows="rows"
      :error="error"
      filename="formatted.json"
      mime="application/json;charset=utf-8"
      clearable
      @clear="result = ''"
    />
  </ToolPage>
</template>

<script setup>
import ToolPage from '@/components/Toolbox/ToolPage.vue'
import ToolResult from '@/components/Toolbox/ToolResult.vue'
import { parseJson, stringifyJson } from '@/utils/toolbox/structured'

const input = ref('{\n  "name": "weishanHub",\n  "features": ["native", "local"],\n  "nested": { "ok": true }\n}')
const indent = ref(2)
const sortKeys = ref(false)
const result = ref('')
const rows = ref([])
const error = ref('')
const parsed = ref(null)

function depth(value, level = 0) {
  if (level > 30) return level
  if (Array.isArray(value)) return value.length ? Math.max(...value.map((item) => depth(item, level + 1))) : level
  if (value && typeof value === 'object') {
    const keys = Object.keys(value)
    return keys.length ? Math.max(...keys.map((key) => depth(value[key], level + 1))) : level
  }
  return level
}

function format() {
  error.value = ''
  result.value = ''
  rows.value = []
  parsed.value = null
  try {
    parsed.value = parseJson(input.value)
    result.value = stringifyJson(parsed.value, { indent: indent.value, sortKeys: sortKeys.value })
    const root = Array.isArray(parsed.value) ? 'array' : parsed.value === null ? 'null' : typeof parsed.value
    rows.value = [
      { label: '根类型', value: root },
      { label: '顶层键/长度', value: String(Array.isArray(parsed.value) ? parsed.value.length : parsed.value && typeof parsed.value === 'object' ? Object.keys(parsed.value).length : 0) },
      { label: '嵌套深度', value: String(depth(parsed.value)) },
      { label: '输出字节数', value: String(new TextEncoder().encode(result.value).length) }
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
  parsed.value = null
}

onMounted(format)
</script>
