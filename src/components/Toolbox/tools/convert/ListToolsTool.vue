<template>
  <ToolPage
    title="列表整理"
    description="按行拆分列表，可去空行、去重、排序、添加前后缀、编号，并选择输出分隔符。排序使用中文本地化比较。"
    category="convert"
  >
    <div class="toolbox-panel">
      <el-form label-position="top" class="toolbox-form">
        <el-form-item label="原始列表（每行一项）">
          <el-input v-model="input" type="textarea" :rows="8" placeholder="苹果&#10;香蕉&#10;苹果&#10;橙子" />
        </el-form-item>
        <el-row :gutter="14">
          <el-col :xs="24" :sm="8">
            <el-form-item label="排序">
              <el-select v-model="sort" class="toolbox-field-full">
                <el-option label="保持原顺序" value="none" />
                <el-option label="升序 A→Z" value="asc" />
                <el-option label="降序 Z→A" value="desc" />
                <el-option label="按长度" value="length" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="8">
            <el-form-item label="编号">
              <el-select v-model="numbering" class="toolbox-field-full">
                <el-option label="不编号" value="none" />
                <el-option label="1. 2. 3." value="number" />
                <el-option label="- 项目符号" value="dash" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="8">
            <el-form-item label="输出分隔符">
              <el-select v-model="separator" class="toolbox-field-full">
                <el-option label="换行" value="\n" />
                <el-option label="逗号 + 空格" value=", " />
                <el-option label="分号 + 空格" value="; " />
                <el-option label="竖线" value=" | " />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="14">
          <el-col :xs="24" :sm="12">
            <el-form-item label="每项前缀">
              <el-input v-model="prefix" placeholder="例如 - " />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12">
            <el-form-item label="每项后缀">
              <el-input v-model="suffix" placeholder="例如 ;" />
            </el-form-item>
          </el-col>
        </el-row>
        <div class="toolbox-check-group">
          <el-checkbox v-model="trim">去除每项首尾空白</el-checkbox>
          <el-checkbox v-model="removeEmpty">移除空行</el-checkbox>
          <el-checkbox v-model="dedupe">去重（保留首次出现）</el-checkbox>
        </div>
      </el-form>
    </div>

    <ToolResult
      label="整理结果"
      :text="result"
      :rows="rows"
      :error="error"
      filename="list.txt"
      empty-text="输入列表后实时整理。"
      clearable
      @clear="input = ''"
    />
  </ToolPage>
</template>

<script setup>
import ToolPage from '@/components/Toolbox/ToolPage.vue'
import ToolResult from '@/components/Toolbox/ToolResult.vue'
import { processList } from '@/utils/toolbox/encoding'

const input = ref('苹果\n香蕉\n苹果\n橙子')
const sort = ref('none')
const numbering = ref('none')
const separator = ref('\\n')
const prefix = ref('')
const suffix = ref('')
const trim = ref(true)
const removeEmpty = ref(true)
const dedupe = ref(false)
const error = ref('')

const actualSeparator = computed(() => {
  if (separator.value === '\\n') return '\n'
  return separator.value
})

const result = computed(() => {
  try {
    error.value = ''
    return processList(input.value, {
      trim: trim.value,
      removeEmpty: removeEmpty.value,
      dedupe: dedupe.value,
      sort: sort.value,
      prefix: prefix.value,
      suffix: suffix.value,
      numbering: numbering.value,
      separator: actualSeparator.value
    })
  } catch (err) {
    error.value = err.message
    return ''
  }
})

const rows = computed(() => {
  const lines = input.value.split(/\r?\n/)
  const cleaned = lines.filter((line) => (removeEmpty.value ? line.trim() : true))
  return [
    { label: '原始行数', value: String(lines.length) },
    { label: '处理后项数', value: String(result.value ? result.value.split(actualSeparator.value).length : 0) },
    { label: '非空原始行', value: String(cleaned.length) }
  ]
})
</script>
