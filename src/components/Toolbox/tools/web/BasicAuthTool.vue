<template>
  <ToolPage
    title="Basic Auth 生成"
    description="按 UTF-8 生成或解析 HTTP Basic Authorization。Basic Auth 只是 Base64 编码，不是加密；请只在 HTTPS 下使用。"
    category="web"
  >
    <div class="toolbox-panel">
      <el-form label-position="top" class="toolbox-form">
        <el-form-item label="操作">
          <el-radio-group v-model="mode">
            <el-radio-button value="generate">生成请求头</el-radio-button>
            <el-radio-button value="parse">解析请求头</el-radio-button>
          </el-radio-group>
        </el-form-item>

        <template v-if="mode === 'generate'">
          <el-row :gutter="14">
            <el-col :xs="24" :sm="12">
              <el-form-item label="用户名（UTF-8）">
                <el-input v-model="username" clearable placeholder="user" />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12">
              <el-form-item label="密码（UTF-8）">
                <el-input v-model="password" type="password" show-password placeholder="密码" />
              </el-form-item>
            </el-col>
          </el-row>
          <div class="toolbox-actions">
            <el-button type="primary" icon="Key" @click="generate">生成</el-button>
            <el-button icon="Delete" @click="clearAll">清空</el-button>
          </div>
        </template>

        <template v-else>
          <el-form-item label="Authorization 请求头">
            <el-input v-model="headerInput" type="textarea" :rows="4" class="toolbox-mono" placeholder="Basic dXNlcjpwYXNz" />
          </el-form-item>
          <el-checkbox v-model="showSecret">显示解析出的密码</el-checkbox>
          <div class="toolbox-actions">
            <el-button type="primary" icon="Search" @click="parse">解析</el-button>
            <el-button icon="Delete" @click="clearAll">清空</el-button>
          </div>
        </template>
      </el-form>
    </div>

    <ToolResult
      label="结果"
      :text="result"
      :rows="rows"
      :error="error"
      :warning="warning"
      filename="basic-auth.txt"
      clearable
      @clear="clearAll"
    />
  </ToolPage>
</template>

<script setup>
import ToolPage from '@/components/Toolbox/ToolPage.vue'
import ToolResult from '@/components/Toolbox/ToolResult.vue'
import { buildBasicAuth, parseBasicAuth } from '@/utils/toolbox/encoding'

const mode = ref('generate')
const username = ref('')
const password = ref('')
const headerInput = ref('')
const showSecret = ref(false)
const result = ref('')
const rows = ref([])
const error = ref('')
const warning = ref('Basic Auth 凭据可被 Base64 直接还原，请勿在非 HTTPS 环境发送。')

function generate() {
  error.value = ''
  rows.value = []
  try {
    if (!username.value) throw new Error('请输入用户名')
    result.value = buildBasicAuth(username.value, password.value)
    rows.value = [
      { label: '用户名', value: username.value },
      { label: '密码长度', value: `${password.value.length} 字符` }
    ]
  } catch (err) {
    result.value = ''
    error.value = err.message
  }
}

function parse() {
  error.value = ''
  rows.value = []
  try {
    const parsed = parseBasicAuth(headerInput.value)
    result.value = `Authorization: Basic ...（已成功解码）`
    rows.value = [
      { label: '用户名', value: parsed.username },
      { label: '密码', value: showSecret.value ? parsed.password : '***（勾选后显示）' }
    ]
  } catch (err) {
    result.value = ''
    error.value = err.message
  }
}

function clearAll() {
  username.value = ''
  password.value = ''
  headerInput.value = ''
  result.value = ''
  rows.value = []
  error.value = ''
  showSecret.value = false
}

watch(mode, () => {
  result.value = ''
  rows.value = []
  error.value = ''
})

onDeactivated(clearAll)
</script>
