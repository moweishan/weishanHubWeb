<template>
  <div
    class="toolbox-file-drop"
    :class="{ 'is-dragging': dragging, 'is-disabled': disabled }"
    role="button"
    tabindex="0"
    @click="openPicker"
    @keydown.enter.prevent="openPicker"
    @keydown.space.prevent="openPicker"
    @dragover.prevent="dragging = true"
    @dragleave.prevent="dragging = false"
    @drop.prevent="handleDrop"
  >
    <input ref="inputRef" class="toolbox-file-drop__input" type="file" :accept="accept" :disabled="disabled" @change="handleChange" />
    <el-icon :size="26"><UploadFilled /></el-icon>
    <div class="toolbox-file-drop__title">{{ label }}</div>
    <div class="toolbox-file-drop__hint">{{ hint || `点击或拖入文件，单个文件不超过 ${maxMB} MB` }}</div>
    <div v-if="file" class="toolbox-file-drop__file">
      <el-icon><Document /></el-icon>
      <span>{{ file.name }}</span>
      <span class="toolbox-meta">{{ formatBytes(file.size) }}</span>
      <el-button link type="danger" size="small" @click.stop="clear">移除</el-button>
    </div>
  </div>
</template>

<script setup>
import { ElMessage } from 'element-plus'
import { formatBytes } from '@/utils/toolbox/io'

const props = defineProps({
  modelValue: { type: Object, default: null },
  label: { type: String, default: '选择本地文件' },
  hint: { type: String, default: '' },
  accept: { type: String, default: '' },
  maxMB: { type: Number, default: 20 },
  disabled: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue'])
const inputRef = ref(null)
const dragging = ref(false)
const file = computed(() => props.modelValue)

function openPicker() {
  if (props.disabled) return
  inputRef.value?.click()
}

function validate(candidate) {
  if (!candidate) return false
  if (candidate.size > props.maxMB * 1024 * 1024) {
    ElMessage.error(`文件不能超过 ${props.maxMB} MB`)
    return false
  }
  return true
}

function handleChange(event) {
  const candidate = event.target.files?.[0]
  if (validate(candidate)) emit('update:modelValue', candidate)
  event.target.value = ''
}

function handleDrop(event) {
  dragging.value = false
  if (props.disabled) return
  const candidate = event.dataTransfer?.files?.[0]
  if (validate(candidate)) emit('update:modelValue', candidate)
}

function clear() {
  emit('update:modelValue', null)
}
</script>

<style scoped>
.toolbox-file-drop {
  border: 1.5px dashed var(--el-border-color);
  border-radius: 10px;
  padding: 24px 16px;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
  color: var(--el-text-color-secondary);
  background: var(--el-fill-color-lighter);
}

.toolbox-file-drop:hover,
.toolbox-file-drop.is-dragging {
  border-color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
}

.toolbox-file-drop.is-disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.toolbox-file-drop__input {
  display: none;
}

.toolbox-file-drop__title {
  margin-top: 8px;
  color: var(--el-text-color-primary);
  font-weight: 600;
}

.toolbox-file-drop__hint {
  font-size: 12px;
  margin-top: 4px;
}

.toolbox-file-drop__file {
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: var(--el-text-color-regular);
  word-break: break-all;
}
</style>
