<template>
  <ToolPage
    title="BCrypt 生成与校验"
    description="使用 bcryptjs 生成与校验 BCrypt 哈希。异步执行并限制 cost 4-12；BCrypt 最多处理 72 字节密码。"
    category="security"
  >
    <div class="toolbox-panel">
      <el-radio-group v-model="mode">
        <el-radio-button value="hash">生成哈希</el-radio-button>
        <el-radio-button value="verify">校验密码</el-radio-button>
      </el-radio-group>
    </div>

    <div v-if="mode === 'hash'" class="toolbox-panel">
      <el-form label-position="top" class="toolbox-form">
        <el-form-item label="密码（UTF-8）">
          <el-input v-model="password" type="password" show-password placeholder="输入要哈希的密码" />
        </el-form-item>
        <el-form-item label="Cost">
          <el-select v-model="cost" class="toolbox-field-full" style="max-width: 240px">
            <el-option v-for="value in [4, 6, 8, 10, 11, 12]" :key="value" :value="value" :label="`${value}${value >= 11 ? '（较慢）' : ''}`" />
          </el-select>
        </el-form-item>
        <p class="toolbox-hint">cost 每增加 1，计算量约翻倍。12 在低端设备上可能明显卡顿，但计算在异步任务中执行，避免阻塞渲染。</p>
        <div class="toolbox-actions">
          <el-button type="primary" icon="Key" :loading="loading" @click="generate">生成 BCrypt 哈希</el-button>
          <el-button icon="Delete" @click="clearAll">清空</el-button>
        </div>
      </el-form>
    </div>

    <div v-else class="toolbox-panel">
      <el-form label-position="top" class="toolbox-form">
        <el-form-item label="密码">
          <el-input v-model="password" type="password" show-password placeholder="输入待校验密码" />
        </el-form-item>
        <el-form-item label="BCrypt 哈希">
          <el-input v-model="hashInput" type="textarea" :rows="3" class="toolbox-mono" placeholder="$2b$10$..." />
        </el-form-item>
        <div class="toolbox-actions">
          <el-button type="primary" icon="CircleCheck" :loading="loading" @click="verify">校验</el-button>
          <el-button icon="Delete" @click="clearAll">清空</el-button>
        </div>
      </el-form>
    </div>

    <el-alert
      v-if="verifyResult !== null"
      :type="verifyResult ? 'success' : 'error'"
      :closable="false"
      show-icon
      :title="verifyResult ? '密码与哈希匹配' : '密码与哈希不匹配'"
    />

    <ToolResult
      label="结果"
      :text="result"
      :rows="rows"
      :error="error"
      filename="bcrypt.txt"
      clearable
      @clear="clearAll"
    />
  </ToolPage>
</template>

<script setup>
import ToolPage from '@/components/Toolbox/ToolPage.vue'
import ToolResult from '@/components/Toolbox/ToolResult.vue'
import { bcryptHash, bcryptVerify } from '@/utils/toolbox/password'

const mode = ref('hash')
const password = ref('')
const cost = ref(10)
const hashInput = ref('')
const result = ref('')
const rows = ref([])
const error = ref('')
const loading = ref(false)
const verifyResult = ref(null)

async function generate() {
  error.value = ''
  result.value = ''
  rows.value = []
  verifyResult.value = null
  loading.value = true
  try {
    result.value = await bcryptHash(password.value, cost.value)
    rows.value = [
      { label: 'cost', value: String(cost.value) },
      { label: '哈希长度', value: `${result.value.length} 字符` },
      { label: '算法', value: 'BCrypt' }
    ]
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

async function verify() {
  error.value = ''
  result.value = ''
  rows.value = []
  verifyResult.value = null
  loading.value = true
  try {
    verifyResult.value = await bcryptVerify(password.value, hashInput.value)
    result.value = verifyResult.value ? '校验通过' : '校验失败'
    rows.value = [
      { label: '结果', value: verifyResult.value ? '匹配' : '不匹配' },
      { label: '算法', value: 'BCrypt' }
    ]
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

function clearAll() {
  password.value = ''
  hashInput.value = ''
  result.value = ''
  rows.value = []
  error.value = ''
  verifyResult.value = null
}

watch(mode, () => {
  result.value = ''
  rows.value = []
  error.value = ''
  verifyResult.value = null
})

onDeactivated(clearAll)
</script>
