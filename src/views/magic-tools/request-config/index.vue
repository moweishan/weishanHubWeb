<template>
  <div class="app-container">
    <el-alert type="info" :closable="false" show-icon class="mb16">
      <template #title>配置说明</template>
      <div class="config-tip">
        任务提交时使用当前所有启用接口的配置，后续修改、删除或停用仅影响新任务。
        URL、请求头、Query 参数和请求体都支持
        <code v-pre>{{phone}}</code>
        占位符，执行时替换为任务手机号；URL 与 Query/FORM 参数会自动做 URL 编码，JSON 请求体会做 JSON 转义。
      </div>
    </el-alert>

    <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch">
      <el-form-item label="接口名称" prop="configName">
        <el-input
          v-model="queryParams.configName"
          placeholder="请输入接口名称"
          clearable
          style="width: 220px"
          @keyup.enter="handleQuery"
        />
      </el-form-item>
      <el-form-item label="启用状态" prop="enabled">
        <el-select v-model="queryParams.enabled" placeholder="全部" clearable style="width: 160px">
          <el-option label="启用" value="0" />
          <el-option label="停用" value="1" />
        </el-select>
      </el-form-item>
      <el-form-item label="试活状态" prop="probeStatus">
        <el-select v-model="queryParams.probeStatus" placeholder="全部" clearable style="width: 140px">
          <el-option label="未测" value="untested" />
          <el-option label="有效" value="alive" />
          <el-option label="失效" value="dead" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
        <el-button
          type="warning"
          plain
          icon="Connection"
          @click="handleProbe"
          v-hasPermi="['magic:requestConfig:probe']"
        >批量试活</el-button>
        <el-button icon="Refresh" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <el-row :gutter="10" class="mb8">
      <el-col :span="1.5">
        <el-button
          type="primary"
          plain
          icon="Plus"
          @click="handleAdd"
          v-hasPermi="['magic:requestConfig:add']"
        >新增</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button
          type="info"
          plain
          icon="Upload"
          @click="handleImport"
          v-hasPermi="['magic:requestConfig:import']"
        >导入</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button
          type="warning"
          plain
          icon="Download"
          @click="handleExport"
          v-hasPermi="['magic:requestConfig:export']"
        >导出</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button
          type="danger"
          plain
          icon="CircleClose"
          @click="handleDisableDead"
          v-hasPermi="['magic:requestConfig:edit']"
        >停用全部失效</el-button>
      </el-col>
      <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
    </el-row>

    <el-table v-loading="loading" :data="configList">
      <el-table-column label="启用" align="center" width="80">
        <template #default="scope">
          <el-tag :type="scope.row.enabled === '0' ? 'success' : 'info'">
            {{ scope.row.enabled === '0' ? '启用' : '停用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="接口名称" align="center" prop="configName" min-width="140" show-overflow-tooltip />
      <el-table-column label="方法" align="center" prop="httpMethod" width="90" />
      <el-table-column label="请求地址" align="center" prop="requestUrl" min-width="260" show-overflow-tooltip />
      <el-table-column label="请求体类型" align="center" prop="bodyType" width="100" />
      <el-table-column label="超时(毫秒)" align="center" prop="timeoutMs" width="110" />
      <el-table-column label="试活状态" align="center" width="110">
        <template #default="scope">
          <el-tooltip
            placement="top"
            :content="probeTooltip(scope.row)"
            :disabled="!probeTooltip(scope.row)"
          >
            <el-tag :type="probeTagType(scope.row.probeStatus)">{{ probeLabel(scope.row.probeStatus) }}</el-tag>
          </el-tooltip>
        </template>
      </el-table-column>
      <el-table-column label="更新时间" align="center" prop="updateTime" width="170">
        <template #default="scope">
          <span>{{ parseTime(scope.row.updateTime || scope.row.createTime) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="160" align="center" class-name="small-padding fixed-width">
        <template #default="scope">
          <el-button
            link
            type="primary"
            icon="Edit"
            @click="handleUpdate(scope.row)"
            v-hasPermi="['magic:requestConfig:edit']"
          >修改</el-button>
          <el-button
            link
            type="danger"
            icon="Delete"
            @click="handleDelete(scope.row)"
            v-hasPermi="['magic:requestConfig:remove']"
          >删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <pagination
      v-show="total > 0"
      :total="total"
      v-model:page="queryParams.pageNum"
      v-model:limit="queryParams.pageSize"
      @pagination="getList"
    />

    <el-dialog :title="title" v-model="open" width="760px" append-to-body>
      <el-form ref="configRef" :model="form" :rules="rules" label-width="110px">
        <el-form-item label="启用状态" prop="enabled">
          <el-switch v-model="form.enabled" active-value="0" inactive-value="1" active-text="启用" inactive-text="停用" />
        </el-form-item>
        <el-form-item label="接口名称" prop="configName">
          <el-input v-model="form.configName" placeholder="用于任务结果中标识接口，例如：登录校验" maxlength="100" show-word-limit />
        </el-form-item>
        <el-form-item label="HTTP方法" prop="httpMethod">
          <el-select v-model="form.httpMethod" placeholder="请选择HTTP方法" style="width: 100%">
            <el-option v-for="item in methodOptions" :key="item" :label="item" :value="item" />
          </el-select>
        </el-form-item>
        <el-form-item label="请求URL" prop="requestUrl">
          <el-input v-model="form.requestUrl" :placeholder="urlPlaceholder" maxlength="2000" />
          <div class="form-tip">仅支持 HTTP(S)；可把 <code v-pre>{{phone}}</code> 放在路径或已有查询参数中。</div>
        </el-form-item>
        <el-form-item label="请求头" prop="headersJson">
          <el-input
            v-model="form.headersJson"
            type="textarea"
            :rows="3"
            class="code-input"
            :placeholder="headersPlaceholder"
          />
          <div class="form-tip">JSON 对象，值支持字符串/数字；Host、Content-Length、Connection 等传输层请求头不可配置。</div>
        </el-form-item>
        <el-form-item label="Query参数" prop="queryParamsJson">
          <el-input
            v-model="form.queryParamsJson"
            type="textarea"
            :rows="3"
            class="code-input"
            :placeholder="queryPlaceholder"
          />
          <div class="form-tip">JSON 对象，值支持字符串/数字/布尔值或数组；执行时统一 URL 编码后追加到请求地址。</div>
        </el-form-item>
        <el-form-item label="请求体类型" prop="bodyType">
          <el-select v-model="form.bodyType" style="width: 100%">
            <el-option label="JSON（application/json）" value="JSON" />
            <el-option label="FORM（application/x-www-form-urlencoded）" value="FORM" />
            <el-option label="RAW（自定义 Content-Type）" value="RAW" />
          </el-select>
          <div class="form-tip">{{ bodyTypeTip }}</div>
        </el-form-item>
        <el-form-item label="请求体" prop="bodyContent">
          <el-input
            v-model="form.bodyContent"
            type="textarea"
            :rows="6"
            class="code-input"
            :placeholder="bodyPlaceholder"
          />
          <div class="form-tip" v-if="bodylessMethod">GET/HEAD 请求不支持请求体。</div>
        </el-form-item>
        <el-form-item label="Content-Type" prop="contentType">
          <el-input v-model="form.contentType" placeholder="留空则按请求体类型使用默认值" maxlength="200" />
          <div class="form-tip">JSON 默认 application/json，FORM 默认 application/x-www-form-urlencoded，RAW 默认 text/plain。</div>
        </el-form-item>
        <el-form-item label="超时(毫秒)" prop="timeoutMs">
          <el-input-number v-model="form.timeoutMs" :min="1000" :max="600000" :step="1000" controls-position="right" style="width: 220px" />
          <span class="form-tip inline-tip">连接与读取超时均使用该值。</span>
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="选填" maxlength="500" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button type="primary" @click="submitForm">确 定</el-button>
          <el-button @click="cancel">取 消</el-button>
        </div>
      </template>
    </el-dialog>

    <el-dialog
      title="批量试活"
      v-model="probe.open"
      width="540px"
      append-to-body
      :close-on-click-modal="false"
      :close-on-press-escape="!probe.running"
      :show-close="!probe.running"
    >
      <div class="probe-panel">
        <el-progress
          :percentage="probePercent"
          :status="probePercent >= 100 ? 'success' : undefined"
          :stroke-width="14"
        />
        <div class="probe-stats">
          <span>目标 <b>{{ probe.progress.total || 0 }}</b></span>
          <span>已完成 <b>{{ probe.progress.done || 0 }}</b></span>
          <span class="probe-alive">有效 <b>{{ probe.progress.alive || 0 }}</b></span>
          <span class="probe-dead">失效 <b>{{ probe.progress.dead || 0 }}</b></span>
          <span v-if="probe.progress.skipped">跳过 <b>{{ probe.progress.skipped }}</b></span>
        </div>
        <div class="probe-current">
          {{ probe.running ? '正在试活：' + (probe.progress.current || '-') : probeSummary }}
        </div>
        <div class="probe-tip">
          试活会用不可投递号码 <code>{{ probe.progress.samplePhone || '10000000000' }}</code> 替换占位符（该号码不可能分配给个人用户，不会真的发给任何人）；
          HTTP 2xx 记为有效，非 2xx 或网络异常记为失效并回写状态。
        </div>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <el-button v-if="probe.running" type="danger" plain icon="CircleClose" @click="handleStopProbe">停止试活</el-button>
          <el-button @click="closeProbe">{{ probe.running ? '后台继续' : '关 闭' }}</el-button>
        </div>
      </template>
    </el-dialog>

    <el-dialog
      title="导入请求配置"
      v-model="importDialog.open"
      width="620px"
      append-to-body
      :close-on-click-modal="false"
    >
      <el-alert type="info" :closable="false" show-icon>
        <template #title>
          仅支持 JSON：数组元素字段与「导出」文件一致（configName / requestUrl / httpMethod / headersJson /
          queryParamsJson / bodyType / bodyContent / contentType / timeoutMs / enabled / remark）。
          请求URL 已存在的会被跳过。
        </template>
      </el-alert>

      <el-upload
        ref="uploadRef"
        class="import-upload"
        drag
        :limit="1"
        accept=".json,application/json"
        :auto-upload="false"
        :action="importDialog.action"
        :headers="importDialog.headers"
        :before-upload="beforeImportUpload"
        :on-success="handleImportSuccess"
        :on-error="handleImportError"
      >
        <el-icon class="el-icon--upload"><upload-filled /></el-icon>
        <div class="el-upload__text">将 JSON 文件拖到此处，或 <em>点击选择</em></div>
        <template #tip>
          <div class="el-upload__tip">单文件不超过 10MB，单次最多 2000 条</div>
        </template>
      </el-upload>

      <div v-if="importDialog.result" class="import-result">
        <div class="import-summary">
          <span>文件总数 <b>{{ importDialog.result.total || 0 }}</b></span>
          <span class="import-ok">写入 <b>{{ importDialog.result.inserted || 0 }}</b></span>
          <span class="import-skip">跳过 <b>{{ importDialog.result.skipped || 0 }}</b></span>
          <span class="import-fail">失败 <b>{{ importDialog.result.failed || 0 }}</b></span>
        </div>
        <el-scrollbar v-if="importDialog.result.errors && importDialog.result.errors.length" max-height="180px">
          <div class="import-error" v-for="(item, index) in importDialog.result.errors" :key="index">{{ item }}</div>
        </el-scrollbar>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button type="primary" :loading="importDialog.loading" @click="submitImport">开始导入</el-button>
          <el-button @click="importDialog.open = false">关 闭</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { listRequestConfig, getRequestConfig, addRequestConfig, updateRequestConfig, delRequestConfig, probeRequestConfig, getProbeProgress, stopProbe, disableDeadConfig } from '@/api/magic-tools/requestConfig'
import { getToken } from '@/utils/auth'

defineOptions({ name: 'RequestConfig' })

const { proxy } = getCurrentInstance()

const configList = ref([])
const open = ref(false)
const loading = ref(true)
const showSearch = ref(true)
const total = ref(0)
const title = ref('')

const methodOptions = ['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS']

const urlPlaceholder = '例如：https://api.example.com/check?phone={{phone}}'
const headersPlaceholder = '例如：{"Authorization": "Bearer token", "X-Phone": "{{phone}}"}'
const queryPlaceholder = '例如：{"phone": "{{phone}}", "page": 1}'

const restrictedHeaders = new Set([
  'host', 'content-length', 'connection', 'upgrade', 'keep-alive', 'transfer-encoding',
  'proxy-connection', 'access-control-request-headers', 'access-control-request-method',
  'origin', 'trailer', 'via', 'content-transfer-encoding'
])
const headerNamePattern = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/

const data = reactive({
  form: {},
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    configName: undefined,
    enabled: undefined,
    probeStatus: undefined
  },
  rules: {
    configName: [
      { required: true, message: '接口名称不能为空', trigger: 'blur' },
      { max: 100, message: '接口名称不能超过100个字符', trigger: 'blur' }
    ],
    httpMethod: [{ required: true, message: 'HTTP方法不能为空', trigger: 'change' }],
    requestUrl: [
      { required: true, message: '请求URL不能为空', trigger: 'blur' },
      { validator: validateRequestUrl, trigger: 'blur' }
    ],
    headersJson: [{ validator: validateHeaders, trigger: 'blur' }],
    queryParamsJson: [{ validator: validateQueryParams, trigger: 'blur' }],
    bodyType: [{ required: true, message: '请求体类型不能为空', trigger: 'change' }],
    bodyContent: [{ validator: validateBody, trigger: 'blur' }],
    contentType: [{ validator: validateContentType, trigger: 'blur' }],
    timeoutMs: [
      { required: true, message: '超时时间不能为空', trigger: 'blur' },
      { validator: validateTimeout, trigger: 'blur' }
    ],
    remark: [{ max: 500, message: '备注不能超过500个字符', trigger: 'blur' }]
  }
})

const { queryParams, form, rules } = toRefs(data)

const bodylessMethod = computed(() => form.value.httpMethod === 'GET' || form.value.httpMethod === 'HEAD')
const bodyTypeTip = computed(() => {
  if (form.value.bodyType === 'JSON') return '请求体按 JSON 校验并原样发送，占位符会做 JSON 字符串转义。'
  if (form.value.bodyType === 'FORM') return '请求体填写 JSON 对象，执行时转换为 key=value&key=value 并做 URL 编码。'
  return '请求体按原始文本发送，可配合 Content-Type 使用。'
})
const bodyPlaceholder = computed(() => {
  if (bodylessMethod.value) return 'GET/HEAD 请求不支持请求体'
  if (form.value.bodyType === 'JSON') return '例如：{"phone": "{{phone}}", "scene": "test"}'
  if (form.value.bodyType === 'FORM') return '例如：{"phone": "{{phone}}", "code": "1234"}'
  return '请输入原始请求体'
})

/** 查询配置列表 */
function getList() {
  loading.value = true
  listRequestConfig(queryParams.value).then(response => {
    configList.value = response.rows
    total.value = response.total
  }).finally(() => {
    loading.value = false
  })
}

/** 取消按钮 */
function cancel() {
  open.value = false
  reset()
}

/** 表单重置 */
function reset() {
  form.value = {
    configId: undefined,
    configName: undefined,
    requestUrl: undefined,
    httpMethod: 'GET',
    headersJson: '{}',
    queryParamsJson: '{}',
    bodyType: 'RAW',
    bodyContent: undefined,
    contentType: undefined,
    timeoutMs: 3000,
    enabled: '0',
    remark: undefined
  }
  proxy.resetForm('configRef')
}

/** 搜索按钮操作 */
function handleQuery() {
  queryParams.value.pageNum = 1
  getList()
}

/** 重置按钮操作 */
function resetQuery() {
  proxy.resetForm('queryRef')
  handleQuery()
}

/** 新增按钮操作 */
function handleAdd() {
  reset()
  open.value = true
  title.value = '新增请求配置'
}

/** 修改按钮操作 */
function handleUpdate(row) {
  reset()
  getRequestConfig(row.configId).then(response => {
    const config = response.data || row || {}
    form.value = {
      configId: row.configId,
      ...config,
      configName: config.configName || '',
      requestUrl: config.requestUrl || '',
      httpMethod: config.httpMethod || 'GET',
      bodyType: config.bodyType || 'RAW',
      timeoutMs: config.timeoutMs || 3000,
      enabled: config.enabled || '0',
      headersJson: config.headersJson || '{}',
      queryParamsJson: config.queryParamsJson || '{}'
    }
    open.value = true
    title.value = '修改请求配置'
  })
}

/** 提交按钮 */
function submitForm() {
  proxy.$refs['configRef'].validate(valid => {
    if (!valid) {
      return
    }
    const payload = {
      ...form.value,
      configName: (form.value.configName || '').trim(),
      requestUrl: (form.value.requestUrl || '').trim(),
      headersJson: form.value.headersJson && form.value.headersJson.trim() ? form.value.headersJson : '{}',
      queryParamsJson: form.value.queryParamsJson && form.value.queryParamsJson.trim() ? form.value.queryParamsJson : '{}'
    }
    if (payload.configId != null) {
      updateRequestConfig(payload).then(() => {
        proxy.$modal.msgSuccess('修改成功')
        open.value = false
        getList()
      })
    } else {
      addRequestConfig(payload).then(() => {
        proxy.$modal.msgSuccess('新增成功')
        open.value = false
        queryParams.value.pageNum = 1
        getList()
      })
    }
  })
}

/** 删除按钮操作 */
function handleDelete(row) {
  proxy.$modal.confirm('确认删除接口配置“' + row.configName + '”吗？').then(() => {
    return delRequestConfig(row.configId)
  }).then(() => {
    getList()
    proxy.$modal.msgSuccess('删除成功')
  }).catch(() => {})
}

/* ---------------- 批量试活 ---------------- */

const probe = reactive({
  open: false,
  running: false,
  progress: {},
  timer: null
})

const probePercent = computed(() => {
  const total = probe.progress.total || 0
  if (!total) {
    return 0
  }
  const done = probe.progress.done || 0
  return Math.min(100, Math.round((done / total) * 100))
})

const probeSummary = computed(() => {
  const p = probe.progress
  if (!p.total) {
    return '暂无试活记录'
  }
  const parts = ['共 ' + p.total + ' 个接口', '有效 ' + (p.alive || 0) + ' 个', '失效 ' + (p.dead || 0) + ' 个']
  if (p.skipped) {
    parts.push('跳过 ' + p.skipped + ' 个')
  }
  const finishAt = p.finishTime ? '，结束于 ' + proxy.parseTime(p.finishTime, '{h}:{i}:{s}') : ''
  return '试活完成：' + parts.join('，') + finishAt
})

function probeLabel(status) {
  if (status === 'alive') {
    return '有效'
  }
  if (status === 'dead') {
    return '失效'
  }
  return '未测'
}

function probeTagType(status) {
  if (status === 'alive') {
    return 'success'
  }
  if (status === 'dead') {
    return 'danger'
  }
  return 'info'
}

function probeTooltip(row) {
  const parts = []
  if (row.probeMessage) {
    parts.push(row.probeMessage)
  }
  if (row.probeTime) {
    parts.push('试活时间：' + proxy.parseTime(row.probeTime))
  }
  return parts.join('；')
}

/** 批量试活：按当前查询条件逐个探测接口是否失效 */
function handleProbe() {
  const scope = []
  if (queryParams.value.configName) {
    scope.push('名称包含“' + queryParams.value.configName + '”')
  }
  if (queryParams.value.enabled === '0') {
    scope.push('仅启用')
  } else if (queryParams.value.enabled === '1') {
    scope.push('仅停用')
  }
  if (queryParams.value.probeStatus) {
    scope.push('试活状态为“' + probeLabel(queryParams.value.probeStatus) + '”')
  }
  const scopeText = scope.length ? '（' + scope.join('、') + '）' : '（全部接口）'
  proxy.$modal.confirm('将对' + scopeText + '的接口逐个发起一次真实请求，失效的接口会被标记为“失效”，是否继续？').then(() => {
    return probeRequestConfig({
      configName: queryParams.value.configName,
      enabled: queryParams.value.enabled,
      probeStatus: queryParams.value.probeStatus
    })
  }).then(response => {
    probe.progress = response.data || {}
    probe.running = true
    probe.open = true
    startProbePolling()
  }).catch(() => {})
}

function startProbePolling() {
  stopProbePolling()
  probe.timer = setInterval(() => {
    getProbeProgress().then(response => {
      probe.progress = response.data || {}
      probe.running = !!probe.progress.running
      if (!probe.running) {
        stopProbePolling()
        getList()
        if (probe.open) {
          proxy.$modal.msgSuccess(probeSummary.value)
        }
      }
    }).catch(() => {
      stopProbePolling()
    })
  }, 1000)
}

function stopProbePolling() {
  if (probe.timer) {
    clearInterval(probe.timer)
    probe.timer = null
  }
}

/** 读取一次进度；页面刷新后若仍有试活在跑，继续轮询 */
function refreshProbeProgress() {
  getProbeProgress().then(response => {
    probe.progress = response.data || {}
    probe.running = !!probe.progress.running
    if (probe.running) {
      startProbePolling()
    }
  }).catch(() => {})
}

/** 停止试活：已发出的请求自然结束，未开始的接口记入跳过 */
function handleStopProbe() {
  stopProbe().then(response => {
    proxy.$modal.msgSuccess(response.msg || '已发送停止信号')
    refreshProbeProgress()
  }).catch(() => {})
}

function closeProbe() {
  probe.open = false
  if (!probe.running) {
    stopProbePolling()
  }
}

/** 一键停用全部试活失效的接口：先查影响条数，确认后批量停用 */
function handleDisableDead() {  listRequestConfig({ probeStatus: 'dead', enabled: '0', pageNum: 1, pageSize: 1 }).then(response => {
    const count = response.total || 0
    if (!count) {
      proxy.$modal.msgWarning('当前没有“已启用且试活失效”的接口')
      return
    }
    proxy.$modal.confirm('将停用 ' + count + ' 个试活失效且仍启用的接口，停用后不再参与压力测试，是否继续？').then(() => {
      return disableDeadConfig()
    }).then(res => {
      proxy.$modal.msgSuccess((res && res.msg) || '停用完成')
      queryParams.value.pageNum = 1
      getList()
    }).catch(() => {})
  }).catch(() => {})
}

/* ---------------- 导入 / 导出 ---------------- */

const importDialog = reactive({
  open: false,
  loading: false,
  result: null,
  action: import.meta.env.VITE_APP_BASE_API + '/tool/stress/config/import',
  headers: { Authorization: 'Bearer ' + getToken() }
})

/** 导出：按当前查询条件下载 JSON 文件 */
function handleExport() {
  const params = {
    configName: queryParams.value.configName,
    enabled: queryParams.value.enabled,
    probeStatus: queryParams.value.probeStatus
  }
  const stamp = proxy.parseTime(new Date(), '{y}{m}{d}{h}{i}{s}')
  proxy.download('tool/stress/config/export', params, 'request-config-' + stamp + '.json')
}

/** 打开导入对话框 */
function handleImport() {
  importDialog.result = null
  importDialog.loading = false
  importDialog.open = true
  nextTick(() => {
    const upload = proxy.$refs['uploadRef']
    if (upload) {
      upload.clearFiles()
    }
  })
}

function beforeImportUpload(file) {
  if (!/\.json$/i.test(file.name)) {
    proxy.$modal.msgError('请选择 JSON 文件')
    return false
  }
  if (file.size > 10 * 1024 * 1024) {
    proxy.$modal.msgError('文件不能超过 10MB')
    return false
  }
  return true
}

function submitImport() {
  const upload = proxy.$refs['uploadRef']
  if (!upload || !upload.uploadFiles || upload.uploadFiles.length === 0) {
    proxy.$modal.msgWarning('请先选择要导入的 JSON 文件')
    return
  }
  importDialog.loading = true
  upload.submit()
}

function handleImportSuccess(response) {
  importDialog.loading = false
  if (!response || response.code !== 200) {
    proxy.$modal.msgError((response && response.msg) || '导入失败')
    return
  }
  importDialog.result = response.data || {}
  const result = importDialog.result
  proxy.$modal.msgSuccess('导入完成：写入 ' + (result.inserted || 0) + ' 条，跳过 '
    + (result.skipped || 0) + ' 条，失败 ' + (result.failed || 0) + ' 条')
  queryParams.value.pageNum = 1
  getList()
}

function handleImportError() {
  importDialog.loading = false
  proxy.$modal.msgError('导入请求失败，请检查登录状态或文件格式')
}

onBeforeUnmount(() => {
  stopProbePolling()
})

function validateRequestUrl(rule, value, callback) {
  if (!value) {
    callback()
    return
  }
  if (value.length > 2000) {
    callback(new Error('请求URL不能超过2000个字符'))
    return
  }
  if (/[\r\n]/.test(value)) {
    callback(new Error('请求URL不能包含换行符'))
    return
  }
  if (/\s/.test(value.trim())) {
    callback(new Error('请求URL不能包含空白字符，请先进行URL编码'))
    return
  }
  if (/[^\x20-\x7e]/.test(value)) {
    callback(new Error('请求URL包含非ASCII字符，请先进行URL编码'))
    return
  }
  try {
    const normalized = value.trim().replace(/\{\{phone\}\}/g, '13800138000')
    const parsed = new URL(normalized)
    if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname) {
      throw new Error('invalid')
    }
    callback()
  } catch (e) {
    callback(new Error('请求URL仅支持合法的HTTP(S)地址'))
  }
}

function validateHeaders(rule, value, callback) {
  try {
    const headers = parseJsonObject(value, '请求头')
    Object.keys(headers).forEach(key => {
      if (!headerNamePattern.test(key)) {
        throw new Error('请求头名称不合法：' + key)
      }
      if (restrictedHeaders.has(key.toLowerCase())) {
        throw new Error('请求头 ' + key + ' 由HTTP传输层管理，不能手动配置')
      }
      validateHeaderValue(headers[key], key)
    })
    callback()
  } catch (e) {
    callback(e instanceof Error ? e : new Error('请求头配置不正确'))
  }
}

function validateHeaderValue(value, name) {
  if (value === null || value === undefined || Array.isArray(value) || typeof value === 'object') {
    throw new Error('请求头 ' + name + ' 的值必须是字符串或数字')
  }
  const text = String(value)
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i)
    if (text[i] === '\r' || text[i] === '\n') {
      throw new Error('请求头 ' + name + ' 不能包含换行符')
    }
    if ((code < 0x20 && text[i] !== '\t') || code === 0x7f || code > 0x7e) {
      throw new Error('请求头 ' + name + ' 仅支持可见ASCII字符')
    }
  }
}

