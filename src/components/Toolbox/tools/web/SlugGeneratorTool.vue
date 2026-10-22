<template>
  <ToolPage
    title="URL Slug 生成"
    description="把标题转换为 URL 友好片段。默认移除音标与中文等非 ASCII 字符；勾选保留 Unicode 可保留中文，但不会自动转拼音。"
    category="web"
  >
    <div class="toolbox-panel">
      <el-form label-position="top" class="toolbox-form">
        <el-form-item label="标题或文本">
          <el-input v-model="input" clearable placeholder="例如 Hello World 你好，世界！" />
        </el-form-item>
        <el-row :gutter="14">
          <el-col :xs="24" :sm="8">
            <el-form-item label="分隔符">
              <el-select v-model="separator" class="toolbox-field-full">
                <el-option label="短横线 -" value="-" />
                <el-option label="下划线 _" value="_" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="8">
            <el-form-item label="大小写">
              <el-switch v-model="lowercase" active-text="转小写" inactive-text="保留大小写" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="8">
            <el-form-item label="Unicode">
              <el-switch v-model="keepUnicode" active-text="保留中文/Unicode" inactive-text="仅 ASCII" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
    </div>

    <ToolResult
      label="Slug"
      :text="result"
      :rows="rows"
      :error="error"
      :warning="warning"
      filename="slug.txt"
      empty-text="输入文本后实时生成。"
    />
  </ToolPage>
</template>

<script setup>
import ToolPage from '@/components/Toolbox/ToolPage.vue'
import ToolResult from '@/components/Toolbox/ToolResult.vue'
import { slugify } from '@/utils/toolbox/encoding'

const input = ref('Hello World 你好，世界！')
const separator = ref('-')
const lowercase = ref(true)
const keepUnicode = ref(false)
const error = ref('')

const result = computed(() => {
  try {
    error.value = ''
    return slugify(input.value, {
      separator: separator.value,
      lowercase: lowercase.value,
      keepUnicode: keepUnicode.value
    })
  } catch (err) {
    error.value = err.message
    return ''
  }
})

const rows = computed(() => [
  { label: '原长度', value: `${input.value.length} 字符` },
  { label: 'Slug 长度', value: `${result.value.length} 字符` },
  { label: '含非 ASCII', value: /[^\x00-\x7F]/.test(input.value) ? '是' : '否' }
])

const warning = computed(() =>
  !keepUnicode.value && /[^\x00-\x7F]/.test(input.value)
    ? '当前会移除中文等非 ASCII 字符；如需保留请开启“保留中文/Unicode”。本工具不提供拼音转写。'
    : ''
)
</script>
