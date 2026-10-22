<template>
  <ToolPage
    title="JSON 转 CSV"
    description="把对象数组转为 CSV。字段包含逗号、双引号或换行时会自动加引号并转义，支持自定义分隔符与表头。"
    category="development"
  >
    <div class="toolbox-panel">
      <el-form label-position="top" class="toolbox-form">
        <el-form-item label="JSON 对象数组">
          <el-input v-model="input" type="textarea" :rows="10" class="toolbox-mono" />
        </el-form-item>
        <el-row :gutter="14">
          <el-col :xs="24" :sm="6">
            <el-form-item label="分隔符">
              <el-select v-model="delimiter" class="toolbox-field-full">
                <el-option label="逗号 ," value="," />
                <el-option label="制表符 Tab" value="tab" />
                <el-option label="分号 ;" value=";" />
                <el-option label="竖线 |" value="|" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="10">
            <el-form-item label="指定列（可选，逗号分隔）">
              <el-input v-model="columnsText" placeholder="例如 id,name,email" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="8">
            <el-form-item label="表头">
              <el-checkbox v-model="includeHeader">包含表头行</el-checkbox>
            </el-form-item>
          </el-col>
        </el-row>
        <div class="toolbox-actions">
          <el-button type="primary" icon="Switch" @click="convert">转换</el-button>
          <el-button icon="DocumentAdd" @click="loadSample">载入示例</el-button>
          <el-button icon="Delete" @click="clearAll">清空</el-button>
        </div>
      </el-form>
    </div>

    <ToolResult
      label="CSV 结果"
      :text="result"
      :rows="rows"
      :error="error"
      :warning="'CSV 在 Excel 等软件中可能把以 = + - @ 开头的值当作公式；不要直接打开来源不可信的 CSV。'"
      filename="data.csv"
      mime="text/csv;charset=utf-8"
      clearable
      @clear="result = ''"
    />
  </ToolPage>
</template>

<script setup>
import ToolPage from '@/components/Toolbox/ToolPage.vue'
import ToolResult from '@/components/Toolbox/ToolResult.vue'
import { jsonToCsv, parseJson } from '@/utils/toolbox/structured'

const sample = JSON.stringify(
  [
    { id: 1, name: '张三', note: '包含,逗号' },
    { id: 2, name: '李四', note: '包含"引号"' },
    { id: 3, name: '王五', note: '包含\n换行' }
  ],
  null,
  2
)
const input = ref(sample)
const delimiter = ref(',')
const includeHeader = ref(true)
const columnsText = ref('')
const result = ref('')
const rows = ref([])
const error = ref('')

function convert() {
  error.value = ''
  result.value = ''
  rows.value = []
  try {
    const data = parseJson(input.value)
    const columns = columnsText.value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
    result.value = jsonToCsv(data, {
      delimiter: delimiter.value === 'tab' ? '\t' : delimiter.value,
      includeHeader: includeHeader.value,
      columns
    })
    rows.value = [
      { label: '数据行数', value: String(data.length) },
      { label: '列数', value: String(columns.length || (data[0] ? Object.keys(data[0]).length : 0)) },
      { label: '输出字符数', value: String(result.value.length) }
    ]
  } catch (err) {
    error.value = err.message
  }
}

function loadSample() {
  input.value = sample
  convert()
}

function clearAll() {
  input.value = ''
  result.value = ''
  rows.value = []
  error.value = ''
}
</script>
