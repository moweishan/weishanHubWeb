<template>
  <ToolPage
    title="整数进制转换"
    description="使用 BigInt 手工解析与输出，不把输入先转换为 Number，因此大整数不会丢失精度。支持负数与 2 至 36 进制。"
    category="convert"
  >
    <div class="toolbox-panel">
      <el-form label-position="top" class="toolbox-form">
        <el-form-item label="整数">
          <el-input v-model="value" clearable placeholder="例如 123456789012345678901234567890" class="toolbox-mono" />
        </el-form-item>
        <el-row :gutter="14">
          <el-col :xs="24" :sm="8">
            <el-form-item label="源进制">
              <el-input-number v-model="fromBase" :min="2" :max="36" class="toolbox-field-full" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="8">
            <el-form-item label="目标进制">
              <el-input-number v-model="toBase" :min="2" :max="36" class="toolbox-field-full" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="8">
            <el-form-item label="输出字母">
              <el-switch v-model="uppercase" active-text="大写" inactive-text="小写" />
            </el-form-item>
          </el-col>
        </el-row>
        <div class="toolbox-inline">
          <span class="toolbox-hint">常用进制：</span>
          <el-button v-for="base in [2, 8, 10, 16, 36]" :key="base" size="small" @click="toBase = base">{{ base }}</el-button>
        </div>
      </el-form>
    </div>

    <ToolResult
      label="转换结果"
      :text="result"
      :error="error"
      :warning="warning"
      filename="base-converted.txt"
      empty-text="输入整数后实时转换。"
    />
  </ToolPage>
</template>

<script setup>
import ToolPage from '@/components/Toolbox/ToolPage.vue'
import ToolResult from '@/components/Toolbox/ToolResult.vue'
import { convertBase } from '@/utils/toolbox/encoding'

const value = ref('9007199254740993')
const fromBase = ref(10)
const toBase = ref(16)
const uppercase = ref(true)
const warning = '目标进制大于 10 时，字母大小写仅影响输出显示，不影响数值。'

const converted = computed(() => {
  try {
    return { text: convertBase(value.value, fromBase.value, toBase.value, { uppercase: uppercase.value }), error: '' }
  } catch (error) {
    return { text: '', error: error.message }
  }
})

const result = computed(() => converted.value.text)
const error = computed(() => converted.value.error)
</script>
