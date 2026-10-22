<template>
  <ToolPage
    title="文本加密与解密"
    description="AES-GCM 256 + PBKDF2-SHA-256，随机 salt 与 iv，输出带格式标识、版本、迭代次数的 JSON。密码错误或密文损坏会明确失败。"
    category="security"
  >
    <div class="toolbox-panel">
      <el-form label-position="top" class="toolbox-form">
        <el-form-item label="操作">
          <el-radio-group v-model="mode">
            <el-radio-button value="encrypt">加密文本</el-radio-button>
            <el-radio-button value="decrypt">解密密文</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="密码">
          <el-input v-model="password" type="password" show-password placeholder="输入加密/解密密码" />
        </el-form-item>
        <el-form-item :label="mode === 'encrypt' ? '明文' : '带版本的密文 JSON'">
          <el-input
            v-model="payload"
            type="textarea"
            :rows="8"
            class="toolbox-mono"
            :placeholder="mode === 'encrypt' ? '输入要加密的文本' : '粘贴 加密 生成的完整 JSON'"
          />
        </el-form-item>
        <el-row v-if="mode === 'encrypt'" :gutter="14">
          <el-col :xs="24" :sm="10">
            <el-form-item label="PBKDF2 迭代次数">
              <el-select v-model="iterations" class="toolbox-field-full">
                <el-option :value="100000" label="100,000" />
                <el-option :value="210000" label="210,000（推荐）" />
                <el-option :value="300000" label="300,000" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <div class="toolbox-actions">
          <el-button type="primary" icon="Lock" :loading="loading" @click="execute">
            {{ mode === 'encrypt' ? '加密' : '解密' }}
          </el-button>
          <el-button icon="Delete" @click="clearAll">清空</el-button>
        </div>
        <p class="toolbox-hint">
          密文格式：weishanhub-aes-gcm / v1 / AES-GCM / PBKDF2 / SHA-256，包含随机 16 字节 salt、12 字节 iv 与认证标签。密码不会保存。
        </p>
      </el-form>
    </div>

    <ToolResult
      label="结果"
      :text="result"
      :rows="rows"
      :error="error"
      :warning="warning"
      filename="encrypted.json"
      mime="application/json;charset=utf-8"
      clearable
      @clear="clearAll"
    />
  </ToolPage>
</template>

<script setup>
import ToolPage from '@/components/Toolbox/ToolPage.vue'
import ToolResult from '@/components/Toolbox/ToolResult.vue'
import { decryptText, encryptText } from '@/utils/toolbox/crypto'

const mode = ref('encrypt')
const password = ref('')
const payload = ref('')
const iterations = ref(210000)
const result = ref('')
const rows = ref([])
const error = ref('')
const warning = 'AES-GCM 提供机密性与完整性，但无法防止密码被离线暴力尝试；请使用高强度密码并妥善保存密文。'
const loading = ref(false)

async function execute() {
  error.value = ''
  result.value = ''
  rows.value = []
  loading.value = true
  try {
    if (mode.value === 'encrypt') {
      result.value = await encryptText(password.value, payload.value, { iterations: iterations.value })
      rows.value = [
        { label: '算法', value: 'AES-GCM 256' },
        { label: 'KDF', value: `PBKDF2-SHA-256（${iterations.value} 次）` },
        { label: '输出长度', value: `${result.value.length} 字符` }
      ]
    } else {
      result.value = await decryptText(password.value, payload.value)
      rows.value = [
        { label: '算法', value: 'AES-GCM 256' },
        { label: '解密结果', value: '认证通过' },
        { label: '明文字符数', value: String(result.value.length) }
      ]
    }
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

function clearAll() {
  password.value = ''
  payload.value = ''
  result.value = ''
  rows.value = []
  error.value = ''
}

watch(mode, () => {
  result.value = ''
  rows.value = []
  error.value = ''
})

onDeactivated(clearAll)
</script>
