<template>
  <ToolPage
    title="表格文件转换"
    description="本地读取 XLSX、CSV 或 JSON，预览后转换为 XLSX、CSV 或 JSON。保留前导 0 与文本日期；数据转换不保证公式、样式、宏或所有公式缓存值无损。"
    category="files"
  >
    <div class="toolbox-panel">
      <FileDrop
        v-model="file"
        label="选择 XLSX / CSV / JSON"
        accept=".xlsx,.xls,.csv,.json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,application/json"
        :max-mb="20"
        hint="单个文件不超过 20 MB；XLSX 最多 50,000 行、500 列。不会上传。"
      />
      <div v-if="sourceType" class="toolbox-inline" style="margin-top: 12px">
        <el-tag type="info">{{ sourceType.toUpperCase() }}</el-tag>
        <span class="toolbox-meta">{{ fileName }}</span>
        <span class="toolbox-meta">{{ file ? formatBytes(file.size) : '' }}</span>
        <el-tag v-if="sheetNames.length > 1" type="warning">当前仅导出选中的工作表</el-tag>
      </div>
      <el-alert v-if="error" type="error" :closable="false" show-icon :title="error" style="margin-top: 12px" />
    </div>

    <div v-if="sourceType" class="toolbox-panel" v-loading="loading">
      <el-form label-position="top" class="toolbox-form">
        <el-row :gutter="14">
          <el-col v-if="sheetNames.length" :xs="24" :sm="6">
            <el-form-item label="工作表">
              <el-select v-model="activeSheet" class="toolbox-field-full">
                <el-option v-for="name in sheetNames" :key="name" :label="name" :value="name" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="5">
            <el-form-item label="表头">
              <el-checkbox v-model="hasHeader">首行作为表头</el-checkbox>
            </el-form-item>
          </el-col>
          <el-col v-if="sourceType === 'csv'" :xs="24" :sm="5">
            <el-form-item label="CSV 分隔符">
              <el-select v-model="delimiter" class="toolbox-field-full">
                <el-option label="逗号 ," value="," />
                <el-option label="分号 ;" value=";" />
                <el-option label="制表符 Tab" value="tab" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="4">
            <el-form-item label="输出格式">
              <el-select v-model="outputFormat" class="toolbox-field-full">
                <el-option label="XLSX" value="xlsx" />
                <el-option label="CSV" value="csv" />
                <el-option label="JSON" value="json" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="4">
            <el-form-item label="操作">
              <el-button type="primary" icon="Switch" :loading="converting" @click="convert">开始转换</el-button>
            </el-form-item>
          </el-col>
        </el-row>
        <p class="toolbox-hint">
          JSON 仅接受对象数组或二维数组；CSV 支持引号、逗号、换行与 UTF-8 BOM。XLSX 输入读取缓存显示值，不重新计算公式；字符串
          “=...” 在输出中作为文本，不执行公式。
        </p>
      </el-form>
    </div>

    <div v-if="headers.length" class="toolbox-panel">
      <h3 class="toolbox-panel__title"><el-icon><Grid /></el-icon>预览（前 {{ previewRows.length }} 行，共 {{ rows.length }} 行）</h3>
      <p class="toolbox-hint">此处只是预览，转换会输出全部 {{ rows.length }} 行；当前工作表：{{ activeSheet || '数据' }}。</p>
      <el-alert
        v-if="headerRenames.length"
        type="warning"
        :closable="false"
        show-icon
        :title="`检测到重复或空表头，已自动重命名：${headerRenameText}`"
        style="margin-bottom: 8px"
      />
      <div class="toolbox-table-wrap">
        <el-table :data="previewRows" size="small" border max-height="360">
          <el-table-column
            v-for="(header, index) in headers"
            :key="`${header}-${index}`"
            :label="header"
            min-width="140"
            show-overflow-tooltip
          >
            <template #default="{ row }">{{ row[index] }}</template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <ToolResult
      v-if="resultReady"
      label="转换结果"
      :text="resultText"
      :rows="resultRows"
      :error="error"
      :warning="resultWarning"
      :filename="resultName"
      :show-download="false"
    >
      <div class="toolbox-actions">
        <el-button type="success" icon="Download" @click="downloadResult">下载 {{ resultName }}</el-button>
      </div>
    </ToolResult>
  </ToolPage>
</template>

<script setup>
import ToolPage from '@/components/Toolbox/ToolPage.vue'
import ToolResult from '@/components/Toolbox/ToolResult.vue'
import FileDrop from '@/components/Toolbox/FileDrop.vue'
import { downloadBlob, downloadText, formatBytes, readFileAsArrayBuffer, readFileAsText } from '@/utils/toolbox/io'
import {
  normalizeJsonTable,
  parseCsvText,
  rowsToObjects,
  serializeCsv,
  stripBom,
  tableFromWorksheet
} from '@/utils/toolbox/spreadsheet'

