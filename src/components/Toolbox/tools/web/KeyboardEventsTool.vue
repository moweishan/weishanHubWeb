<template>
  <ToolPage
    title="键盘按键查询"
    description="点击下方捕获区后按键，查看 key、code、keyCode、位置与修饰键。只监听捕获区，不会拦截页面其他输入框。"
    category="web"
  >
    <div class="toolbox-panel">
      <div
        ref="captureRef"
        class="toolbox-key-capture"
        :class="{ 'is-active': focused }"
        tabindex="0"
        role="button"
        @focus="focused = true"
        @blur="focused = false"
        @keydown="handleKey"
      >
        <el-icon :size="30"><Pointer /></el-icon>
        <div class="toolbox-key-capture__title">{{ focused ? '请按下任意键…' : '点击此处开始捕获' }}</div>
        <div class="toolbox-meta">Esc、Tab、方向键等浏览器保留键可能被系统截获；组合键以实际到达浏览器的状态为准。</div>
      </div>
    </div>

    <div class="toolbox-grid toolbox-grid--2">
      <ToolResult
        label="当前按键"
        :text="currentText"
        :rows="currentRows"
        :error="''"
        filename="keyboard.txt"
        empty-text="按下按键后显示按键信息。"
      />
      <div class="toolbox-panel">
        <h3 class="toolbox-panel__title"><el-icon><Timer /></el-icon>最近按键</h3>
        <el-table v-if="history.length" :data="history" size="small" border>
          <el-table-column prop="key" label="key" width="90" />
          <el-table-column prop="code" label="code" width="120" />
          <el-table-column prop="modifiers" label="修饰键" min-width="100" />
          <el-table-column prop="time" label="时间" width="90" />
        </el-table>
        <div v-else class="toolbox-empty">暂无按键记录。</div>
        <div class="toolbox-actions">
          <el-button size="small" icon="Delete" @click="clearHistory">清空记录</el-button>
        </div>
      </div>
    </div>
  </ToolPage>
</template>

<script setup>
import ToolPage from '@/components/Toolbox/ToolPage.vue'
import ToolResult from '@/components/Toolbox/ToolResult.vue'

const focused = ref(false)
const current = ref(null)
const history = ref([])

const currentRows = computed(() => {
  if (!current.value) return []
  return [
    { label: 'event.key', value: current.value.key },
    { label: 'event.code', value: current.value.code },
    { label: 'keyCode', value: String(current.value.keyCode) },
    { label: 'which', value: String(current.value.which) },
    { label: 'location', value: current.value.location },
    { label: 'repeat', value: current.value.repeat ? '是' : '否' },
    { label: '修饰键', value: current.value.modifiers },
    { label: '可打印字符', value: current.value.printable }
  ]
})

const currentText = computed(() => (current.value ? JSON.stringify(current.value, null, 2) : ''))

function handleKey(event) {
  const modifiers = [
    event.ctrlKey ? 'Ctrl' : '',
    event.altKey ? 'Alt' : '',
    event.shiftKey ? 'Shift' : '',
    event.metaKey ? 'Meta' : ''
  ]
    .filter(Boolean)
    .join(' + ') || '无'
  const record = {
    key: event.key,
    code: event.code,
    keyCode: event.keyCode,
    which: event.which,
    location: event.location,
    repeat: event.repeat,
    modifiers,
    printable: event.key.length === 1 ? event.key : '否',
    time: new Date().toLocaleTimeString('zh-CN', { hour12: false })
  }
  current.value = record
  history.value = [record, ...history.value].slice(0, 8)
}
</script>

<style scoped>
.toolbox-key-capture {
  border: 1.5px dashed var(--el-border-color);
  border-radius: 10px;
  padding: 28px 16px;
  text-align: center;
  cursor: pointer;
  color: var(--el-text-color-secondary);
  background: var(--el-fill-color-lighter);
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.toolbox-key-capture.is-active,
.toolbox-key-capture:focus {
  border-color: var(--el-color-primary);
  box-shadow: 0 0 0 3px var(--el-color-primary-light-8);
}

.toolbox-key-capture__title {
  margin: 8px 0 4px;
  font-size: 16px;
  color: var(--el-text-color-primary);
  font-weight: 600;
}
</style>
