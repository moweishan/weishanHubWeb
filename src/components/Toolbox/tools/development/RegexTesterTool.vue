<template>
  <ToolPage
    title="正则表达式测试"
    description="正则在独立 Worker 中执行，超过设定时间会 terminate 并报超时，避免灾难性回溯卡死主线程。支持匹配、捕获组与替换预览。"
    category="development"
  >
    <div class="toolbox-panel">
      <el-form label-position="top" class="toolbox-form">
        <el-form-item label="正则表达式">
          <el-input v-model="pattern" class="toolbox-mono" placeholder="例如 (\w+)@(\w+\.\w+)" />
        </el-form-item>
        <el-form-item label="标志">
          <el-checkbox-group v-model="flags">
            <el-checkbox v-for="flag in flagOptions" :key="flag.value" :value="flag.value">{{ flag.label }}</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
        <el-form-item label="测试文本">
          <el-input v-model="text" type="textarea" :rows="8" class="toolbox-mono" />
        </el-form-item>
        <el-row :gutter="14">
          <el-col :xs="24" :sm="10">
            <el-form-item label="替换为（可选）">
              <el-input v-model="replacement" placeholder="$1" class="toolbox-mono" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="6">
            <el-form-item label="超时">
              <el-select v-model="timeout" class="toolbox-field-full">
                <el-option :value="500" label="500 ms" />
                <el-option :value="1000" label="1000 ms" />
                <el-option :value="2000" label="2000 ms" />
                <el-option :value="5000" label="5000 ms" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="8">
            <el-form-item label="操作">
              <div class="toolbox-inline">
                <el-button type="primary" icon="VideoPlay" :loading="loading" @click="run">执行</el-button>
                <el-button icon="Delete" @click="clearAll">清空</el-button>
              </div>
            </el-form-item>
          </el-col>
        </el-row>
        <div class="toolbox-inline">
          <el-checkbox v-model="enableReplace">生成替换预览</el-checkbox>
          <el-button size="small" type="warning" plain @click="loadTimeoutSample">填充超时示例</el-button>
        </div>
        <p class="toolbox-hint">
          超时后 Worker 会被强制终止。请避免在主线程直接执行不可信正则；本工具默认只允许 g、i、m、s、u、y 标志。
        </p>
      </el-form>
    </div>

    <el-alert v-if="error" type="error" :closable="false" show-icon :title="error" />

    <div v-if="result" class="toolbox-grid toolbox-grid--2">
      <ToolResult label="匹配结果" :text="matchesText" :rows="rows" :error="''" filename="regex-matches.json" />
      <ToolResult
        v-if="enableReplace && result.replaced !== null"
        label="替换预览"
        :text="result.replaced"
        :error="''"
        filename="regex-replaced.txt"
      />
    </div>
    <ToolResult v-else label="匹配结果" :text="''" :error="''" empty-text="填写正则与文本后点击执行。" />
  </ToolPage>
</template>

<script setup>
import ToolPage from '@/components/Toolbox/ToolPage.vue'
import ToolResult from '@/components/Toolbox/ToolResult.vue'
import { runRegexInWorker } from '@/utils/toolbox/regexWorkerClient'

const pattern = ref('(\\w+)@(\\w+\\.\\w+)')
const flags = ref(['g'])
const text = ref('联系 alice@example.com 或 bob@example.org。')
const replacement = ref('[$1]')
const enableReplace = ref(false)
const timeout = ref(2000)
const loading = ref(false)
const result = ref(null)
const error = ref('')

const flagOptions = [
  { value: 'g', label: 'g 全局' },
  { value: 'i', label: 'i 忽略大小写' },
  { value: 'm', label: 'm 多行' },
  { value: 's', label: 's 点号含换行' },
  { value: 'u', label: 'u Unicode' },
  { value: 'y', label: 'y 粘性' }
]

const matchesText = computed(() => (result.value ? JSON.stringify(result.value.matches, null, 2) : ''))
const rows = computed(() => {
  if (!result.value) return []
  return [
    { label: '匹配数量', value: String(result.value.count) },
    { label: '是否截断', value: result.value.truncated ? '是（最多 1000 条）' : '否' },
    { label: '标志', value: result.value.flags || '无' },
    { label: '超时设置', value: `${timeout.value} ms` }
  ]
})

async function run() {
  error.value = ''
  result.value = null
  if (!pattern.value) {
    error.value = '请输入正则表达式'
    return
  }
  loading.value = true
  try {
    result.value = await runRegexInWorker(
      {
        pattern: pattern.value,
        flags: flags.value.join(''),
        text: text.value,
        replacement: enableReplace.value ? replacement.value : undefined
      },
      timeout.value
    )
  } catch (err) {
    error.value = err.name === 'RegexTimeoutError' ? err.message : err.message
  } finally {
    loading.value = false
  }
}

function loadTimeoutSample() {
  pattern.value = '(a+)+$'
  flags.value = []
  text.value = `${'a'.repeat(2000)}!`
  enableReplace.value = false
  result.value = null
  error.value = ''
}

function clearAll() {
  pattern.value = ''
  flags.value = []
  text.value = ''
  replacement.value = ''
  result.value = null
  error.value = ''
  loading.value = false
}
</script>
