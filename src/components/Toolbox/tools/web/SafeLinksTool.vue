<template>
  <ToolPage
    title="Safe Links 解码"
    description="只解析 Microsoft Safe Links 的 url 查询参数并展示目标地址，不访问第三方网址，不解析 data 等未支持参数。"
    category="web"
  >
    <div class="toolbox-panel">
      <el-form label-position="top" class="toolbox-form">
        <el-form-item label="Safe Links 地址">
          <el-input v-model="input" type="textarea" :rows="4" class="toolbox-mono" placeholder="https://...safelinks.protection.outlook.com/?url=..." />
        </el-form-item>
        <div class="toolbox-actions">
          <el-button type="primary" icon="Search" @click="parse">解析</el-button>
          <el-button icon="DocumentAdd" @click="loadSample">载入示例</el-button>
          <el-button icon="Delete" @click="clearAll">清空</el-button>
        </div>
        <p class="toolbox-hint">
          本工具不会请求目标地址，也不做信誉判断。打开按钮需要你主动点击，并使用 noopener noreferrer。
        </p>
      </el-form>
    </div>

    <ToolResult
      label="解码结果"
      :text="result?.target || ''"
      :rows="rows"
      :error="error"
      :warning="result?.warnings || []"
      filename="safe-links.txt"
      clearable
      @clear="clearAll"
    >
      <div v-if="result" class="toolbox-actions">
        <el-button type="warning" icon="TopRight" @click="openTarget">主动打开目标地址</el-button>
      </div>
    </ToolResult>
  </ToolPage>
</template>

<script setup>
import { ElMessage } from 'element-plus'
import ToolPage from '@/components/Toolbox/ToolPage.vue'
import ToolResult from '@/components/Toolbox/ToolResult.vue'
import { parseSafeLinks } from '@/utils/toolbox/web'

const target = 'https://example.com/path?q=hello%20world&lang=zh'
const input = ref(`https://nam12.safelinks.protection.outlook.com/?url=${encodeURIComponent(target)}&data=05%7Cexample&reserved=0`)
const result = ref(null)
const error = ref('')

const rows = computed(() => {
  if (!result.value) return []
  return [
    { label: 'Safe Links 主机', value: result.value.safeLinksHost },
    { label: '目标主机', value: result.value.targetHost },
    { label: '目标协议', value: result.value.targetProtocol },
    { label: '目标路径', value: result.value.targetPath },
    { label: '包含 data 参数', value: result.value.hasDataParam ? '是（未解析）' : '否' }
  ]
})

function parse() {
  error.value = ''
  result.value = null
  try {
    result.value = parseSafeLinks(input.value)
  } catch (err) {
    error.value = err.message
  }
}

function loadSample() {
  parse()
}

function openTarget() {
  if (!result.value) return
  try {
    const anchor = document.createElement('a')
    anchor.href = result.value.target
    anchor.target = '_blank'
    anchor.rel = 'noopener noreferrer'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
  } catch (err) {
    ElMessage.error(err.message)
  }
}

function clearAll() {
  input.value = ''
  result.value = null
  error.value = ''
}
</script>
