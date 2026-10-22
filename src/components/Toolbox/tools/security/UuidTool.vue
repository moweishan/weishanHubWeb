<template>
  <ToolPage
    title="UUID 生成"
    description="使用 crypto.randomUUID 生成 UUID v4，可批量生成并调整大小写、花括号与连字符。UUID 不是密钥，不要直接当作密码使用。"
    category="security"
  >
    <div class="toolbox-panel">
      <el-form label-position="top" class="toolbox-form">
        <el-row :gutter="14">
          <el-col :xs="24" :sm="8">
            <el-form-item label="生成数量">
              <el-input-number v-model="count" :min="1" :max="1000" class="toolbox-field-full" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="16">
            <el-form-item label="格式">
              <el-checkbox v-model="uppercase">大写</el-checkbox>
              <el-checkbox v-model="braces">花括号</el-checkbox>
              <el-checkbox v-model="hyphens">保留连字符</el-checkbox>
            </el-form-item>
          </el-col>
        </el-row>
        <div class="toolbox-actions">
          <el-button type="primary" icon="Refresh" @click="generate">生成 UUID</el-button>
          <el-button icon="Delete" @click="clearAll">清空</el-button>
        </div>
        <p class="toolbox-hint">UUID v4 的 122 位随机部分来自 crypto 安全随机源；格式选项只影响显示。</p>
      </el-form>
    </div>

    <ToolResult
      label="UUID 列表"
      :text="result"
      :rows="rows"
      :error="error"
      filename="uuid.txt"
      clearable
      @clear="clearAll"
    />
  </ToolPage>
</template>

<script setup>
import ToolPage from '@/components/Toolbox/ToolPage.vue'
import ToolResult from '@/components/Toolbox/ToolResult.vue'
import { generateUuids } from '@/utils/toolbox/crypto'

const count = ref(10)
const uppercase = ref(false)
const braces = ref(false)
const hyphens = ref(true)
const result = ref('')
const rows = ref([])
const error = ref('')

function generate() {
  error.value = ''
  result.value = ''
  rows.value = []
  try {
    const list = generateUuids(count.value, { uppercase: uppercase.value, braces: braces.value, hyphens: hyphens.value })
    result.value = list.join('\n')
    rows.value = [
      { label: '数量', value: String(list.length) },
      { label: '版本', value: 'v4（随机）' },
      { label: '格式', value: `${uppercase.value ? '大写' : '小写'}${hyphens.value ? '，含连字符' : '，不含连字符'}${braces.value ? '，花括号' : ''}` }
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
