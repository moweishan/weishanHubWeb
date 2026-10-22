<template>
  <ToolPage
    title="文本与 Unicode 转换"
    description="支持 U+ 码点、JavaScript \\u 转义、UTF-16 代理对转义与 HTML 数字实体。默认不插入分隔符，保证编码后可原样解码。"
    category="convert"
  >
    <div class="toolbox-panel">
      <el-form label-position="top" class="toolbox-form">
        <el-form-item label="模式">
          <el-radio-group v-model="mode">
            <el-radio-button value="encode">文本 → Unicode</el-radio-button>
            <el-radio-button value="decode">Unicode → 文本</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item :label="mode === 'encode' ? '文本' : 'Unicode 转义 / 实体'">
          <el-input
            v-model="input"
            type="textarea"
            :rows="6"
            :placeholder="mode === 'encode' ? '例如 你好 👋' : '例如 U+4F60U+597DU+1F44B'"
            class="toolbox-mono"
          />
        </el-form-item>
        <el-form-item v-if="mode === 'encode'" label="输出样式">
          <el-select v-model="style" class="toolbox-field-full">
            <el-option label="U+ 码点（U+1F44B）" value="code-point" />
            <el-option label="JavaScript 转义（\\u{1F44B}）" value="js" />
            <el-option label="UTF-16 代理对（\\uD83D\\uDC4B）" value="utf16" />
            <el-option label="HTML 数字实体（&#x1F44B;）" value="html" />
          </el-select>
        </el-form-item>
        <p class="toolbox-hint">
          解码结果只作为纯文本展示，不会写入 v-html；HTML 数字实体也不会触发 DOM 解析。
        </p>
      </el-form>
    </div>

    <ToolResult
      label="转换结果"
      :text="result"
      :error="error"
      filename="unicode.txt"
      empty-text="输入文本或 Unicode 表示后点击转换。"
    />
  </ToolPage>
</template>

<script setup>
import ToolPage from '@/components/Toolbox/ToolPage.vue'
import ToolResult from '@/components/Toolbox/ToolResult.vue'
import { textToUnicode, unicodeToText } from '@/utils/toolbox/encoding'

const mode = ref('encode')
const input = ref('你好 👋')
const style = ref('code-point')
const result = ref('')
const error = ref('')

function convert() {
  error.value = ''
  try {
    result.value = mode.value === 'encode' ? textToUnicode(input.value, style.value) : unicodeToText(input.value)
  } catch (err) {
    result.value = ''
    error.value = err.message
  }
}

watch([mode, input, style], () => {
  result.value = ''
  error.value = ''
})
</script>
