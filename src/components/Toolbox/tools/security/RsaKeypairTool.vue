<template>
  <ToolPage
    title="RSA 密钥对生成"
    description="在浏览器内生成 RSA-OAEP 密钥对，导出 PKCS#8 私钥与 SPKI 公钥 PEM。私钥只保留在当前组件内存，离开页面即清除。"
    category="security"
  >
    <div class="toolbox-panel">
      <el-form label-position="top" class="toolbox-form">
        <el-row :gutter="14">
          <el-col :xs="24" :sm="8">
            <el-form-item label="模长（位）">
              <el-select v-model="modulusLength" class="toolbox-field-full">
                <el-option :value="2048" label="2048（常用）" />
                <el-option :value="3072" label="3072" />
                <el-option :value="4096" label="4096（较慢）" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="8">
            <el-form-item label="OAEP 摘要">
              <el-select v-model="hash" class="toolbox-field-full">
                <el-option label="SHA-256" value="SHA-256" />
                <el-option label="SHA-384" value="SHA-384" />
                <el-option label="SHA-512" value="SHA-512" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="8">
            <el-form-item label="操作">
              <el-button type="primary" icon="Key" :loading="loading" @click="generate">生成密钥对</el-button>
            </el-form-item>
          </el-col>
        </el-row>
        <p class="toolbox-hint">
          生成的是 RSA-OAEP 加解密密钥，不是签名密钥。PEM 可直接保存；私钥泄露等同于身份泄露。
        </p>
      </el-form>
    </div>

    <div v-if="keys" class="toolbox-grid toolbox-grid--2">
      <ToolResult
        label="私钥 PKCS#8（敏感）"
        :text="keys.privateKeyPem"
        :rows="rows"
        :error="error"
        :warning="'私钥不要提交到仓库、日志或聊天工具；关闭页面后本工具不保留。'"
        filename="rsa-private.pem"
        mime="application/x-pem-file"
        clearable
        @clear="clearAll"
      />
      <ToolResult
        label="公钥 SPKI"
        :text="keys.publicKeyPem"
        :rows="[]"
        :error="''"
        filename="rsa-public.pem"
        mime="application/x-pem-file"
      />
    </div>
    <ToolResult v-else label="密钥对" :text="''" :error="error" empty-text="选择参数后点击生成；4096 位在部分设备上可能需要数秒。" />
  </ToolPage>
</template>

<script setup>
import { ElMessage } from 'element-plus'
import ToolPage from '@/components/Toolbox/ToolPage.vue'
import ToolResult from '@/components/Toolbox/ToolResult.vue'
import { generateRsaKeyPair } from '@/utils/toolbox/crypto'

const modulusLength = ref(2048)
const hash = ref('SHA-256')
const keys = ref(null)
const error = ref('')
const loading = ref(false)

const rows = computed(() => {
  if (!keys.value) return []
  return [
    { label: '算法', value: keys.value.algorithm },
    { label: '模长', value: `${keys.value.modulusLength} 位` },
    { label: '摘要', value: keys.value.hash },
    { label: '公钥指数', value: String(keys.value.publicExponent) },
    { label: '生成时间', value: keys.value.createdAt }
  ]
})

async function generate() {
  error.value = ''
  keys.value = null
  loading.value = true
  try {
    keys.value = await generateRsaKeyPair({ modulusLength: modulusLength.value, hash: hash.value })
    ElMessage.success('RSA 密钥对已生成')
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

function clearAll() {
  keys.value = null
  error.value = ''
}

onDeactivated(clearAll)
</script>
