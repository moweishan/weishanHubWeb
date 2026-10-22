<template>
  <ToolPage
    title="随机字符串生成"
    description="使用 crypto.getRandomValues 生成安全随机字符串。可选择大写、小写、数字与符号，并排除易混淆字符。"
    category="security"
  >
    <div class="toolbox-panel">
      <el-form label-position="top" class="toolbox-form">
        <el-row :gutter="14">
          <el-col :xs="24" :sm="8">
            <el-form-item label="长度">
              <el-input-number v-model="length" :min="1" :max="256" class="toolbox-field-full" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="8">
            <el-form-item label="生成数量">
              <el-input-number v-model="count" :min="1" :max="20" class="toolbox-field-full" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="8">
            <el-form-item label="操作">
              <div class="toolbox-inline">
                <el-button type="primary" icon="Refresh" @click="generate">生成</el-button>
                <el-button icon="Delete" @click="clearAll">清空</el-button>
              </div>
            </el-form-item>
          </el-col>
        </el-row>
        <div class="toolbox-check-group">
          <el-checkbox v-model="uppercase">大写 A-Z</el-checkbox>
          <el-checkbox v-model="lowercase">小写 a-z</el-checkbox>
          <el-checkbox v-model="digits">数字 0-9</el-checkbox>
          <el-checkbox v-model="symbols">符号 !@#$…</el-checkbox>
          <el-checkbox v-model="excludeAmbiguous">排除 I l 1 O 0 o</el-checkbox>
        </div>
        <p class="toolbox-hint">每个字符通过无偏随机整数选取；结果不会写入本地存储。需要口令时请结合足够长度与字符集。</p>
      </el-form>
    </div>

    <ToolResult
      label="随机字符串"
      :text="result"
      :rows="rows"
      :error="error"
      filename="random-strings.txt"
      clearable
      @clear="clearAll"
    />
  </ToolPage>
</template>

<script setup>
import ToolPage from '@/components/Toolbox/ToolPage.vue'
import ToolResult from '@/components/Toolbox/ToolResult.vue'
import { randomString } from '@/utils/toolbox/crypto'

const length = ref(24)
const count = ref(1)
const uppercase = ref(true)
const lowercase = ref(true)
const digits = ref(true)
const symbols = ref(false)
const excludeAmbiguous = ref(false)
const result = ref('')
const rows = ref([])
const error = ref('')

function generate() {
  error.value = ''
  result.value = ''
  rows.value = []
  try {
    const list = Array.from({ length: count.value }, () =>
      randomString({
        length: length.value,
        uppercase: uppercase.value,
        lowercase: lowercase.value,
        digits: digits.value,
        symbols: symbols.value,
        excludeAmbiguous: excludeAmbiguous.value
      })
    )
    result.value = list.join('\n')
    rows.value = [
      { label: '每条长度', value: String(length.value) },
      { label: '生成数量', value: String(list.length) },
      { label: '随机源', value: 'crypto.getRandomValues' }
    ]
  } catch (err) {
    error.value = err.message
  }
}

function clearAll() {
  result.value = ''
  rows.value = []
  error.value = ''
}

onDeactivated(clearAll)
</script>
