<template>
  <ToolPage
    title="随机端口号生成"
    description="使用 crypto.getRandomValues 生成指定范围内的随机端口。只生成数字，不检测端口占用，也不代表端口可用。"
    category="development"
  >
    <div class="toolbox-panel">
      <el-alert
        type="warning"
        :closable="false"
        show-icon
        title="本工具不查询操作系统、不连接端口、不检测占用；使用前请自行确认端口空闲。"
        style="margin-bottom: 14px"
      />
      <el-form label-position="top" class="toolbox-form">
        <el-row :gutter="14">
          <el-col :xs="24" :sm="6">
            <el-form-item label="生成数量">
              <el-input-number v-model="count" :min="1" :max="50" class="toolbox-field-full" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="6">
            <el-form-item label="最小值">
              <el-input-number v-model="min" :min="1" :max="65535" class="toolbox-field-full" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="6">
            <el-form-item label="最大值">
              <el-input-number v-model="max" :min="1" :max="65535" class="toolbox-field-full" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="6">
            <el-form-item label="系统端口">
              <el-checkbox v-model="includePrivileged">允许 1-1023</el-checkbox>
            </el-form-item>
          </el-col>
        </el-row>
        <div class="toolbox-actions">
          <el-button type="primary" icon="Refresh" @click="generate">生成端口</el-button>
          <el-button icon="Delete" @click="clearAll">清空</el-button>
        </div>
      </el-form>
    </div>

    <ToolResult
      label="随机端口"
      :text="result"
      :rows="rows"
      :error="error"
      filename="random-ports.txt"
      clearable
      @clear="clearAll"
    />
  </ToolPage>
</template>

<script setup>
import ToolPage from '@/components/Toolbox/ToolPage.vue'
import ToolResult from '@/components/Toolbox/ToolResult.vue'
import { randomInt } from '@/utils/toolbox/crypto'

const count = ref(5)
const min = ref(1024)
const max = ref(65535)
const includePrivileged = ref(false)
const result = ref('')
const rows = ref([])
const error = ref('')

watch(includePrivileged, (value) => {
  if (!value && min.value < 1024) min.value = 1024
  if (value && min.value < 1) min.value = 1
})

function generate() {
  error.value = ''
  result.value = ''
  rows.value = []
  try {
    const lower = includePrivileged.value ? 1 : Math.max(1, min.value)
    if (lower < 1 || max.value > 65535) throw new Error('端口范围必须在 1 至 65535 之间')
    if (lower > max.value) throw new Error('最小值不能大于最大值')
    if (max.value - lower + 1 < count.value) throw new Error('端口范围太小，无法生成不重复的指定数量')
    const ports = new Set()
    let guard = 0
    while (ports.size < count.value && guard < 10000) {
      ports.add(randomInt(lower, max.value))
      guard++
    }
    if (ports.size < count.value) throw new Error('生成唯一端口失败，请扩大范围后重试')
    const list = Array.from(ports)
    result.value = list.join('\n')
    rows.value = [
      { label: '范围', value: `${lower} - ${max.value}` },
      { label: '数量', value: String(list.length) },
      { label: '占用检测', value: '未检测' }
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