function validateQueryParams(rule, value, callback) {
  try {
    const params = parseJsonObject(value, 'Query参数')
    Object.keys(params).forEach(key => {
      if (!key.trim()) {
        throw new Error('Query参数名称不能为空')
      }
      validateScalarOrArray(params[key], 'Query参数 ' + key)
    })
    callback()
  } catch (e) {
    callback(e instanceof Error ? e : new Error('Query参数配置不正确'))
  }
}

function validateBody(rule, value, callback) {
  try {
    if (bodylessMethod.value && value && value.trim()) {
      throw new Error(form.value.httpMethod + ' 请求不能配置请求体')
    }
    if (!value || !value.trim()) {
      callback()
      return
    }
    if (form.value.bodyType === 'JSON') {
      JSON.parse(value.replace(/\{\{phone\}\}/g, '+8613800138000'))
    } else if (form.value.bodyType === 'FORM') {
      const body = parseJsonObject(value.replace(/\{\{phone\}\}/g, '+8613800138000'), 'FORM请求体')
      Object.keys(body).forEach(key => validateScalarOrArray(body[key], 'FORM字段 ' + key))
    }
    callback()
  } catch (e) {
    callback(e instanceof Error ? e : new Error('请求体格式不正确'))
  }
}

function validateContentType(rule, value, callback) {
  if (!value) {
    callback()
    return
  }
  if (value.length > 200) {
    callback(new Error('Content-Type不能超过200个字符'))
    return
  }
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i)
    if (value[i] === '\r' || value[i] === '\n') {
      callback(new Error('Content-Type不能包含换行符'))
      return
    }
    if ((code < 0x20 && value[i] !== '\t') || code === 0x7f || code > 0x7e) {
      callback(new Error('Content-Type仅支持可见ASCII字符'))
      return
    }
  }
  callback()
}

