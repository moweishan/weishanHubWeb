<template>
  <div
    class="toolbox-multi-drop"
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
    <input
      ref="inputRef"
      class="toolbox-multi-drop__input"
      type="file"
      multiple
      :accept="accept"
      :disabled="disabled"
      @change="handleChange"
    />
    <el-icon :size="26"><UploadFilled /></el-icon>
    <div class="toolbox-multi-drop__title">{{ label }}</div>
    <div class="toolbox-multi-drop__hint">{{ hint || `点击或拖入多个文件，单个不超过 ${maxMB} MB，最多 ${maxFiles} 个` }}</div>
    <div class="toolbox-multi-drop__count">已选择 {{ modelValue.length }} / {{ maxFiles }} 个文件</div>
  </div>
</template>

<script setup>
import { ElMessage } from 'element-plus'

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  label: { type: String, default: '批量选择本地文件' },
  hint: { type: String, default: '' },
  accept: { type: String, default: '' },
  maxMB: { type: Number, default: 25 },
  maxFiles: { type: Number, default: 20 },
  disabled: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue'])
const inputRef = ref(null)
const dragging = ref(false)

function openPicker() {
  if (props.disabled) return
  inputRef.value?.click()
}

function addFiles(files) {
  if (props.disabled) return
  const list = Array.from(files || [])
  if (!list.length) return
  const next = [...props.modelValue]
  for (const file of list) {
    if (next.length >= props.maxFiles) {
      ElMessage.warning(`最多选择 ${props.maxFiles} 个文件`)
      break
    }
    if (file.size > props.maxMB * 1024 * 1024) {
      ElMessage.error(`「${file.name}」超过 ${props.maxMB} MB，已跳过`)
      continue
    }
    if (next.some((item) => item.name === file.name && item.size === file.size && item.lastModified === file.lastModified)) {
      continue
    }
    next.push(file)
  }
  emit('update:modelValue', next)
}

function handleChange(event) {
  addFiles(event.target.files)
  event.target.value = ''
}

function handleDrop(event) {
  dragging.value = false
  addFiles(event.dataTransfer?.files)
}
</script>

<style scoped>
.toolbox-multi-drop {
  border: 1.5px dashed var(--el-border-color);
  border-radius: 10px;
  padding: 24px 16px;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
  color: var(--el-text-color-secondary);
  background: var(--el-fill-color-lighter);
}

.toolbox-multi-drop:hover,
.toolbox-multi-drop.is-dragging {
  border-color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
}

.toolbox-multi-drop.is-disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.toolbox-multi-drop__input {
  display: none;
}

.toolbox-multi-drop__title {
  margin-top: 8px;
  color: var(--el-text-color-primary);
  font-weight: 600;
}

.toolbox-multi-drop__hint,
.toolbox-multi-drop__count {
  font-size: 12px;
  margin-top: 4px;
}
</style>
