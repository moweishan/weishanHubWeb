<template>
  <ToolPage
    title="YAML 查看与格式化"
    description="使用 yaml 库解析并输出 YAML，可调整缩进与行宽。注释、锚点与别名不会保留；多文档输入会明确报错。"
    category="development"
  >
    <div class="toolbox-panel">
      <el-form label-position="top" class="toolbox-form">
        <el-form-item label="YAML">
          <el-input v-model="input" type="textarea" :rows="12" class="toolbox-mono" />
        </el-form-item>
        <el-row :gutter="14">
          <el-col :xs="24" :sm="6">
            <el-form-item label="缩进">
              <el-select v-model="indent" class="toolbox-field-full">
                <el-option label="2 空格" :value="2" />
                <el-option label="4 空格" :value="4" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="6">
            <el-form-item label="行宽（0 = 不限制）">
              <el-input-number v-model="lineWidth" :min="0" :max="200" class="toolbox-field-full" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12">
            <el-form-item label="操作">
              <div class="toolbox-inline">
                <el-button type="primary" icon="MagicStick" @click="format">格式化</el-button>
                <el-button icon="DocumentAdd" @click="loadSample">载入示例</el-button>
                <el-button icon="Delete" @click="clearAll">清空</el-button>
              </div>
            </el-form-item>
          </el-col>
        </el-row>
        <p class="toolbox-hint">格式化只处理单个 YAML 文档；锚点、别名、标签与注释在解析后不会原样保留。</p>
      </el-form>
    </div>

    <ToolResult
      label="格式化结果"
      :text="result"
      :rows="rows"
      :error="error"
      filename="formatted.yaml"
      mime="application/yaml;charset=utf-8"
      clearable
      @clear="result = ''"
    />
  </ToolPage>
</template>

<script setup>
import ToolPage from '@/components/Toolbox/ToolPage.vue'
import ToolResult from '@/components/Toolbox/ToolResult.vue'
import { parseYaml, stringifyYaml } from '@/utils/toolbox/structured'

const sample = 'server:\n  host: 127.0.0.1\n  port: 8080\nfeatures:\n  - auth\n  - logging\n'
const input = ref(sample)
const indent = ref(2)
const lineWidth = ref(0)
const result = ref('')
const rows = ref([])
const error = ref('')

function format() {
  error.value = ''
  result.value = ''
  rows.value = []
  try {
    const value = parseYaml(input.value)
    if (value === undefined) throw new Error('YAML 内容为空或只有注释')
    result.value = stringifyYaml(value, { indent: indent.value, lineWidth: lineWidth.value })
    rows.value = [
      { label: '根类型', value: Array.isArray(value) ? 'array' : value === null ? 'null' : typeof value },
      { label: '原始行数', value: String(input.value.split('\n').length) },
      { label: '输出行数', value: String(result.value.split('\n').length) }
    ]
  } catch (err) {
    error.value = err.message
  }
}

function loadSample() {
  input.value = sample
  format()
}

function clearAll() {
  input.value = ''
  result.value = ''
  rows.value = []
  error.value = ''
}

onMounted(format)
</script>
