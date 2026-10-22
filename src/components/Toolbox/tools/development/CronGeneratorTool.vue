<template>
  <ToolPage
    title="Crontab 表达式生成"
    description="标准 5 字段 Crontab（分 时 日 月 周）的字段生成、校验、中文说明与后续执行时间预览。不支持 Quartz 六字段与 ? 语法。"
    category="development"
  >
    <div class="toolbox-panel">
      <el-form label-position="top" class="toolbox-form">
        <el-form-item label="Cron 表达式">
          <el-input v-model="expression" clearable class="toolbox-mono" placeholder="0 9 * * 1-5" />
        </el-form-item>
        <el-row :gutter="10">
          <el-col :xs="12" :sm="4">
            <el-form-item label="分钟 0-59">
              <el-input v-model="fields.minute" class="toolbox-mono" />
            </el-form-item>
          </el-col>
          <el-col :xs="12" :sm="4">
            <el-form-item label="小时 0-23">
              <el-input v-model="fields.hour" class="toolbox-mono" />
            </el-form-item>
          </el-col>
          <el-col :xs="12" :sm="4">
            <el-form-item label="日 1-31">
              <el-input v-model="fields.day" class="toolbox-mono" />
            </el-form-item>
          </el-col>
          <el-col :xs="12" :sm="4">
            <el-form-item label="月 1-12">
              <el-input v-model="fields.month" class="toolbox-mono" />
            </el-form-item>
          </el-col>
          <el-col :xs="12" :sm="4">
            <el-form-item label="星期 0-7">
              <el-input v-model="fields.weekday" class="toolbox-mono" />
            </el-form-item>
          </el-col>
          <el-col :xs="12" :sm="4">
            <el-form-item label="操作">
              <el-button class="toolbox-field-full" icon="Right" @click="applyFields">使用字段</el-button>
            </el-form-item>
          </el-col>
        </el-row>
        <div class="toolbox-inline">
          <span class="toolbox-hint">预设：</span>
          <el-button v-for="preset in presets" :key="preset.expression" size="small" @click="usePreset(preset.expression)">
            {{ preset.label }}
          </el-button>
        </div>
        <div class="toolbox-actions">
          <el-button type="primary" icon="CircleCheck" @click="validate">校验并预览</el-button>
          <el-button icon="Delete" @click="clearAll">清空</el-button>
        </div>
        <p class="toolbox-hint">
          支持 *、列表、范围、步长与英文月份/星期缩写。当“日”和“星期”都受限时按标准 Cron 的 OR 语义匹配；时间为浏览器本地时区。
        </p>
      </el-form>
    </div>

    <el-alert v-if="description" type="success" :closable="false" show-icon :title="description" />
    <ToolResult
      label="解析与后续执行"
      :text="resultText"
      :rows="rows"
      :error="error"
      :warning="warning"
      filename="crontab.txt"
    >
      <el-table v-if="nextRuns.length" :data="nextRuns" size="small" border style="margin-top: 12px">
        <el-table-column type="index" label="#" width="50" />
        <el-table-column prop="local" label="本地时间" min-width="170" />
        <el-table-column prop="iso" label="ISO UTC" min-width="220" />
      </el-table>
    </ToolResult>
  </ToolPage>
</template>

<script setup>
import ToolPage from '@/components/Toolbox/ToolPage.vue'
import ToolResult from '@/components/Toolbox/ToolResult.vue'
import { CRON_PRESETS, describeCron, nextCronRuns, parseCron, validateCron } from '@/utils/toolbox/cron'

const expression = ref('0 9 * * 1-5')
const fields = reactive({ minute: '0', hour: '9', day: '*', month: '*', weekday: '1-5' })
const description = ref('')
const nextRuns = ref([])
const error = ref('')
const warning = '执行时间按浏览器本地时区计算，仅作预览；不同 crontab 实现的日/星期 OR 语义与夏令时行为可能不同。'
const presets = CRON_PRESETS

const rows = computed(() => {
  if (!description.value) return []
  return [
    { label: '表达式', value: expression.value },
    { label: '字段数', value: '5（分 时 日 月 周）' },
    { label: '后续时间数', value: String(nextRuns.value.length) }
  ]
})

const resultText = computed(() =>
  nextRuns.value.length ? nextRuns.value.map((run) => `${run.local}  (${run.iso})`).join('\n') : ''
)

function applyFields() {
  expression.value = [fields.minute, fields.hour, fields.day, fields.month, fields.weekday]
    .map((value) => String(value).trim() || '*')
    .join(' ')
  validate()
}

function usePreset(value) {
  expression.value = value
  validate()
}

function validate() {
  error.value = ''
  description.value = ''
  nextRuns.value = []
  try {
    validateCron(expression.value)
    const parsed = parseCron(expression.value)
    description.value = describeCron(expression.value)
    nextRuns.value = nextCronRuns(expression.value, 5)
    fields.minute = parsed.fields[0]
    fields.hour = parsed.fields[1]
    fields.day = parsed.fields[2]
    fields.month = parsed.fields[3]
    fields.weekday = parsed.fields[4]
    expression.value = parsed.expression
  } catch (err) {
    error.value = err.message
  }
}

function clearAll() {
  expression.value = ''
  description.value = ''
  nextRuns.value = []
  error.value = ''
  Object.assign(fields, { minute: '', hour: '', day: '', month: '', weekday: '' })
}

onMounted(validate)
</script>
