<template>
  <ToolPage
    title="HTTP 状态码查询"
    description="按状态码、英文名称、中文名称或说明搜索常用 HTTP 状态码。内置 1xx 至 5xx 标准常用项，不联网。"
    category="web"
  >
    <div class="toolbox-panel">
      <el-form label-position="top" class="toolbox-form">
        <el-form-item label="搜索">
          <el-input v-model="query" clearable placeholder="例如 404、重定向、timeout、429" />
        </el-form-item>
        <div class="toolbox-inline">
          <span class="toolbox-hint">常用：</span>
          <el-button v-for="code in common" :key="code" size="small" @click="query = String(code)">{{ code }}</el-button>
        </div>
      </el-form>
    </div>

    <div class="toolbox-grid toolbox-grid--2">
      <div class="toolbox-panel">
        <h3 class="toolbox-panel__title"><el-icon><List /></el-icon>状态码（{{ results.length }}）</h3>
        <div class="toolbox-table-wrap">
          <el-table :data="results" size="small" border highlight-current-row max-height="520" @row-click="select">
            <el-table-column prop="code" label="码" width="70" />
            <el-table-column prop="name" label="英文" min-width="160" />
            <el-table-column prop="zh" label="中文" width="110" />
          </el-table>
        </div>
      </div>

      <ToolResult
        label="状态码说明"
        :text="selected?.description || ''"
        :rows="rows"
        :error="''"
        filename="http-status.txt"
        empty-text="点击左侧状态码查看说明。"
      />
    </div>
  </ToolPage>
</template>

<script setup>
import ToolPage from '@/components/Toolbox/ToolPage.vue'
import ToolResult from '@/components/Toolbox/ToolResult.vue'
import { HTTP_STATUS, searchHttpStatus } from '@/data/toolbox/static'

const query = ref('')
const common = [200, 201, 204, 301, 302, 304, 400, 401, 403, 404, 429, 500, 502, 503]
const results = computed(() => searchHttpStatus(query.value))
const selected = ref(HTTP_STATUS.find((item) => item.code === 200) || null)

const rows = computed(() => {
  if (!selected.value) return []
  return [
    { label: '状态码', value: String(selected.value.code) },
    { label: '英文名称', value: selected.value.name },
    { label: '中文名称', value: selected.value.zh },
    { label: '类别', value: `${Math.floor(selected.value.code / 100)}xx` }
  ]
})

function select(row) {
  selected.value = row
}
</script>
