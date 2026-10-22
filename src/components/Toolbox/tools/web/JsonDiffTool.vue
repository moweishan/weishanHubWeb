<template>
  <ToolPage
    title="JSON 差异对比"
    description="深度比较两段 JSON 的新增、删除与修改。对象键顺序不影响结果，数组按下标比较；类型变化会标记为 modified。"
    category="web"
  >
    <div class="toolbox-grid toolbox-grid--2">
      <div class="toolbox-panel">
        <h3 class="toolbox-panel__title"><el-icon><Document /></el-icon>原始 JSON</h3>
        <el-input v-model="left" type="textarea" :rows="12" class="toolbox-mono" />
      </div>
      <div class="toolbox-panel">
        <h3 class="toolbox-panel__title"><el-icon><Document /></el-icon>对比 JSON</h3>
        <el-input v-model="right" type="textarea" :rows="12" class="toolbox-mono" />
      </div>
    </div>

    <div class="toolbox-panel">
      <div class="toolbox-actions" style="margin-top: 0">
        <el-button type="primary" icon="Switch" @click="compare">开始对比</el-button>
        <el-button icon="DocumentAdd" @click="loadSample">载入示例</el-button>
        <el-button icon="Delete" @click="clearAll">清空</el-button>
      </div>
    </div>

    <div v-if="diff" class="toolbox-panel">
      <div class="toolbox-inline">
        <el-tag type="success">新增 {{ diff.summary.added }}</el-tag>
        <el-tag type="danger">删除 {{ diff.summary.removed }}</el-tag>
        <el-tag type="warning">修改 {{ diff.summary.modified }}</el-tag>
        <el-tag v-if="diff.truncated" type="danger">结果已截断</el-tag>
      </div>
    </div>

    <div v-if="diff" class="toolbox-panel">
      <h3 class="toolbox-panel__title"><el-icon><List /></el-icon>变更明细（{{ diff.changes.length }}）</h3>
      <el-table v-if="diff.changes.length" :data="diff.changes" size="small" border max-height="520">
        <el-table-column prop="path" label="路径" min-width="180" />
        <el-table-column label="类型" width="90">
          <template #default="{ row }">
            <el-tag :type="row.type === 'added' ? 'success' : row.type === 'removed' ? 'danger' : 'warning'" size="small">
              {{ row.type === 'added' ? '新增' : row.type === 'removed' ? '删除' : '修改' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="原值" min-width="170">
          <template #default="{ row }"><span class="toolbox-mono">{{ display(row.before) }}</span></template>
        </el-table-column>
        <el-table-column label="新值" min-width="170">
          <template #default="{ row }"><span class="toolbox-mono">{{ display(row.after) }}</span></template>
        </el-table-column>
      </el-table>
      <div v-else class="toolbox-empty">两段 JSON 结构相同。</div>
    </div>

    <ToolResult
      label="差异 JSON"
      :text="jsonText"
      :rows="rows"
      :error="error"
      :warning="'对象键顺序被忽略；数组按下标比较。若误把同一数据的不同键序粘贴到两侧，结果应为无差异。'"
      filename="json-diff.json"
    />
  </ToolPage>
</template>

<script setup>
import ToolPage from '@/components/Toolbox/ToolPage.vue'
import ToolResult from '@/components/Toolbox/ToolResult.vue'
import { diffJsonText } from '@/utils/toolbox/structured'

const sampleLeft = JSON.stringify(
  { name: 'A', tags: ['a', 'b'], nested: { x: 1, y: 2 }, unchanged: true },
  null,
  2
)
const sampleRight = JSON.stringify(
  { nested: { y: 3, x: 1 }, name: 'A', tags: ['a', 'b', 'c'], added: true, unchanged: true },
  null,
  2
)
const left = ref(sampleLeft)
const right = ref(sampleRight)
const diff = ref(null)
const error = ref('')

const jsonText = computed(() => (diff.value ? JSON.stringify(diff.value, null, 2) : ''))
const rows = computed(() => {
  if (!diff.value) return []
  return [
    { label: '新增', value: String(diff.value.summary.added) },
    { label: '删除', value: String(diff.value.summary.removed) },
    { label: '修改', value: String(diff.value.summary.modified) },
    { label: '是否截断', value: diff.value.truncated ? '是' : '否' }
  ]
})

function display(value) {
  if (value === undefined) return '—'
  const text = JSON.stringify(value)
  return text.length > 160 ? `${text.slice(0, 157)}…` : text
}

function compare() {
  error.value = ''
  diff.value = null
  try {
    diff.value = diffJsonText(left.value, right.value)
  } catch (err) {
    error.value = err.message
  }
}

function loadSample() {
  left.value = sampleLeft
  right.value = sampleRight
  compare()
}

function clearAll() {
  left.value = ''
  right.value = ''
  diff.value = null
  error.value = ''
}
</script>
