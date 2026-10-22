<template>
  <ToolPage
    title="JWT 解析"
    description="解码 JWT 的 Header 与 Payload，展示 exp/iat/nbf 时间声明。仅解码，不验证签名、签发者或权限。"
    category="web"
  >
    <div class="toolbox-panel">
      <el-form label-position="top" class="toolbox-form">
        <el-form-item label="JWT">
          <el-input v-model="input" type="textarea" :rows="6" class="toolbox-mono" placeholder="粘贴三段式 JWT" />
        </el-form-item>
        <div class="toolbox-actions">
          <el-button type="primary" icon="Search" @click="parse">解析</el-button>
          <el-button icon="DocumentAdd" @click="loadSample">载入示例</el-button>
          <el-button icon="Delete" @click="clearAll">清空</el-button>
        </div>
        <el-alert
          type="warning"
          :closable="false"
          show-icon
          title="本工具不会验证签名。任何被篡改的 Payload 也能成功解码，不能据此判断令牌可信。"
          style="margin-top: 12px"
        />
      </el-form>
    </div>

    <template v-if="decoded">
      <div class="toolbox-panel">
        <div class="toolbox-inline">
          <el-tag :type="decoded.status.expired ? 'danger' : decoded.status.expired === false ? 'success' : 'info'">
            {{ decoded.status.expired === null ? '无 exp 声明' : decoded.status.expired ? '已过期' : '未过期（仅按时间判断）' }}
          </el-tag>
          <el-tag v-if="decoded.status.notBefore" type="warning">尚未生效（nbf）</el-tag>
          <el-tag v-if="decoded.status.issuedInFuture" type="warning">iat 晚于当前时间</el-tag>
          <el-tag type="info">alg: {{ decoded.header.alg }}</el-tag>
          <el-tag v-if="decoded.header.alg === 'none'" type="danger">未签名令牌</el-tag>
        </div>
      </div>

      <div class="toolbox-grid toolbox-grid--2">
        <div class="toolbox-panel">
          <h3 class="toolbox-panel__title"><el-icon><Document /></el-icon>Header</h3>
          <pre class="toolbox-code">{{ headerText }}</pre>
        </div>
        <div class="toolbox-panel">
          <h3 class="toolbox-panel__title"><el-icon><Document /></el-icon>Payload</h3>
          <pre class="toolbox-code">{{ payloadText }}</pre>
        </div>
      </div>

      <ToolResult
        label="声明与时间"
        :text="jsonText"
        :rows="rows"
        :error="error"
        :warning="decoded.note"
        filename="jwt-decoded.json"
        clearable
        @clear="clearAll"
      />
    </template>
    <ToolResult v-else label="声明与时间" :text="''" :error="error" empty-text="粘贴 JWT 后点击解析。" />
  </ToolPage>
</template>

<script setup>
import ToolPage from '@/components/Toolbox/ToolPage.vue'
import ToolResult from '@/components/Toolbox/ToolResult.vue'
import { decodeJwt } from '@/utils/toolbox/jwt'

const sample =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
const input = ref(sample)
const decoded = ref(null)
const error = ref('')

const headerText = computed(() => (decoded.value ? JSON.stringify(decoded.value.header, null, 2) : ''))
const payloadText = computed(() => (decoded.value ? JSON.stringify(decoded.value.payload, null, 2) : ''))
const jsonText = computed(() =>
  decoded.value ? JSON.stringify({ header: decoded.value.header, payload: decoded.value.payload, status: decoded.value.status }, null, 2) : ''
)
const rows = computed(() => {
  if (!decoded.value) return []
  const result = [
    { label: '签名段长度', value: `${decoded.value.signature.length} 字符` },
    { label: '签名验证', value: '未验证（仅解码）' }
  ]
  for (const [name, value] of Object.entries(decoded.value.times)) {
    result.push({ label: `${name} 时间`, value: `${value.local}（${value.iso}）` })
  }
  for (const claim of ['iss', 'sub', 'aud', 'jti']) {
    if (decoded.value.payload[claim] !== undefined) {
      result.push({ label: claim, value: String(decoded.value.payload[claim]) })
    }
  }
  return result
})

function parse() {
  error.value = ''
  decoded.value = null
  try {
    decoded.value = decodeJwt(input.value)
  } catch (err) {
    error.value = err.message
  }
}

function loadSample() {
  input.value = sample
  parse()
}

function clearAll() {
  input.value = ''
  decoded.value = null
  error.value = ''
}

onDeactivated(clearAll)
</script>