const MAX_ROWS = 50000
const MAX_COLS = 500
const file = ref(null)
const sourceType = ref('')
const fileName = ref('')
const loading = ref(false)
const converting = ref(false)
const error = ref('')
const workbook = ref(null)
const rawMatrix = ref(null)
const rawText = ref('')
const rawJson = ref(null)
const sheetNames = ref([])
const activeSheet = ref('')
const hasHeader = ref(true)
const delimiter = ref(',')
const outputFormat = ref('xlsx')
const headers = ref([])
const rows = ref([])
const headerRenames = ref([])
const headerRenameText = computed(() =>
  headerRenames.value.map((item) => `${item.original || '(空)'} → ${item.renamed}`).join('；')
)
const resultText = ref('')
const resultRows = ref([])
const resultBlob = ref(null)
const resultName = ref('converted.xlsx')
const resultWarning = ref('')
const resultReady = ref(false)
let readToken = 0
let convertToken = 0

const previewRows = computed(() => rows.value.slice(0, 20))

watch(file, async (value) => {
  const token = ++readToken
  await openFile(value, token)
})

watch(activeSheet, async () => {
  if (!workbook.value || !activeSheet.value) return
  const selectedSheet = activeSheet.value
  const worksheet = workbook.value.Sheets[selectedSheet]
  if (!worksheet) return
  try {
    const module = await import('xlsx')
    const XLSX = module.default || module
    if (selectedSheet !== activeSheet.value) return
    rawMatrix.value = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false, defval: '', blankrows: false })
    rebuildTable()
  } catch (err) {
    error.value = err.message
  }
})

watch([hasHeader, delimiter], () => {
  if (!sourceType.value) return
  rebuildTable()
})

watch(outputFormat, () => {
  convertToken++
  resetResult()
})

function extname(name) {
  return String(name || '').toLowerCase().split('.').pop()
}

async function openFile(value, token) {
  error.value = ''
  resetResult()
  resetSource()
  if (!value) return
  loading.value = true
  fileName.value = value.name
  const extension = extname(value.name)
  try {
    if (extension === 'xlsx' || extension === 'xls') {
      sourceType.value = 'xlsx'
      const module = await import('xlsx')
      if (token !== readToken) return
      const XLSX = module.default || module
      const buffer = await readFileAsArrayBuffer(value, { maxBytes: 20 * 1024 * 1024 })
      if (token !== readToken) return
      const moduleWorkbook = XLSX.read(new Uint8Array(buffer), {
        type: 'array',
        cellFormula: false,
        cellText: true,
        cellNF: true,
        cellDates: false
      })
      workbook.value = moduleWorkbook
      sheetNames.value = moduleWorkbook.SheetNames || []
      if (!sheetNames.value.length) throw new Error('工作簿没有工作表')
      activeSheet.value = sheetNames.value[0]
      const worksheet = moduleWorkbook.Sheets[activeSheet.value]
      rawMatrix.value = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false, defval: '', blankrows: false })
      rebuildTable()
    } else if (extension === 'csv') {
      sourceType.value = 'csv'
      rawText.value = stripBom(await readFileAsText(value, { maxBytes: 20 * 1024 * 1024 }))
      if (token !== readToken) return
      rebuildTable()
    } else if (extension === 'json') {
      sourceType.value = 'json'
      const text = stripBom(await readFileAsText(value, { maxBytes: 20 * 1024 * 1024 }))
      if (token !== readToken) return
      rawJson.value = JSON.parse(text)
      rebuildTable()
    } else {
      throw new Error('只支持 .xlsx、.xls、.csv 或 .json 文件')
    }
  } catch (err) {
    if (token !== readToken) return
    error.value = err.message
    resetSource()
  } finally {
    if (token === readToken) loading.value = false
  }
}

function resetSource() {
  sourceType.value = ''
  workbook.value = null
  rawMatrix.value = null
  rawText.value = ''
  rawJson.value = null
  sheetNames.value = []
  activeSheet.value = ''
  headers.value = []
  rows.value = []
  headerRenames.value = []
}

