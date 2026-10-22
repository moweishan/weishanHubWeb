<template>
  <ToolPage
    title="URL 编解码"
    description="区分完整 URL 与查询参数值：完整 URL 使用 encodeURI/decodeURI，查询参数值使用 encodeURIComponent/decodeURIComponent。"
    category="web"
  >
    <div class="toolbox-panel">
      <el-form label-position="top" class="toolbox-form">
        <el-row :gutter="14">
          <el-col :xs="24" :sm="8">
            <el-form-item label="操作">
              <el-radio-group v-model="mode">
                <el-radio-button value="encode">编码</el-radio-button>
                <el-radio-button value="decode">解码</el-radio-button>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="16">
            <el-form-item label="范围">
              <el-radio-group v-model="scope">
                <el-radio-button value="component">查询参数值</el-radio-button>
                <el-radio-button value="full">完整 URL</el-radio-button>
              </el-radio-group>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item :label="mode === 'encode' ? '原始内容' : '已编码内容'">
          <el-input v-model="input" type="textarea" :rows="6" class="toolbox-mono" placeholder="https://example.com/搜索?q=你好 世界" />
        </el-form-item>
        <div class="toolbox-actions">
          <el-button type="primary" icon="Switch" @click="convert">转换</el-button>
          <el-button icon="Delete" @click="clearAll">清空</el-button>
        </div>
        <p class="toolbox-hint">
          完整 URL 编码不会转义 : / ? # 等结构字符；查询参数值编码会转义它们。解码不完整的 % 转义会报错。
        </p>
      </el-form>
    </div>

    <ToolResult label="转换结果" :text="result" :rows="rows" :error="error" filename="url-codec.txt" clearable @clear="clearAll" />
  </ToolPage>
</template>

<script setup>
import ToolPage from '@/components/Toolbox/ToolPage.vue'
import ToolResult from '@/components/Toolbox/ToolResult.vue'
import { decodeUrl, encodeUrl } from '@/utils/toolbox/encoding'

const mode = ref('encode')
const scope = ref('component')
const input = ref('https://example.com/搜索?q=你好 世界')
const result = ref('')
const rows = ref([])
const error = ref('')

function convert() {
  error.value = ''
  result.value = ''
  rows.value = []
  try {
    result.value = mode.value === 'encode' ? encodeUrl(input.value, scope.value) : decodeUrl(input.value, scope.value)
    rows.value = [
      { label: '模式', value: mode.value === 'encode' ? '编码' : '解码' },
      { label: '范围', value: scope.value === 'full' ? '完整 URL' : '查询参数值' },
      { label: '原长度', value: `${input.value.length} 字符` },
      { label: '结果长度', value: `${result.value.length} 字符` }
    ]
  } catch (err) {
    error.value = err.message
  }
}

function clearAll() {
  input.value = ''
  result.value = ''
  rows.value = []
  error.value = ''
}

watch([mode, scope], () => {
  result.value = ''
  rows.value = []
  error.value = ''
})
</script>
