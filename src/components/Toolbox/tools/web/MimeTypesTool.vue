<template>
  <ToolPage
    title="MIME 类型查询"
    description="按扩展名或 MIME 关键字查询常见文件类型。内置静态表，不联网、不读取本地文件。未命中时会明确提示。"
    category="web"
  >
    <div class="toolbox-panel">
      <el-form label-position="top" class="toolbox-form">
        <el-form-item label="扩展名或 MIME">
          <el-input v-model="query" clearable placeholder="例如 png、.pdf、application/json" />
        </el-form-item>
        <div class="toolbox-inline">
          <span class="toolbox-hint">常用：</span>
          <el-button v-for="item in common" :key="item" size="small" @click="query = item">{{ item }}</el-button>
        </div>
      </el-form>
    </div>

    <div class="toolbox-panel">
      <h3 class="toolbox-panel__title"><el-icon><Files /></el-icon>查询结果（{{ results.length }}）</h3>
      <el-table v-if="results.length" :data="results" size="small" border stripe>
        <el-table-column label="扩展名" width="150">
          <template #default="{ row }">{{ row.ext.map((ext) => `.${ext}`).join(' / ') }}</template>
        </el-table-column>
        <el-table-column prop="mime" label="MIME 类型" min-width="220" />
        <el-table-column prop="category" label="分类" width="90" />
        <el-table-column prop="charset" label="字符集" width="100" />
        <el-table-column prop="description" label="说明" min-width="140" />
      </el-table>
      <el-alert v-else type="warning" :closable="false" show-icon :title="`未找到与“${query}”匹配的类型，请尝试扩展名或完整 MIME。`" />
    </div>

    <ToolResult
      label="结果摘要"
      :text="summary"
      :rows="rows"
      :error="''"
      filename="mime-types.txt"
      empty-text="输入关键字后实时查询。"
    />
  </ToolPage>
</template>

<script setup>
import ToolPage from '@/components/Toolbox/ToolPage.vue'
import ToolResult from '@/components/Toolbox/ToolResult.vue'
import { lookupMime, MIME_TYPES } from '@/data/toolbox/static'

const query = ref('json')
const common = ['png', 'jpg', 'pdf', 'json', 'xlsx', 'wasm', 'woff2', 'mp4']

const results = computed(() => lookupMime(query.value).slice(0, 80))
const rows = computed(() => [
  { label: '静态表条目数', value: String(MIME_TYPES.length) },
  { label: '当前查询', value: query.value || '（空）' },
  { label: '命中数量', value: String(results.value.length) }
])
const summary = computed(() =>
  results.value.map((item) => `${item.ext.join(',')}\t${item.mime}\t${item.charset}\t${item.description}`).join('\n')
)
</script>
