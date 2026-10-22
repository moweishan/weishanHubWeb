<template>
  <ToolPage
    title="chmod 权限计算"
    description="在 rwx 复选框、符号权限与八进制之间换算，支持 setuid/setgid/sticky。结果仅作参考，修改前请确认目标文件与命令。"
    category="development"
  >
    <div class="toolbox-grid toolbox-grid--2">
      <div class="toolbox-panel">
        <h3 class="toolbox-panel__title"><el-icon><Setting /></el-icon>权限位</h3>
        <div v-for="group in groups" :key="group.key" class="toolbox-perm-group">
          <div class="toolbox-perm-group__label">{{ group.label }}</div>
          <el-checkbox v-model="state[group.key].read">读取 r</el-checkbox>
          <el-checkbox v-model="state[group.key].write">写入 w</el-checkbox>
          <el-checkbox v-model="state[group.key].execute">执行 x</el-checkbox>
        </div>
        <el-divider />
        <div class="toolbox-check-group">
          <el-checkbox v-model="state.special.setuid">setuid (4)</el-checkbox>
          <el-checkbox v-model="state.special.setgid">setgid (2)</el-checkbox>
          <el-checkbox v-model="state.special.sticky">sticky (1)</el-checkbox>
        </div>
        <p class="toolbox-hint">setuid/setgid/sticky 会改变特殊执行语义，请确认系统与文件类型是否支持。</p>
      </div>

      <div class="toolbox-panel">
        <h3 class="toolbox-panel__title"><el-icon><Switch /></el-icon>从其他表示导入</h3>
        <el-form label-position="top" class="toolbox-form">
          <el-form-item label="八进制（3 或 4 位）">
            <div class="toolbox-inline">
              <el-input v-model="octalInput" placeholder="755 / 4755 / 1777" class="toolbox-mono" style="flex: 1" />
              <el-button @click="applyOctal">应用</el-button>
            </div>
          </el-form-item>
          <el-form-item label="符号权限">
            <div class="toolbox-inline">
              <el-input v-model="symbolicInput" placeholder="rwxr-xr-x 或 u=rwx,g=rx,o=" class="toolbox-mono" style="flex: 1" />
              <el-button @click="applySymbolic">应用</el-button>
            </div>
          </el-form-item>
        </el-form>
      </div>
    </div>

    <ToolResult
      label="计算结果"
      :text="resultText"
      :rows="rows"
      :error="error"
      filename="chmod.txt"
      clearable
      @clear="reset"
    />
  </ToolPage>
</template>

<script setup>
import ToolPage from '@/components/Toolbox/ToolPage.vue'
import ToolResult from '@/components/Toolbox/ToolResult.vue'
import { explainMode, formatMode, parseOctalMode, symbolicToState } from '@/utils/toolbox/chmod'

const groups = [
  { key: 'user', label: '所有者 u' },
  { key: 'group', label: '所属组 g' },
  { key: 'other', label: '其他用户 o' }
]

function defaultState() {
  const parsed = parseOctalMode('755')
  return {
    special: { ...parsed.special },
    user: { ...parsed.user },
    group: { ...parsed.group },
    other: { ...parsed.other }
  }
}

const state = reactive(defaultState())
const octalInput = ref('755')
const symbolicInput = ref('rwxr-xr-x')
const error = ref('')

const mode = computed(() => formatMode(state))
const symbolicCommand = computed(() => {
  const keys = ['user', 'group', 'other']
  const who = ['u', 'g', 'o']
  const clauses = keys.map((key, index) => {
    const target = state[key]
    const permissions = `${target.read ? 'r' : ''}${target.write ? 'w' : ''}${target.execute ? 'x' : ''}`
    return `${who[index]}=${permissions}`
  })
  if (state.special.setuid) clauses.push('u+s')
  if (state.special.setgid) clauses.push('g+s')
  if (state.special.sticky) clauses.push('o+t')
  return clauses.join(',')
})
const rows = computed(() => [
  { label: '八进制', value: mode.value.octal },
  { label: '符号权限', value: mode.value.symbolic },
  { label: '说明', value: explainMode(state) },
  { label: '特殊位', value: [state.special.setuid && 'setuid', state.special.setgid && 'setgid', state.special.sticky && 'sticky'].filter(Boolean).join('、') || '无' }
])
const resultText = computed(() => [
  `chmod ${mode.value.octal} <path>`,
  `chmod ${symbolicCommand.value} <path>`,
  explainMode(state)
].join('\n'))

function applyOctal() {
  error.value = ''
  try {
    const next = parseOctalMode(octalInput.value)
    Object.assign(state.special, next.special)
    Object.assign(state.user, next.user)
    Object.assign(state.group, next.group)
    Object.assign(state.other, next.other)
    symbolicInput.value = next.symbolic
  } catch (err) {
    error.value = err.message
  }
}

function applySymbolic() {
  error.value = ''
  try {
    const next = symbolicToState(symbolicInput.value)
    Object.assign(state.special, next.special)
    Object.assign(state.user, next.user)
    Object.assign(state.group, next.group)
    Object.assign(state.other, next.other)
    octalInput.value = next.octal
  } catch (err) {
    error.value = err.message
  }
}

function reset() {
  Object.assign(state.special, defaultState().special)
  Object.assign(state.user, defaultState().user)
  Object.assign(state.group, defaultState().group)
  Object.assign(state.other, defaultState().other)
  octalInput.value = '755'
  symbolicInput.value = 'rwxr-xr-x'
  error.value = ''
}
</script>

<style scoped>
.toolbox-perm-group {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 14px;
  padding: 8px 0;
  border-bottom: 1px dashed var(--el-border-color-lighter);
}

.toolbox-perm-group__label {
  width: 90px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}
</style>
