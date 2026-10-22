<template>
  <ToolPage
    title="SQL 格式化"
    description="使用 sql-formatter 对 SQL 文本做缩进、换行与关键字大小写整理。只格式化文本，不连接数据库、不执行 SQL。"
    category="development"
  >
    <div class="toolbox-panel">
      <el-form label-position="top" class="toolbox-form">
        <el-form-item label="SQL">
          <el-input v-model="input" type="textarea" :rows="12" class="toolbox-mono" />
        </el-form-item>
        <el-row :gutter="14">
          <el-col :xs="24" :sm="6">
            <el-form-item label="方言">
              <el-select v-model="language" class="toolbox-field-full">
                <el-option label="标准 SQL" value="sql" />
                <el-option label="MySQL" value="mysql" />
                <el-option label="PostgreSQL" value="postgresql" />
                <el-option label="SQLite" value="sqlite" />
                <el-option label="SQL Server" value="tsql" />
                <el-option label="BigQuery" value="bigquery" />
                <el-option label="Snowflake" value="snowflake" />
                <el-option label="PL/SQL" value="plsql" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="6">
            <el-form-item label="缩进宽度">
              <el-input-number v-model="tabWidth" :min="1" :max="8" class="toolbox-field-full" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="6">
            <el-form-item label="关键字大小写">
              <el-select v-model="keywordCase" class="toolbox-field-full">
                <el-option label="大写" value="upper" />
                <el-option label="小写" value="lower" />
                <el-option label="保持" value="preserve" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="6">
            <el-form-item label="操作">
              <div class="toolbox-inline">
                <el-button type="primary" icon="MagicStick" @click="format">格式化</el-button>
                <el-button icon="Delete" @click="clearAll">清空</el-button>
              </div>
            </el-form-item>
          </el-col>
        </el-row>
        <el-checkbox v-model="blanksBetween">查询之间保留空行</el-checkbox>
        <p class="toolbox-hint">格式化不保证 SQL 语法或业务语义正确，执行前仍需在数据库中校验。</p>
      </el-form>
    </div>

    <ToolResult
      label="格式化结果"
      :text="result"
      :rows="rows"
      :error="error"
      filename="formatted.sql"
      mime="text/plain;charset=utf-8"
      clearable
      @clear="result = ''"
    />
  </ToolPage>
</template>

<script setup>
import ToolPage from '@/components/Toolbox/ToolPage.vue'
import ToolResult from '@/components/Toolbox/ToolResult.vue'
import { format as formatSqlText } from 'sql-formatter'

const input = ref('select u.id,u.name,count(o.id) as orders from users u left join orders o on o.user_id=u.id where u.status = 1 group by u.id,u.name order by orders desc;')
const language = ref('sql')
const tabWidth = ref(2)
const keywordCase = ref('upper')
const blanksBetween = ref(false)
const result = ref('')
const rows = ref([])
const error = ref('')

function format() {
  error.value = ''
  result.value = ''
  rows.value = []
  try {
    if (!input.value.trim()) throw new Error('请输入 SQL')
    result.value = formatSqlText(input.value, {
      language: language.value,
      tabWidth: tabWidth.value,
      keywordCase: keywordCase.value,
      linesBetweenQueries: blanksBetween.value ? 2 : 1
    })
    rows.value = [
      { label: '方言', value: language.value },
      { label: '原始行数', value: String(input.value.split('\n').length) },
      { label: '格式化行数', value: String(result.value.split('\n').length) }
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

onMounted(format)
</script>
