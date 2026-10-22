<template>
  <ToolPage
    title="罗马数字转换"
    description="支持 1 至 3999 的标准罗马数字。输入会校验范围与规范写法，不会把非法组合静默转换为数字。"
    category="convert"
  >
    <div class="toolbox-grid toolbox-grid--2">
      <div class="toolbox-panel">
        <h3 class="toolbox-panel__title"><el-icon><SortUp /></el-icon>整数转罗马数字</h3>
        <el-form label-position="top" class="toolbox-form">
          <el-form-item label="1 - 3999 的整数">
            <el-input v-model="numberInput" clearable placeholder="例如 2024" />
          </el-form-item>
        </el-form>
        <ToolResult label="罗马数字" :text="numberResult.text" :error="numberResult.error" filename="roman.txt" />
      </div>

      <div class="toolbox-panel">
        <h3 class="toolbox-panel__title"><el-icon><SortDown /></el-icon>罗马数字转整数</h3>
        <el-form label-position="top" class="toolbox-form">
          <el-form-item label="罗马数字">
            <el-input v-model="romanInput" clearable placeholder="例如 MMXXIV" class="toolbox-mono" />
          </el-form-item>
        </el-form>
        <ToolResult label="整数" :text="romanResult.text" :error="romanResult.error" filename="roman-number.txt" />
      </div>
    </div>

    <div class="toolbox-panel">
      <h3 class="toolbox-panel__title"><el-icon><InfoFilled /></el-icon>规则提示</h3>
      <p class="toolbox-hint">
        标准写法只使用 I、V、X、L、C、D、M；同一符号最多连续出现三次；V、L、D 不可重复；减法组合仅允许
        IV、IX、XL、XC、CD、CM。输入小写会自动转大写，但不会接受 IL、IC 等非规范写法。
      </p>
    </div>
  </ToolPage>
</template>

<script setup>
import ToolPage from '@/components/Toolbox/ToolPage.vue'
import ToolResult from '@/components/Toolbox/ToolResult.vue'
import { fromRoman, toRoman } from '@/utils/toolbox/encoding'

const numberInput = ref('2024')
const romanInput = ref('MMXXIV')

const numberResult = computed(() => {
  try {
    return { text: toRoman(numberInput.value), error: '' }
  } catch (error) {
    return { text: '', error: error.message }
  }
})

const romanResult = computed(() => {
  try {
    return { text: String(fromRoman(romanInput.value)), error: '' }
  } catch (error) {
    return { text: '', error: error.message }
  }
})
</script>
