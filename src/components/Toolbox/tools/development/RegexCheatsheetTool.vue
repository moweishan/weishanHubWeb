<template>
  <ToolPage
    title="正则语法速查"
    description="可搜索的 JavaScript 正则元字符、量词、分组、断言、标志与常用模式。示例只作为文本，不会自动执行。"
    category="development"
  >
    <div class="toolbox-panel">
      <el-form label-position="top" class="toolbox-form">
        <el-row :gutter="14">
          <el-col :xs="24" :sm="16">
            <el-form-item label="搜索">
              <el-input v-model="query" clearable placeholder="例如 断言、\d、email" />
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
      <h3 class="toolbox-panel__title"><el-icon><List /></el-icon>语法（{{ filtered.length }}）</h3>
      <el-table v-if="filtered.length" :data="filtered" size="small" border stripe max-height="560">
        <el-table-column prop="category" label="分类" width="90" />
        <el-table-column label="语法" width="180">
          <template #default="{ row }"><span class="toolbox-mono">{{ row.token }}</span></template>
        </el-table-column>
        <el-table-column prop="description" label="说明" min-width="260" />
        <el-table-column label="示例" min-width="180">
          <template #default="{ row }"><span class="toolbox-mono">{{ row.example }}</span></template>
        </el-table-column>
        <el-table-column label="操作" width="80" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" icon="CopyDocument" @click="copy(row.token)">复制</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div v-else class="toolbox-empty">没有匹配的正则语法。</div>
    </div>
  </ToolPage>
</template>

<script setup>
import { ElMessage } from 'element-plus'
import ToolPage from '@/components/Toolbox/ToolPage.vue'
import { REGEX_CHEATSHEET } from '@/data/toolbox/static'
import { copyText } from '@/utils/toolbox/io'

const query = ref('')
const category = ref('')
const categories = [...new Set(REGEX_CHEATSHEET.map((item) => item.category))]

const filtered = computed(() => {
  const text = query.value.trim().toLowerCase()
  return REGEX_CHEATSHEET.filter((item) => {
    if (category.value && item.category !== category.value) return false
    if (!text) return true
    return (
      item.token.toLowerCase().includes(text) ||
      item.description.toLowerCase().includes(text) ||
      item.example.toLowerCase().includes(text) ||
      item.category.includes(text)
    )
  })
})

async function copy(token) {
  try {
    await copyText(token)
    ElMessage.success('语法已复制')
  } catch (error) {
    ElMessage.error(error.message)
  }
}
</script>
