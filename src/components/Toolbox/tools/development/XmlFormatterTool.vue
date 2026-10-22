<template>
  <ToolPage
    title="XML 格式化"
    description="校验并格式化 XML。转换会保留元素顺序，但注释、CDATA、命名空间前缀与空白可能被结构重写，不承诺无损还原。"
    category="development"
  >
    <div class="toolbox-panel">
      <el-form label-position="top" class="toolbox-form">
        <el-form-item label="XML">
          <el-input v-model="input" type="textarea" :rows="12" class="toolbox-mono" />
        </el-form-item>
        <el-row :gutter="14">
          <el-col :xs="24" :sm="8">
            <el-form-item label="缩进">
              <el-select v-model="indent" class="toolbox-field-full">
                <el-option label="2 空格" :value="2" />
                <el-option label="4 空格" :value="4" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="16">
            <el-form-item label="操作">
              <div class="toolbox-inline">
                <el-button type="primary" icon="MagicStick" @click="format">格式化</el-button>
                <el-button icon="DocumentAdd" @click="loadSample">载入示例</el-button>
                <el-button icon="Delete" @click="clearAll">清空</el-button>
              </div>
            </el-form-item>
          </el-col>
        </el-row>
        <el-alert
          type="warning"
          :closable="false"
          show-icon
          title="XML 格式化不是无损操作：注释、CDATA 文本、实体引用、命名空间声明与空白语义可能变化。"
        />
      </el-form>
    </div>

    <ToolResult
      label="格式化结果"
      :text="result"
      :rows="rows"
      :error="error"
      filename="formatted.xml"
      mime="application/xml;charset=utf-8"
      clearable
      @clear="result = ''"
    />
  </ToolPage>
</template>

<script setup>
import ToolPage from '@/components/Toolbox/ToolPage.vue'
import ToolResult from '@/components/Toolbox/ToolResult.vue'
import { formatXml } from '@/utils/toolbox/structured'

const sample = '<?xml version="1.0" encoding="UTF-8"?><catalog><book id="b1"><title>XML 指南</title><price>59.9</price></book></catalog>'
const input = ref(sample)
const indent = ref(2)
const result = ref('')
const rows = ref([])
const error = ref('')

function format() {
  error.value = ''
  result.value = ''
  rows.value = []
  try {
    result.value = formatXml(input.value, { indent: indent.value })
    rows.value = [
      { label: '元素数量', value: String((result.value.match(/<[^!?/][^>]*>/g) || []).length) },
      { label: '输出行数', value: String(result.value.split('\n').length) },
      { label: '声明', value: /^<\?xml/.test(result.value) ? '保留' : '未包含' }
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
