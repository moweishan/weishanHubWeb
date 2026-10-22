<template>
  <ToolPage
    title="JSON 转 XML"
    description="使用 fast-xml-parser 的 XMLBuilder 构建 XML。对象键会成为元素名；以 @_ 开头的键表示属性，#text 表示文本内容。输出只作为文本复制或下载。"
    category="convert"
  >
    <div class="toolbox-panel">
      <el-form label-position="top" class="toolbox-form">
        <el-form-item label="JSON 对象">
          <el-input v-model="input" type="textarea" :rows="10" class="toolbox-mono" />
        </el-form-item>
        <el-row :gutter="14">
          <el-col :xs="24" :sm="8">
            <el-form-item label="根元素名">
              <el-input v-model="rootName" placeholder="root" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="8">
            <el-form-item label="缩进">
              <el-select v-model="indent" class="toolbox-field-full">
                <el-option label="2 空格" :value="2" />
                <el-option label="4 空格" :value="4" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="8">
            <el-form-item label="XML 声明">
              <el-switch v-model="declaration" active-text="包含" inactive-text="不包含" />
            </el-form-item>
          </el-col>
        </el-row>
        <div class="toolbox-actions">
          <el-button type="primary" icon="Switch" @click="convert">转换</el-button>
          <el-button icon="DocumentAdd" @click="loadSample">载入示例</el-button>
          <el-button icon="Delete" @click="clearAll">清空</el-button>
        </div>
        <p class="toolbox-hint">
          属性示例：<code>{"@_id":"1"}</code>；文本示例：<code>{"#text":"内容"}</code>。数组会生成重复同名元素。
        </p>
      </el-form>
    </div>

    <ToolResult
      label="XML 结果"
      :text="result"
      :error="error"
      :warning="warning"
      filename="data.xml"
      mime="application/xml;charset=utf-8"
      clearable
      @clear="result = ''"
    />
  </ToolPage>
</template>

<script setup>
import ToolPage from '@/components/Toolbox/ToolPage.vue'
import ToolResult from '@/components/Toolbox/ToolResult.vue'
import { jsonToXml } from '@/utils/toolbox/structured'

const sample = JSON.stringify(
  {
    catalog: {
      '@_version': '1.0',
      book: [
        { '@_id': 'b1', title: 'XML 指南', price: 59.9 },
        { '@_id': 'b2', title: 'JSON 指南', price: 39.9 }
      ]
    }
  },
  null,
  2
)
const input = ref(sample)
const rootName = ref('root')
const indent = ref(2)
const declaration = ref(true)
const result = ref('')
const error = ref('')
const warning = 'XML 元素名、属性名与文本内容不会被自动转义为业务安全格式；属性需要使用 @_ 前缀表达，JSON 数组中的 null/对象结构可能无法直观映射。'

function convert() {
  error.value = ''
  result.value = ''
  try {
    result.value = jsonToXml(input.value, {
      rootName: rootName.value,
      indent: indent.value,
      declaration: declaration.value
    })
  } catch (err) {
    error.value = err.message
  }
}

function loadSample() {
  input.value = sample
  result.value = ''
  error.value = ''
}

function clearAll() {
  input.value = ''
  result.value = ''
  error.value = ''
}
</script>