function rebuildTable() {
  error.value = ''
  try {
    let table
    if (sourceType.value === 'xlsx') {
      table = tableFromWorksheet(rawMatrix.value || [], { hasHeader: hasHeader.value })
    } else if (sourceType.value === 'csv') {
      table = parseCsvText(rawText.value, {
        delimiter: delimiter.value === 'tab' ? '\t' : delimiter.value,
        hasHeader: hasHeader.value
      })
    } else if (sourceType.value === 'json') {
      table = normalizeJsonTable(rawJson.value, { hasHeader: hasHeader.value })
    } else {
      return
    }
    if (table.headers.length > MAX_COLS) throw new Error(`列数 ${table.headers.length} 超过 ${MAX_COLS} 列限制`)
    if (table.rows.length > MAX_ROWS) throw new Error(`行数 ${table.rows.length} 超过 ${MAX_ROWS} 行限制`)
    headers.value = table.headers
    rows.value = table.rows
    headerRenames.value = table.headerRenames || []
    resetResult()
  } catch (err) {
    headers.value = []
    rows.value = []
    headerRenames.value = []
    resetResult()
    error.value = err.message
  }
}

async function convert() {
  error.value = ''
  resetResult()
  if (!headers.value.length) {
    error.value = '没有可转换的数据'
    return
  }
  converting.value = true
  const token = readToken
  const targetFormat = outputFormat.value
  const currentConvert = ++convertToken
  try {
    if (targetFormat === 'xlsx') {
      const module = await import('xlsx')
      if (token !== readToken || currentConvert !== convertToken) return
      const XLSX = module.default || module
      const matrix = [headers.value, ...rows.value]
      const worksheet = XLSX.utils.aoa_to_sheet(matrix)
      const moduleWorkbook = XLSX.utils.book_new()
      const sheetName = String(activeSheet.value || '数据')
        .slice(0, 31)
        .replace(/[\\/?*\[\]:]/g, '_') || '数据'
      XLSX.utils.book_append_sheet(moduleWorkbook, worksheet, sheetName)
      const bytes = XLSX.write(moduleWorkbook, { bookType: 'xlsx', type: 'array' })
      resultBlob.value = new Blob([bytes], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
      resultName.value = 'converted.xlsx'
      resultText.value = `已生成 XLSX，当前工作表：${activeSheet.value || '数据'}；共 ${rows.value.length} 行、${headers.value.length} 列。`
      resultRows.value = [
        { label: '工作表', value: activeSheet.value || '数据' },
        { label: '行数', value: String(rows.value.length) },
        { label: '列数', value: String(headers.value.length) }
      ]
      resultWarning.value = '只导出当前选中的工作表；公式、样式、宏、批注与合并单元格不会完整保留，公式字符串按文本写入。'
    } else if (targetFormat === 'csv') {
      resultText.value = serializeCsv(headers.value, rows.value, {
        delimiter: delimiter.value === 'tab' ? '\t' : delimiter.value,
        includeHeader: true
      })
      resultName.value = 'converted.csv'
      resultRows.value = [
        { label: '行数', value: String(rows.value.length) },
        { label: '列数', value: String(headers.value.length) },
        { label: '下载', value: 'CSV 下载会添加 UTF-8 BOM' }
      ]
      resultWarning.value = 'CSV 只保留文本；前导 0、手机号与长 ID 按原文本写出，不转 Number。'
    } else {
      resultText.value = JSON.stringify(rowsToObjects(headers.value, rows.value), null, 2)
      resultName.value = 'converted.json'
      resultRows.value = [
        { label: '对象数', value: String(rows.value.length) },
        { label: '字段数', value: String(headers.value.length) }
      ]
      resultWarning.value = 'JSON 以对象数组输出，所有值按预览文本写出；不保留 XLSX 数据类型、公式或样式。'
    }
    resultReady.value = true
  } catch (err) {
    if (currentConvert === convertToken) error.value = err.message
  } finally {
    converting.value = false
  }
}

function resetResult() {
  convertToken++
  if (resultBlob.value) {
    resultBlob.value = null
  }
  resultText.value = ''
  resultRows.value = []
  resultReady.value = false
  resultWarning.value = ''
}

function downloadResult() {
  if (resultBlob.value) {
    downloadBlob(resultBlob.value, resultName.value)
    return
  }
  if (resultName.value.endsWith('.csv')) {
    const blob = new Blob(['\ufeff', resultText.value], { type: 'text/csv;charset=utf-8' })
    downloadBlob(blob, resultName.value)
    return
  }
  downloadText(resultText.value, resultName.value, 'application/json;charset=utf-8')
}

function clearAll() {
  readToken++
  convertToken++
  file.value = null
  resetSource()
  resetResult()
  error.value = ''
  loading.value = false
  converting.value = false
}

onDeactivated(clearAll)
onBeforeUnmount(clearAll)
</script>
