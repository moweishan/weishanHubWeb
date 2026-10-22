<template>
  <ToolPage
    title="XML 转 JSON"
    description="使用 fast-xml-parser 解析 XML。属性默认加 @_ 前缀，文本节点可配置名称；转换不是无损往返，注释、CDATA、命名空间前缀和混合内容可能被重写。"
    category="convert"
  >
    <div class="toolbox-panel">
      <el-form label-position="top" class="toolbox-form">
        <el-form-item label="XML 内容">
          <el-input v-model="input" type="textarea" :rows="10" class="toolbox-mono" placeholder="<root><item id=&quot;1&quot;>文本</item></root>" />
        </el-form-item>
        <el-row :gutter="14">
          <el-col :xs="24" :sm="8">
            <el-form-item label="属性">
              <el-checkbox v-model="attributes">保留为 @_ 前缀字段</el-checkbox>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="8">
            <el-form-item label="文本节点名">
              <el-select v-model="textNode" class="toolbox-field-full">
                <el-option label="#text" value="#text" />
                <el-option label="$text" value="$text" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="8">
            <el-form-item label="值类型">
              <el-checkbox v-model="parseValues">尝试解析数字/布尔值</el-checkbox>
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
      label="JSON 结果"
      :text="result"
      :rows="rows"
      :error="error"
      :warning="warning"
      filename="xml.json"
      clearable
      @clear="result = ''"
    />
  </ToolPage>
</template>

<script setup>
import ToolPage from '@/components/Toolbox/ToolPage.vue'
import ToolResult from '@/components/Toolbox/ToolResult.vue'
import { parseJson, xmlToJson } from '@/utils/toolbox/structured'

const sample = '<?xml version="1.0" encoding="UTF-8"?>\n<catalog>\n  <book id="b1" lang="zh">\n    <title>XML 指南</title>\n    <price>59.9</price>\n  </book>\n  <book id="b2" lang="en">\n    <title>JSON 指南</title>\n    <price>39.9</price>\n  </book>\n</catalog>'
const input = ref(sample)
const attributes = ref(true)
const textNode = ref('#text')
const parseValues = ref(false)
const result = ref('')
const rows = ref([])
const error = ref('')
const warning = computed(() => [
  'XML 与 JSON 的数据模型不同，本转换不承诺无损；重复元素会变成数组，单个元素不会自动变成数组。',
  attributes.value ? '属性以 @_ 前缀写入对象；与同名元素冲突时需要人工调整。' : '当前忽略属性，属性值不会出现在结果中。',
  '注释、处理指令、CDATA 与命名空间前缀不是 JSON 的原生概念，可能丢失或折叠。'
])

function convert() {
  error.value = ''
  result.value = ''
  rows.value = []
  try {
    result.value = xmlToJson(input.value, {
      attributes: attributes.value,
      textNode: textNode.value,
      parseValues: parseValues.value
    })
    const parsed = parseJson(result.value)
    const roots = parsed && typeof parsed === 'object' ? Object.keys(parsed) : []
    rows.value = [
      { label: '根元素', value: roots.join(', ') || '-' },
      { label: '顶层键数', value: String(roots.length) },
      { label: '输出字符数', value: String(result.value.length) }
    ]
  } catch (err) {
    error.value = err.message
  }
}

function loadSample() {
  input.value = sample
  result.value = ''
  rows.value = []
  error.value = ''
}

function clearAll() {
  input.value = ''
  result.value = ''
  rows.value = []
  error.value = ''
}
</script>
