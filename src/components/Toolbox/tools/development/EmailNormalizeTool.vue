<template>
  <ToolPage
    title="邮箱地址规范化"
    description="校验邮箱并规范化大小写、加号标签、Gmail 点号与国际域名 Punycode。规范化会改变地址字符串，请确认是否仍能收到邮件。"
    category="development"
  >
    <div class="toolbox-panel">
      <el-form label-position="top" class="toolbox-form">
        <el-form-item label="邮箱地址">
          <el-input v-model="input" clearable placeholder="例如 User.Name+tag@Gmail.com" />
        </el-form-item>
        <div class="toolbox-check-group">
          <el-checkbox v-model="options.lowerLocal">本地部分转小写</el-checkbox>
          <el-checkbox v-model="options.lowerDomain">域名转小写</el-checkbox>
          <el-checkbox v-model="options.removePlusTag">移除加号标签 +tag</el-checkbox>
          <el-checkbox v-model="options.removeGmailDots">移除 Gmail 点号</el-checkbox>
        </div>
        <div class="toolbox-actions">
          <el-button type="primary" icon="MagicStick" @click="normalize">规范化</el-button>
          <el-button icon="Delete" @click="clearAll">清空</el-button>
        </div>
        <p class="toolbox-hint">
          加号标签与 Gmail 点号在部分服务商中会改变投递目标；本工具仅按开关做字符串处理，不查询 DNS 或验证邮箱是否存在。
        </p>
      </el-form>
    </div>

    <ToolResult
      label="规范化结果"
      :text="result?.email || ''"
      :rows="rows"
      :error="error"
      :warning="result?.warnings || []"
      filename="email.txt"
      clearable
      @clear="clearAll"
    />
  </ToolPage>
</template>

<script setup>
import ToolPage from '@/components/Toolbox/ToolPage.vue'
import ToolResult from '@/components/Toolbox/ToolResult.vue'
import { normalizeEmail } from '@/utils/toolbox/email'

const input = ref('User.Name+tag@Gmail.com')
const options = reactive({
  lowerLocal: false,
  lowerDomain: true,
  removePlusTag: false,
  removeGmailDots: false
})
const result = ref(null)
const rows = ref([])
const error = ref('')

function normalize() {
  error.value = ''
  result.value = null
  rows.value = []
  try {
    const normalized = normalizeEmail(input.value, options)
    result.value = normalized
    rows.value = [
      { label: '本地部分', value: normalized.local },
      { label: '域名', value: normalized.domain },
      { label: '是否 Gmail', value: normalized.isGmail ? '是' : '否' },
      { label: '变更项', value: normalized.changes.length ? normalized.changes.join('；') : '无' }
    ]
  } catch (err) {
    error.value = err.message
  }
}

function clearAll() {
  input.value = ''
  result.value = null
  rows.value = []
  error.value = ''
}

onMounted(normalize)
</script>
