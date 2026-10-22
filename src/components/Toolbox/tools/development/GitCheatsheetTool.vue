<template>
  <ToolPage
    title="Git 命令速查"
    description="静态可搜索的常用 Git 命令与说明。复制的是命令文本，不会在当前仓库执行。"
    category="development"
  >
    <div class="toolbox-panel">
      <el-form label-position="top" class="toolbox-form">
        <el-row :gutter="14">
          <el-col :xs="24" :sm="16">
            <el-form-item label="搜索命令或说明">
              <el-input v-model="query" clearable placeholder="例如 commit、分支、reflog" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="8">
            <el-form-item label="分类">
              <el-select v-model="category" clearable class="toolbox-field-full" placeholder="全部分类">
                <el-option v-for="item in categories" :key="item" :label="item" :value="item" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
    </div>

    <div class="toolbox-panel">
      <h3 class="toolbox-panel__title"><el-icon><List /></el-icon>命令（{{ filtered.length }}）</h3>
      <el-table v-if="filtered.length" :data="filtered" size="small" border stripe max-height="560">
        <el-table-column prop="category" label="分类" width="90" />
        <el-table-column label="命令" min-width="300">
          <template #default="{ row }"><span class="toolbox-mono">{{ row.command }}</span></template>
        </el-table-column>
        <el-table-column prop="description" label="说明" min-width="240" />
        <el-table-column label="操作" width="90" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" icon="CopyDocument" @click="copy(row.command)">复制</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div v-else class="toolbox-empty">没有匹配的 Git 命令。</div>
    </div>
  </ToolPage>
</template>

<script setup>
import { ElMessage } from 'element-plus'
import ToolPage from '@/components/Toolbox/ToolPage.vue'
import { GIT_COMMANDS } from '@/data/toolbox/static'
import { copyText } from '@/utils/toolbox/io'

const query = ref('')
const category = ref('')
const categories = [...new Set(GIT_COMMANDS.map((item) => item.category))]

const filtered = computed(() => {
  const text = query.value.trim().toLowerCase()
  return GIT_COMMANDS.filter((item) => {
    if (category.value && item.category !== category.value) return false
    if (!text) return true
    return item.command.toLowerCase().includes(text) || item.description.toLowerCase().includes(text) || item.category.includes(text)
  })
})

async function copy(command) {
  try {
    await copyText(command)
    ElMessage.success('命令已复制')
  } catch (error) {
    ElMessage.error(error.message)
  }
}
</script>
