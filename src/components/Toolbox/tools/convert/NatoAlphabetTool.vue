<template>
  <ToolPage
    title="北约音标字母转换"
    description="字母 A-Z 与数字 0-9 对应 NATO 音标词；空格、换行、制表符分别编码为 (space)、(newline)、(tab)。"
    category="convert"
  >
    <div class="toolbox-panel">
      <el-form label-position="top" class="toolbox-form">
        <el-form-item label="模式">
          <el-radio-group v-model="mode">
            <el-radio-button value="encode">文本 → 音标词</el-radio-button>
            <el-radio-button value="decode">音标词 → 文本</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item :label="mode === 'encode' ? '文本' : 'NATO 音标词'">
          <el-input
            v-model="input"
            type="textarea"
            :rows="5"
            :placeholder="mode === 'encode' ? '例如 Hello 123' : '例如 Hotel Echo Lima Lima Oscar One Two Three'"
            class="toolbox-mono"
          />
        </el-form-item>
        <el-form-item label="词间分隔符">
          <el-select v-model="separator" class="toolbox-field-full">
            <el-option label="空格" value=" " />
            <el-option label="斜杠空格" value=" / " />
            <el-option label="逗号空格" value=", " />
            <el-option label="换行" value="\n" />
          </el-select>
        </el-form-item>
        <p class="toolbox-hint">
          解码时按所选分隔符切分词条；X-ray 自带连字符，若用短横线作分隔符会无法区分，因此未提供短横线选项。
        </p>
      </el-form>
    </div>

    <ToolResult
      label="转换结果"
      :text="result"
      :error="error"
      filename="nato.txt"
      empty-text="输入文本或音标词后点击转换。"
    />
  </ToolPage>
</template>

<script setup>
import ToolPage from '@/components/Toolbox/ToolPage.vue'
import ToolResult from '@/components/Toolbox/ToolResult.vue'
import { natoToText, textToNato } from '@/utils/toolbox/encoding'

const mode = ref('encode')
const input = ref('Hello 123')
const separator = ref(' ')
const result = ref('')
const error = ref('')

const actualSeparator = computed(() => (separator.value === '\\n' ? '\n' : separator.value))

function convert() {
  error.value = ''
  try {
    result.value =
      mode.value === 'encode'
        ? textToNato(input.value, actualSeparator.value)
        : natoToText(input.value, actualSeparator.value)
  } catch (err) {
    result.value = ''
    error.value = err.message
  }
}

watch([mode, input, separator], () => {
  result.value = ''
  error.value = ''
})
</script>
