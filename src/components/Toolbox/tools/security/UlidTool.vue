<template>
  <ToolPage
    title="ULID 生成"
    description="使用 crypto 随机源生成可按时间排序的 ULID。支持使用当前时间或指定毫秒时间戳，时间部分不会溢出 48 位范围。"
    category="security"
  >
    <div class="toolbox-panel">
      <el-form label-position="top" class="toolbox-form">
        <el-row :gutter="14">
          <el-col :xs="24" :sm="8">
            <el-form-item label="时间来源">
              <el-radio-group v-model="mode">
                <el-radio-button value="now">当前时间</el-radio-button>
                <el-radio-button value="custom">指定时间戳</el-radio-button>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col v-if="mode === 'custom'" :xs="24" :sm="8">
            <el-form-item label="毫秒时间戳">
              <el-input-number v-model="timestamp" :min="0" :max="281474976710655" :step="1000" class="toolbox-field-full" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="8">
            <el-form-item label="数量">
              <el-input-number v-model="count" :min="1" :max="1000" class="toolbox-field-full" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="8">
            <el-form-item label="大小写">
              <el-switch v-model="uppercase" active-text="大写" inactive-text="小写" />
            </el-form-item>
          </el-col>
        </el-row>
        <div class="toolbox-actions">
          <el-button type="primary" icon="Refresh" @click="generate">生成 ULID</el-button>
          <el-button icon="Delete" @click="clearAll">清空</el-button>
        </div>
        <p class="toolbox-hint">
          ULID 前 10 个字符编码 48 位毫秒时间戳，其余为 80 位随机部分。相同毫秒内批量生成使用单调递增工厂，避免随机排序倒退。
        </p>
      </el-form>
    </div>

    <ToolResult
      label="ULID 列表"
      :text="result"
      :rows="rows"
      :error="error"
      filename="ulid.txt"
      clearable
      @clear="clearAll"
    />
  </ToolPage>
</template>

<script setup>
import ToolPage from '@/components/Toolbox/ToolPage.vue'
import ToolResult from '@/components/Toolbox/ToolResult.vue'
import { generateUlids } from '@/utils/toolbox/crypto'

const mode = ref('now')
const count = ref(10)
const timestamp = ref(Date.now())
const uppercase = ref(true)
const result = ref('')
const rows = ref([])
const error = ref('')

function generate() {
  error.value = ''
  result.value = ''
  rows.value = []
  try {
    const seed = mode.value === 'now' ? Date.now() : Number(timestamp.value)
    const list = generateUlids(count.value, seed, { uppercase: uppercase.value })
    result.value = list.join('\n')
    rows.value = [
      { label: '数量', value: String(list.length) },
      { label: '时间戳', value: String(seed) },
      { label: 'ISO 时间', value: new Date(seed).toISOString() },
      { label: '编码', value: 'Crockford Base32' }
    ]
  } catch (err) {
    error.value = err.message
  }
}

function clearAll() {
  result.value = ''
  rows.value = []
  error.value = ''
}
</script>