function validateTimeout(rule, value, callback) {
  if (value == null || value < 1000 || value > 600000) {
    callback(new Error('超时时间必须在1000到600000毫秒之间'))
    return
  }
  callback()
}

function parseJsonObject(value, label) {
  if (!value || !value.trim()) {
    return {}
  }
  let parsed
  try {
    parsed = JSON.parse(value)
  } catch (e) {
    throw new Error(label + '必须是合法的JSON对象')
  }
  if (parsed === null || Array.isArray(parsed) || typeof parsed !== 'object') {
    throw new Error(label + '必须是JSON对象')
  }
  return parsed
}

function validateScalarOrArray(value, label) {
  if (Array.isArray(value)) {
    value.forEach(item => {
      if (item === null || typeof item === 'object') {
        throw new Error(label + '的数组元素必须是字符串、数字或布尔值')
      }
    })
    return
  }
  if (value === null || typeof value === 'object') {
    throw new Error(label + '的值必须是字符串、数字、布尔值或它们的数组')
  }
}

getList()
refreshProbeProgress()
</script>

<style scoped>
.mb16 {
  margin-bottom: 16px;
}

.config-tip {
  line-height: 1.7;
}

.config-tip code {
  padding: 1px 5px;
  border-radius: 3px;
  background: rgba(64, 158, 255, 0.12);
  color: #409eff;
}

