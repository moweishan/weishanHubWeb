<template>
  <section class="toolbox-result">
    <div class="toolbox-result__head">
      <h3>{{ label }}</h3>
      <div class="toolbox-result__actions">
        <el-button v-if="hasCopy" size="small" :icon="copied ? 'Select' : 'CopyDocument'" @click="handleCopy">
          {{ copied ? '已复制' : '复制' }}
        </el-button>
        <el-button v-if="hasDownload" size="small" icon="Download" @click="handleDownload">下载</el-button>
        <el-button v-if="clearable" size="small" icon="Delete" @click="$emit('clear')">清空</el-button>
      </div>
    </div>

    <el-alert v-if="error" type="error" :closable="false" show-icon :title="error" class="toolbox-result__alert" />
    <el-alert
      v-for="(item, index) in warningList"
      :key="`${index}-${item}`"
      type="warning"
      :closable="false"
      show-icon
      :title="item"
      class="toolbox-result__alert"
    />

    <el-descriptions v-if="rows.length" :column="1" border size="small" class="toolbox-result__rows">
      <el-descriptions-item v-for="row in rows" :key="row.label" :label="row.label">
        <span :class="{ 'toolbox-mono': row.mono !== false }">{{ row.value }}</span>
      </el-descriptions-item>
    </el-descriptions>

    <slot />

    <pre v-if="hasText" class="toolbox-code">{{ text }}</pre>
    <div v-else-if="!rows.length && !$slots.default" class="toolbox-empty">{{ emptyText }}</div>
  </section>
</template>

<script setup>
import { ElMessage } from 'element-plus'
import { copyText, downloadText } from '@/utils/toolbox/io'

const props = defineProps({
  label: { type: String, default: '结果' },
  text: { type: [String, Number], default: '' },
  rows: { type: Array, default: () => [] },
  error: { type: String, default: '' },
  warning: { type: [String, Array], default: '' },
  emptyText: { type: String, default: '填写输入与参数后，结果会显示在这里。' },
  filename: { type: String, default: 'toolbox-result.txt' },
  mime: { type: String, default: 'text/plain;charset=utf-8' },
  clearable: { type: Boolean, default: false },
  showDownload: { type: Boolean, default: true }
})

defineEmits(['clear'])

const copied = ref(false)
let copiedTimer = null

const hasText = computed(() => props.text !== '' && props.text !== null && props.text !== undefined)
const hasCopy = computed(() => hasText.value || props.rows.length > 0)
const hasDownload = computed(() => props.showDownload && hasText.value)
const warningList = computed(() => {
  if (!props.warning) return []
  return Array.isArray(props.warning) ? props.warning.filter(Boolean) : [props.warning]
})

const copyValue = computed(() => {
  if (hasText.value) return String(props.text)
  return props.rows.map((row) => `${row.label}: ${row.value}`).join('\n')
})

async function handleCopy() {
  try {
    await copyText(copyValue.value)
    copied.value = true
    ElMessage.success('已复制到剪贴板')
    clearTimeout(copiedTimer)
    copiedTimer = setTimeout(() => {
      copied.value = false
    }, 1800)
  } catch (error) {
    ElMessage.error(error.message)
  }
}

function handleDownload() {
  try {
    downloadText(String(props.text), props.filename, props.mime)
  } catch (error) {
    ElMessage.error(error.message)
  }
}

onBeforeUnmount(() => clearTimeout(copiedTimer))
</script>

<style scoped>
.toolbox-result {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 12px;
  background: var(--el-bg-color);
  padding: 18px;
}

.toolbox-result__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.toolbox-result__head h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.toolbox-result__actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.toolbox-result__alert {
  margin-bottom: 10px;
}

.toolbox-result__rows {
  margin-bottom: 12px;
}

@media (max-width: 768px) {
  .toolbox-result {
    padding: 14px;
  }
}
</style>
