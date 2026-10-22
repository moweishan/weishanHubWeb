<template>
  <ToolPage :title="title" :description="description" category="convert">
    <div class="toolbox-panel">
      <el-form label-position="top" class="toolbox-form">
        <el-form-item :label="`${fromLabel} 内容`">
          <el-input v-model="input" type="textarea" :rows="10" :placeholder="placeholder" class="toolbox-mono" />
        </el-form-item>
        <el-row :gutter="14">
          <el-col v-if="to === 'json' || to === 'yaml'" :xs="24" :sm="8">
            <el-form-item label="缩进">
              <el-select v-model="indent" class="toolbox-field-full">
                <el-option label="2 空格" :value="2" />
                <el-option label="4 空格" :value="4" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col v-if="to === 'yaml'" :xs="24" :sm="8">
            <el-form-item label="行宽（0 = 不限制）">
              <el-input-number v-model="lineWidth" :min="0" :max="200" class="toolbox-field-full" />
            </el-form-item>
          </el-col>
          <el-col v-if="to === 'json'" :xs="24" :sm="8">
            <el-form-item label="键排序">
              <el-switch v-model="sortKeys" active-text="按键名排序" inactive-text="保留原顺序" />
            </el-form-item>
          </el-col>
        </el-row>
        <div class="toolbox-actions">
          <el-button type="primary" icon="Switch" @click="convert">开始转换</el-button>
          <el-button icon="DocumentAdd" @click="loadSample">载入示例</el-button>
          <el-button icon="Delete" @click="clearAll">清空</el-button>
        </div>
        <p v-if="hint" class="toolbox-hint">{{ hint }}</p>
      </el-form>
    </div>

    <ToolResult
      :label="`${toLabel} 结果`"
      :text="result"
      :error="error"
      :warning="warnings"
      :filename="`converted.${to === 'yaml' ? 'yaml' : to}`"
      clearable
      @clear="result = ''"
    />
  </ToolPage>
</template>

<script setup>
import ToolPage from '@/components/Toolbox/ToolPage.vue'
import ToolResult from '@/components/Toolbox/ToolResult.vue'
import { parseJson, parseToml, parseYaml, stringifyJson, stringifyToml, stringifyYaml } from '@/utils/toolbox/structured'

const props = defineProps({
  from: { type: String, required: true, validator: (value) => ['json', 'yaml', 'toml'].includes(value) },
  to: { type: String, required: true, validator: (value) => ['json', 'yaml', 'toml'].includes(value) }
})

const labels = { json: 'JSON', yaml: 'YAML', toml: 'TOML' }
const fromLabel = computed(() => labels[props.from])
const toLabel = computed(() => labels[props.to])
const title = computed(() => `${fromLabel.value} 转 ${toLabel.value}`)
const description = computed(() => {
  const parser = props.from === 'json' ? 'JSON.parse' : props.from === 'yaml' ? 'yaml 库' : 'smol-toml'
  return `使用 ${parser} 解析${fromLabel.value}，再通过${toLabel.value}序列化器输出。解析或类型不兼容时会显示具体错误，不会静默输出空内容。`
})

const samples = {
  json: '{\n  "server": {\n    "host": "127.0.0.1",\n    "port": 8080\n  },\n  "features": ["auth", "logging"]\n}',
  yaml: 'server:\n  host: 127.0.0.1\n  port: 8080\nfeatures:\n  - auth\n  - logging\n',
  toml: 'title = "weishanHub"\n\n[server]\nhost = "127.0.0.1"\nport = 8080\n'
}

const input = ref(samples[props.from])
const indent = ref(2)
const lineWidth = ref(0)
const sortKeys = ref(false)
const result = ref('')
const error = ref('')
const warnings = computed(() => {
  const list = []
  if (props.to === 'toml') {
    list.push('TOML 根节点必须是对象；null、混合类型数组、深层数组等结构可能无法表达。')
    if (props.from === 'yaml') list.push('YAML 的锚点、别名、多文档与自定义标签不会原样保留。')
  }
  if (props.from === 'toml' && props.to === 'yaml') {
    list.push('TOML 的日期时间类型在 YAML 中可能显示为字符串或 Date 的序列化结果。')
  }
  if (props.from === 'yaml') list.push('重复键、注释与锚点信息在解析后不会保留。')
  return list
})
const placeholder = computed(() => `粘贴 ${fromLabel.value} 内容`)
const hint = computed(() => {
  if (props.to === 'toml') return '转换只处理数据，不执行任何代码。'
  return '输出是纯文本，不会写入文件系统或发送到服务器。'
})

function convert() {
  error.value = ''
  result.value = ''
  try {
    const value =
      props.from === 'json' ? parseJson(input.value) : props.from === 'yaml' ? parseYaml(input.value) : parseToml(input.value)
    if (props.to === 'json') {
      result.value = stringifyJson(value, { indent: indent.value, sortKeys: sortKeys.value })
    } else if (props.to === 'yaml') {
      result.value = stringifyYaml(value, { indent: indent.value, lineWidth: lineWidth.value })
    } else {
      result.value = stringifyToml(value)
    }
  } catch (err) {
    error.value = err.message
  }
}

function loadSample() {
  input.value = samples[props.from]
  result.value = ''
  error.value = ''
}

function clearAll() {
  input.value = ''
  result.value = ''
  error.value = ''
}
</script>
