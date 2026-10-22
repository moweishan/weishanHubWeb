<template>
  <ToolPage
    title="大小写与命名转换"
    description="识别空格、下划线、连字符、点号与 camelCase 单词边界，转换到常用命名风格。"
    category="convert"
  >
    <div class="toolbox-panel">
      <el-form label-position="top" class="toolbox-form">
        <el-form-item label="输入文本">
          <el-input v-model="input" clearable placeholder="例如 user profile name 或 userName" />
        </el-form-item>
        <el-form-item label="目标格式">
          <el-select v-model="target" class="toolbox-field-full">
            <el-option v-for="item in targets" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
      </el-form>
    </div>

    <div class="toolbox-grid toolbox-grid--2">
      <ToolResult label="选中格式" :text="result" :error="error" filename="case.txt" />
      <div class="toolbox-panel">
        <h3 class="toolbox-panel__title"><el-icon><List /></el-icon>全部格式</h3>
        <el-table :data="allRows" size="small" border>
          <el-table-column prop="label" label="格式" width="130" />
          <el-table-column prop="value" label="结果">
            <template #default="{ row }">
              <span class="toolbox-mono">{{ row.value }}</span>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>
  </ToolPage>
</template>

<script setup>
import ToolPage from '@/components/Toolbox/ToolPage.vue'
import ToolResult from '@/components/Toolbox/ToolResult.vue'
import { convertCase } from '@/utils/toolbox/encoding'

const targets = [
  { value: 'lower', label: '全小写 lower' },
  { value: 'upper', label: '全大写 UPPER' },
  { value: 'title', label: '标题 Title Case' },
  { value: 'sentence', label: '句首大写 Sentence case' },
  { value: 'camel', label: '小驼峰 camelCase' },
  { value: 'pascal', label: '大驼峰 PascalCase' },
  { value: 'snake', label: '下划线 snake_case' },
  { value: 'kebab', label: '短横线 kebab-case' },
  { value: 'constant', label: '常量 CONSTANT_CASE' },
  { value: 'dot', label: '点号 dot.case' },
  { value: 'path', label: '路径 path/case' },
  { value: 'train', label: '连字符 Train-Case' }
]

const input = ref('user profile name')
const target = ref('camel')

const error = ref('')
const allRows = computed(() => {
  try {
    error.value = ''
    return targets.map((item) => ({ ...item, value: convertCase(input.value, item.value) }))
  } catch (err) {
    error.value = err.message
    return []
  }
})

const result = computed(() => {
  if (!input.value.trim()) return ''
  try {
    return convertCase(input.value, target.value)
  } catch (error) {
    return ''
  }
})
</script>
