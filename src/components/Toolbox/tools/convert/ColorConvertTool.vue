<template>
  <ToolPage
    title="颜色格式转换"
    description="在 HEX、RGB(A)、HSL(A) 之间转换。支持 #RGB/#RGBA/#RRGGBB/#RRGGBBAA、rgb()/rgba()、hsl()/hsla() 与常用颜色名。"
    category="convert"
  >
    <div class="toolbox-grid toolbox-grid--2">
      <div class="toolbox-panel">
        <h3 class="toolbox-panel__title"><el-icon><Brush /></el-icon>输入颜色</h3>
        <el-form label-position="top" class="toolbox-form">
          <el-form-item label="颜色值">
            <el-input v-model="input" clearable placeholder="#409EFF、rgb(64, 158, 255)、hsl(210, 100%, 63%)" class="toolbox-mono" />
          </el-form-item>
          <el-form-item label="取色器">
            <div class="toolbox-inline">
              <el-color-picker :model-value="pickerValue" show-alpha @change="onPick" />
              <span class="toolbox-hint">取色器使用 HEX/HEX8 写入左侧输入。</span>
            </div>
          </el-form-item>
        </el-form>
        <div v-if="info" class="toolbox-color-swatch" :style="{ background: info.hex }" />
        <div v-else class="toolbox-empty">颜色格式不正确时不会显示预览。</div>
      </div>

      <ToolResult
        label="转换结果"
        :text="resultText"
        :rows="rows"
        :error="error"
        filename="color.txt"
        empty-text="输入颜色后显示 HEX、RGB、HSL 与对比度。"
      />
    </div>
  </ToolPage>
</template>

<script setup>
import ToolPage from '@/components/Toolbox/ToolPage.vue'
import ToolResult from '@/components/Toolbox/ToolResult.vue'
import { colorInfo, formatHex, parseColor } from '@/utils/toolbox/color'

const input = ref('#409EFF')

const parsed = computed(() => {
  try {
    return { info: colorInfo(input.value), error: '' }
  } catch (error) {
    return { info: null, error: error.message }
  }
})

const info = computed(() => parsed.value.info)
const error = computed(() => parsed.value.error)
const pickerValue = computed(() => (info.value ? formatHex(parseColor(input.value)) : '#409EFF'))

const rows = computed(() => {
  if (!info.value) return []
  return [
    { label: 'HEX', value: info.value.hex },
    { label: 'RGB', value: info.value.rgb },
    { label: 'HSL', value: info.value.hsl },
    { label: 'RGBA 通道', value: `r=${info.value.channels.r}, g=${info.value.channels.g}, b=${info.value.channels.b}, a=${info.value.channels.a}` },
    { label: '对白色对比度', value: `${info.value.contrastOnWhite}:1` },
    { label: '对黑色对比度', value: `${info.value.contrastOnBlack}:1` },
    { label: '建议文字色', value: info.value.readableText }
  ]
})

const resultText = computed(() => (info.value ? rows.value.map((row) => `${row.label}: ${row.value}`).join('\n') : ''))

function onPick(value) {
  if (value) input.value = value
}
</script>
