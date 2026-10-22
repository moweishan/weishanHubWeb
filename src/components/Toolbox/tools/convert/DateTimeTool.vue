<template>
  <ToolPage
    title="日期时间转换"
    description="在 Unix 秒/毫秒、ISO、本地时间与 UTC 之间转换。自动模式只识别 10 位秒或 13 位毫秒时间戳，其余按 ISO 解析。"
    category="convert"
  >
    <div class="toolbox-panel">
      <el-form label-position="top" class="toolbox-form">
        <el-row :gutter="14">
          <el-col :xs="24" :sm="16">
            <el-form-item label="日期时间 / 时间戳">
              <el-input v-model="input" clearable placeholder="例如 2024-05-01T12:30:00+08:00 或 1714537800" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="8">
            <el-form-item label="输入类型">
              <el-select v-model="source" class="toolbox-field-full">
                <el-option label="自动识别" value="auto" />
                <el-option label="Unix 秒" value="unix-seconds" />
                <el-option label="Unix 毫秒" value="unix-ms" />
                <el-option label="ISO / 带时区" value="iso" />
                <el-option label="本地时间（无时区）" value="local" />
                <el-option label="UTC（无时区）" value="utc" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <div class="toolbox-inline">
          <el-button type="primary" icon="Clock" @click="setNow">使用当前时间</el-button>
          <span class="toolbox-hint">无时区的 ISO 默认按浏览器本地时区解释；带 Z/+08:00 时按该偏移解释。</span>
        </div>
      </el-form>
    </div>

    <ToolResult
      label="转换结果"
      :text="resultText"
      :rows="rows"
      :error="error"
      filename="datetime.txt"
      empty-text="输入日期时间或时间戳后显示本地、UTC、ISO 与 Unix 结果。"
    />
  </ToolPage>
</template>

<script setup>
import ToolPage from '@/components/Toolbox/ToolPage.vue'
import ToolResult from '@/components/Toolbox/ToolResult.vue'
import { dateTimeInfo, parseDateTime, toDatetimeLocalValue } from '@/utils/toolbox/date'

const input = ref(toDatetimeLocalValue(new Date()))
const source = ref('local')

const parsed = computed(() => {
  try {
    return { date: parseDateTime(input.value, source.value), error: '' }
  } catch (error) {
    return { date: null, error: error.message }
  }
})

const error = computed(() => parsed.value.error)
const info = computed(() => {
  if (!parsed.value.date) return null
  try {
    return dateTimeInfo(parsed.value.date)
  } catch (error) {
    return null
  }
})

const rows = computed(() => {
  if (!info.value) return []
  return [
    { label: '本地时间', value: info.value.local },
    { label: 'UTC', value: info.value.utc },
    { label: 'ISO 8601', value: info.value.iso },
    { label: 'Unix 秒', value: String(info.value.unixSeconds) },
    { label: 'Unix 毫秒', value: String(info.value.unixMilliseconds) },
    { label: '星期', value: info.value.weekday },
    { label: '时区', value: `${info.value.timezone}（${info.value.offset}）` },
    { label: '相对现在', value: info.value.relative }
  ]
})

const resultText = computed(() => {
  if (!info.value) return ''
  return [
    `本地: ${info.value.local}`,
    `UTC: ${info.value.utc}`,
    `ISO: ${info.value.iso}`,
    `Unix 秒: ${info.value.unixSeconds}`,
    `Unix 毫秒: ${info.value.unixMilliseconds}`,
    `星期: ${info.value.weekday}`,
    `时区: ${info.value.timezone} (${info.value.offset})`
  ].join('\n')
})

function setNow() {
  const now = new Date()
  source.value = 'local'
  input.value = toDatetimeLocalValue(now)
}
</script>
