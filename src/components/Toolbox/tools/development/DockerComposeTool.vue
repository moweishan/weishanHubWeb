<template>
  <ToolPage
    title="Docker 命令转 Compose"
    description="使用 composerize 解析 docker run 文本并生成 compose.yaml。未知选项会明确报错，不执行 shell、不启动容器、不访问 Docker。"
    category="development"
  >
    <div class="toolbox-panel">
      <el-form label-position="top" class="toolbox-form">
        <el-form-item label="docker run 命令">
          <el-input v-model="input" type="textarea" :rows="8" class="toolbox-mono" />
        </el-form-item>
        <div class="toolbox-actions">
          <el-button type="primary" icon="Switch" @click="convert">转换</el-button>
          <el-button icon="Delete" @click="clearAll">清空</el-button>
        </div>
        <div class="toolbox-inline" style="margin-top: 8px">
          <span class="toolbox-hint">示例：</span>
          <el-button size="small" @click="loadSample('nginx')">Nginx</el-button>
          <el-button size="small" @click="loadSample('postgres')">PostgreSQL</el-button>
          <el-button size="small" @click="loadSample('node')">Node</el-button>
        </div>
        <p class="toolbox-hint">
          仅支持显式列出的 docker run 选项；管道、重定向、命令连接符与环境变量展开不会被执行。生成的 Compose 文本仅用于复制或下载。
        </p>
      </el-form>
    </div>

    <ToolResult
      label="compose.yaml"
      :text="yaml"
      :rows="rows"
      :error="error"
      :warning="warnings"
      filename="compose.yaml"
      mime="application/yaml;charset=utf-8"
      clearable
      @clear="clearAll"
    />
  </ToolPage>
</template>

<script setup>
import ToolPage from '@/components/Toolbox/ToolPage.vue'
import ToolResult from '@/components/Toolbox/ToolResult.vue'
import { dockerRunToCompose } from '@/utils/toolbox/docker'

const samples = {
  nginx:
    'docker run -d --name web -p 8080:80 -v nginx-html:/usr/share/nginx/html:ro --restart unless-stopped nginx:latest',
  postgres:
    'docker run -d --name db -e POSTGRES_PASSWORD=change-me -p 5432:5432 -v pgdata:/var/lib/postgresql/data postgres:16',
  node: 'docker run -dit --name app --network host -w /app -v "$PWD:/app" node:20-alpine sh'
}
const input = ref(samples.nginx)
const yaml = ref('')
const rows = ref([])
const warnings = ref([])
const error = ref('')

function convert() {
  error.value = ''
  yaml.value = ''
  rows.value = []
  warnings.value = []
  try {
    const result = dockerRunToCompose(input.value)
    yaml.value = result.yaml
    warnings.value = result.warnings
    rows.value = [
      { label: '输入 token 数', value: String(result.tokens.length) },
      { label: '输出行数', value: String(result.yaml.split('\n').length) },
      { label: '未知选项', value: '无（已通过白名单校验）' }
    ]
  } catch (err) {
    error.value = err.message
  }
}

function loadSample(key) {
  input.value = samples[key]
  convert()
}

function clearAll() {
  input.value = ''
  yaml.value = ''
  rows.value = []
  warnings.value = []
  error.value = ''
}
</script>
