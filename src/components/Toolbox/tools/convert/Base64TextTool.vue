<template>
  <ToolPage
    title="Base64 文本编解码"
    description="使用 TextEncoder/TextDecoder 按 UTF-8 处理文本，中文与 emoji 均可正确往返。解码失败会明确报错，不返回空字符串。"
    category="convert"
  >
    <div class="toolbox-panel">
      <el-form label-position="top" class="toolbox-form">
        <el-form-item label="模式">
          <el-radio-group v-model="mode">
            <el-radio-button value="encode">文本 → Base64</el-radio-button>
            <el-radio-button value="decode">Base64 → 文本</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item :label="mode === 'encode' ? 'UTF-8 文本' : 'Base64 内容'">
          <el-input
            v-model="input"
            type="textarea"
            :rows="7"
            :placeholder="mode === 'encode' ? '输入任意文本，例如 你好 👋' : '粘贴 Base64，支持换行与 URL-safe 字符'"
            class="toolbox-mono"
          />
        </el-form-item>
        <div class="toolbox-inline" v-if="mode === 'encode'">
          <el-checkbox v-model="urlSafe">URL-safe（-_ 并去掉填充）</el-checkbox>
          <el-checkbox v-model="wrap">每 76 字符换行</el-checkbox>
        </div>
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
      filename="base64-text.txt"
      clearable
      @clear="clearAll"
    />
  </ToolPage>
</template>

<script setup>
import ToolPage from '@/components/Toolbox/ToolPage.vue'
import ToolResult from '@/components/Toolbox/ToolResult.vue'
import { base64ToUtf8, utf8ToBase64 } from '@/utils/toolbox/encoding'

const mode = ref('encode')
const input = ref('你好，weishanHub 👋')
const urlSafe = ref(false)
const wrap = ref(false)
const result = ref('')
const error = ref('')
const warning = ref('')

function convert() {
  error.value = ''
  warning.value = ''
  try {
    if (mode.value === 'encode') {
      let value = utf8ToBase64(input.value)
      if (urlSafe.value) value = value.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
      if (wrap.value) value = value.replace(/.{1,76}/g, '$&\n').trim()
      result.value = value
      warning.value = value ? '' : '输入为空，结果为空的 Base64 字符串。'
    } else {
      if (!input.value.trim()) throw new Error('请输入 Base64 内容')
      result.value = base64ToUtf8(input.value)
    }
  } catch (err) {
    result.value = ''
    error.value = err.message
  }
}

function clearAll() {
  input.value = ''
  result.value = ''
  error.value = ''
  warning.value = ''
}

watch(mode, () => {
  result.value = ''
  error.value = ''
  warning.value = ''
})

onDeactivated(clearAll)
</script>
