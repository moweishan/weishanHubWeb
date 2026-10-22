<template>
  <ToolPage
    title="文本哈希计算"
    description="在浏览器内计算 SHA-1/SHA-256/SHA-384/SHA-512 摘要。哈希不可逆，无法从摘要还原原文。"
    category="security"
  >
    <div class="toolbox-panel">
      <el-form label-position="top" class="toolbox-form">
        <el-form-item label="文本（UTF-8）">
          <el-input v-model="input" type="textarea" :rows="7" class="toolbox-mono" />
        </el-form-item>
        <el-row :gutter="14">
          <el-col :xs="24" :sm="8">
            <el-form-item label="算法">
              <el-select v-model="algorithm" class="toolbox-field-full">
                <el-option label="SHA-1" value="SHA-1" />
                <el-option label="SHA-256" value="SHA-256" />
                <el-option label="SHA-384" value="SHA-384" />
                <el-option label="SHA-512" value="SHA-512" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="8">
            <el-form-item label="输出">
              <el-switch v-model="uppercase" active-text="大写十六进制" inactive-text="小写十六进制" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="8">
            <el-form-item label="操作">
              <div class="toolbox-inline">
                <el-button type="primary" icon="Key" :loading="loading" @click="calculate">计算哈希</el-button>
                <el-button icon="Delete" @click="clearAll">清空</el-button>
              </div>
            </el-form-item>
          </el-col>
        </el-row>
        <p class="toolbox-hint">SHA-1 仅用于兼容旧系统，不建议用于新安全设计。需要口令存储时请使用带 salt 的密码哈希算法。</p>
      </el-form>
    </div>

    <ToolResult
      label="摘要"
      :text="result"
      :rows="rows"
      :error="error"
      filename="sha.txt"
      clearable
      @clear="clearAll"
    />
  </ToolPage>
</template>

<script setup>
import ToolPage from '@/components/Toolbox/ToolPage.vue'
import ToolResult from '@/components/Toolbox/ToolResult.vue'
import { hashText } from '@/utils/toolbox/crypto'

const input = ref('weishanHub')
const algorithm = ref('SHA-256')
const uppercase = ref(false)
const result = ref('')
const rows = ref([])
const error = ref('')
const loading = ref(false)

async function calculate() {
  error.value = ''
  result.value = ''
  rows.value = []
  loading.value = true
  try {
    result.value = await hashText(input.value, { algorithm: algorithm.value, uppercase: uppercase.value })
    rows.value = [
      { label: '算法', value: algorithm.value },
      { label: 'UTF-8 字节数', value: String(new TextEncoder().encode(input.value).length) },
      { label: '摘要长度', value: `${result.value.length} 个十六进制字符` }
    ]
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

function clearAll() {
  input.value = ''
  result.value = ''
  rows.value = []
  error.value = ''
}

onMounted(calculate)
onDeactivated(clearAll)
</script>
