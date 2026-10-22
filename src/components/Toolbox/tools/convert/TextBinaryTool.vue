<template>
  <ToolPage
    title="文本与二进制转换"
    description="按 UTF-8 编码把文本转为 8 位二进制字节，或把二进制还原为 UTF-8 文本。解码时会忽略空格、逗号等分隔符，但要求 0/1 位数为 8 的倍数。"
    category="convert"
  >
    <div class="toolbox-panel">
      <el-form label-position="top" class="toolbox-form">
        <el-form-item label="模式">
          <el-radio-group v-model="mode">
            <el-radio-button value="encode">文本 → 二进制</el-radio-button>
            <el-radio-button value="decode">二进制 → 文本</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item :label="mode === 'encode' ? 'UTF-8 文本' : '8 位二进制'">
          <el-input
            v-model="input"
            type="textarea"
            :rows="6"
            :placeholder="mode === 'encode' ? '例如 你好 👋' : '例如 11100100 10111101 10100000'"
            class="toolbox-mono"
          />
        </el-form-item>
        <el-form-item v-if="mode === 'encode'" label="字节分隔符">
          <el-select v-model="separator" class="toolbox-field-full">
            <el-option label="空格" value=" " />
            <el-option label="无分隔" value="" />
            <el-option label="逗号" value="," />
            <el-option label="换行" value="\n" />
          </el-select>
        </el-form-item>
      </el-form>
    </div>

    <ToolResult
      label="转换结果"
      :rows="rows"
      :text="result"
      :error="error"
      filename="binary.txt"
      empty-text="输入文本或二进制后点击转换。"
    />
  </ToolPage>
</template>

<script setup>
import ToolPage from '@/components/Toolbox/ToolPage.vue'
import ToolResult from '@/components/Toolbox/ToolResult.vue'
import { binaryToText, textToBinary, textToBytes } from '@/utils/toolbox/encoding'

const mode = ref('encode')
const input = ref('你好 👋')
const separator = ref(' ')
const result = ref('')
const rows = ref([])
const error = ref('')

function convert() {
  error.value = ''
  result.value = ''
  rows.value = []
  try {
    if (mode.value === 'encode') {
      const bytes = textToBytes(input.value)
      result.value = textToBinary(input.value, separator.value === '\\n' ? '\n' : separator.value)
      rows.value = [
        { label: 'UTF-8 字节数', value: String(bytes.length) },
        { label: '二进制位数', value: String(bytes.length * 8) }
      ]
    } else {
      result.value = binaryToText(input.value)
      const bytes = textToBytes(result.value)
      rows.value = [
        { label: '还原字节数', value: String(bytes.length) },
        { label: '字符数', value: String(Array.from(result.value).length) }
      ]
    }
  } catch (err) {
    error.value = err.message
  }
}

watch([mode, input, separator], () => {
  result.value = ''
  rows.value = []
  error.value = ''
})
</script>