.form-tip {
  width: 100%;
  margin-top: 4px;
  color: #909399;
  font-size: 12px;
  line-height: 1.6;
}

.inline-tip {
  display: inline-block;
  width: auto;
  margin-left: 10px;
}

.code-input :deep(.el-textarea__inner) {
  font-family: Consolas, Monaco, "Courier New", monospace;
}

.probe-panel {
  line-height: 1.8;
}

.probe-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-top: 14px;
  font-size: 13px;
  color: #606266;
}

.probe-stats b {
  color: #303133;
}

.probe-alive b {
  color: #67c23a;
}

.probe-dead b {
  color: #f56c6c;
}

.probe-current {
  margin-top: 10px;
  font-size: 13px;
  color: #303133;
  word-break: break-all;
}

.probe-tip {
  margin-top: 12px;
  padding: 8px 10px;
  border-radius: 4px;
  background: rgba(230, 162, 60, 0.1);
  color: #909399;
  font-size: 12px;
  line-height: 1.7;
}

.probe-tip code {
  padding: 1px 5px;
  border-radius: 3px;
  background: rgba(64, 158, 255, 0.12);
  color: #409eff;
}

.import-upload {
  margin-top: 12px;
}

.import-result {
  margin-top: 12px;
}

.import-summary {
  display: flex;
  gap: 16px;
  margin-bottom: 8px;
  font-size: 13px;
  color: #606266;
}

.import-summary b {
  color: #303133;
}

.import-ok b {
  color: #67c23a;
}

.import-skip b {
  color: #e6a23c;
}

.import-fail b {
  color: #f56c6c;
}

.import-error {
  font-size: 12px;
  line-height: 1.7;
  color: #f56c6c;
  word-break: break-all;
}
</style>
