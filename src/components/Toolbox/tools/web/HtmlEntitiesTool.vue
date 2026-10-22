<template>
  <ToolPage
    title="HTML 实体编解码"
    description="编码 &、尖括号、引号及可选的非 ASCII 字符，或解码命名/数字实体。解码结果始终作为纯文本展示，绝不写入 v-html。"
    category="web"
  >
    <div class="toolbox-panel">
      <el-form label-position="top" class="toolbox-form">
        <el-form-item label="操作">
          <el-radio-group v-model="mode">
            <el-radio-button value="encode">编码</el-radio-button>
            <el-radio-button value="decode">解码</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="mode === 'encode'" label="编码范围">
          <el-select v-model="range" class="toolbox-field-full">
            <el-option label="仅 HTML 特殊字符" value="basic" />
            <el-option label="特殊字符 + 非 ASCII" value="non-ascii" />
            <el-option label="所有字符数字实体" value="all" />
          </el-select>
        </el-form-item>
        <el-form-item :label="mode === 'encode' ? '原始 HTML 文本' : '含实体的文本'">
          <el-input v-model="input" type="textarea" :rows="7" class="toolbox-mono" placeholder="<p>你好 &amp; 欢迎</p>" />
        </el-form-item>
        <div class="toolbox-actions">
          <el-button type="primary" icon="Switch" @click="convert">转换</el-button>
          <el-button icon="Delete" @click="clearAll">清空</el-button>
        </div>
      </el-form>
    </div>

    <ToolResult
      label="转换结果"
      :text="result"
      :error="error"
      :warning="warning"
      filename="html-entities.txt"
      clearable
      @clear="clearAll"
    />
  </ToolPage>
</template>

<script setup>
import ToolPage from '@/components/Toolbox/ToolPage.vue'
import ToolResult from '@/components/Toolbox/ToolResult.vue'
import { decodeHtmlEntities, encodeHtmlEntities } from '@/utils/toolbox/encoding'

const mode = ref('decode')
const range = ref('basic')
const input = ref('<p>你好 &amp; 欢迎 &#x1F44B;</p>')
const result = ref('')
const error = ref('')
const warning = '支持 HTML 标准完整命名实体与数字实体；非法实体按 he 规则处理。解码结果只是文本，不会渲染成 HTML。'

function convert() {
  error.value = ''
  try {
    result.value = mode.value === 'encode' ? encodeHtmlEntities(input.value, range.value) : decodeHtmlEntities(input.value)
  } catch (err) {
    result.value = ''
    error.value = err.message
  }
}

function clearAll() {
  input.value = ''
  result.value = ''
  error.value = ''
}

watch([mode, range], () => {
  result.value = ''
  error.value = ''
})
</script>
