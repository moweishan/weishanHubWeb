<template>
  <div class="app-container">
    <el-card shadow="never" class="mb16">
      <template #header>
        <div class="card-header">
          <span>发起手机压力测试</span>
          <span class="header-tip">提交后立即开始，浏览器关闭后后端仍会继续执行</span>
        </div>
      </template>
      <el-form ref="submitRef" :model="submitForm" :rules="submitRules" :inline="true">
        <el-form-item label="手机号" prop="phone">
          <el-input
            v-model="submitForm.phone"
            placeholder="请输入11位中国大陆手机号"
            clearable
            maxlength="11"
            style="width: 220px"
            @keyup.enter="handleSubmit"
          />
        </el-form-item>
        <el-form-item label="持续时长" prop="duration">
          <el-input-number
            v-model="submitForm.duration"
            :min="1"
            :max="maxDuration"
            :step="1"
            :precision="0"
            controls-position="right"
            style="width: 150px"
          />
        </el-form-item>
        <el-form-item label="单位" prop="unit">
          <el-select v-model="submitForm.unit" style="width: 110px">
            <el-option label="秒" value="SECOND" />
            <el-option label="分钟" value="MINUTE" />
            <el-option label="小时" value="HOUR" />
          </el-select>
        </el-form-item>
        <el-form-item label="执行线程数" prop="threads">
          <el-input-number
            v-model="submitForm.threads"
            :min="1"
            :max="maxThreads"
            :step="1"
            :precision="0"
            controls-position="right"
            style="width: 130px"
          />
        </el-form-item>
        <el-form-item>
          <el-button
            type="primary"
            icon="VideoPlay"
            :loading="submitLoading"
            @click="handleSubmit"
            v-hasPermi="['magic:mobileStressTest:add']"
          >开始测试</el-button>
        </el-form-item>
      </el-form>
      <div class="tip-text">
        提交时使用当前所有启用接口的配置，后续修改仅影响新任务；任务内按设定的执行线程数并发请求不同接口，
        同一接口相邻两次开始至少间隔 61 秒（线程数 1～{{ maxThreads }}，默认 2）。
        时长从提交时开始按实际经过时间计算，到期或手动停止会停止调度并尝试取消当前请求（已发送的请求无法撤回）。
        同一手机号全局只能有一个运行中任务。
      </div>
    </el-card>

    <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch">
      <el-form-item label="手机号" prop="phone">
        <el-input
          v-model="queryParams.phone"
          placeholder="请输入手机号"
          clearable
          style="width: 200px"
          @keyup.enter="handleQuery"
        />
      </el-form-item>
      <el-form-item label="任务状态" prop="status">
        <el-select v-model="queryParams.status" placeholder="全部" clearable style="width: 160px">
          <el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
        <el-button icon="Refresh" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <el-row :gutter="10" class="mb8">
      <el-col :span="1.5">
        <el-button icon="Refresh" @click="getList()">刷新</el-button>
      </el-col>
      <right-toolbar v-model:showSearch="showSearch" @queryTable="getList()"></right-toolbar>
    </el-row>

    <el-table v-loading="loading" :data="taskList">
      <el-table-column label="任务ID" align="center" prop="taskId" width="90" />
      <el-table-column label="手机号" align="center" prop="phone" width="140" />
      <el-table-column label="线程数" align="center" prop="threadsPerTask" width="90" />
      <el-table-column label="状态" align="center" width="100">
        <template #default="scope">
          <el-tag :type="statusType(scope.row.status)">{{ statusLabel(scope.row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="开始时间" align="center" prop="startTime" width="170">
        <template #default="scope">
          <span>{{ scope.row.startTime ? parseTime(scope.row.startTime) : '-' }}</span>
        </template>
      </el-table-column>
      <el-table-column label="计划结束" align="center" prop="planEndTime" width="170">
        <template #default="scope">
          <span>{{ scope.row.planEndTime ? parseTime(scope.row.planEndTime) : '-' }}</span>
        </template>
      </el-table-column>
      <el-table-column label="实际结束" align="center" prop="actualEndTime" width="170">
        <template #default="scope">
          <span>{{ scope.row.actualEndTime ? parseTime(scope.row.actualEndTime) : '-' }}</span>
        </template>
      </el-table-column>
      <el-table-column label="成功次数" align="center" prop="successCount" width="100" />
      <el-table-column label="失败次数" align="center" prop="failCount" width="100" />
      <el-table-column label="操作" width="220" align="center" fixed="right" class-name="small-padding fixed-width">
        <template #default="scope">
          <el-button
            v-if="scope.row.status === 'RUNNING'"
            link
            type="warning"
            icon="VideoPause"
            @click="handleStop(scope.row)"
            v-hasPermi="['magic:mobileStressTest:stop']"
          >停止</el-button>
          <el-button
            link
            type="primary"
            icon="View"
            @click="openResult(scope.row)"
            v-hasPermi="['magic:mobileStressTest:result']"
          >结果</el-button>
          <el-button
            v-if="scope.row.status !== 'RUNNING'"
            link
            type="danger"
            icon="Delete"
            @click="handleDelete(scope.row)"
            v-hasPermi="['magic:mobileStressTest:remove']"
          >删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <pagination
      v-show="total > 0"
      :total="total"
      v-model:page="queryParams.pageNum"
      v-model:limit="queryParams.pageSize"
      @pagination="getList()"
    />

    <el-dialog
      v-model="resultOpen"
      :title="'请求结果 - ' + (resultTask.phone || '')"
      width="1100px"
      append-to-body
      destroy-on-close
    >
      <el-table v-loading="resultLoading" :data="resultList" max-height="520">
        <el-table-column label="接口" min-width="180">
          <template #default="scope">
            <div>{{ scope.row.configName }}</div>
            <div class="sub-text">{{ scope.row.httpMethod }} {{ scope.row.requestUrl }}</div>
          </template>
        </el-table-column>
        <el-table-column label="状态码" align="center" width="90">
          <template #default="scope">
            <span>{{ scope.row.statusCode == null ? '-' : scope.row.statusCode }}</span>
          </template>
        </el-table-column>
        <el-table-column label="耗时" align="center" width="100">
          <template #default="scope">
            <span>{{ scope.row.durationMs }} ms</span>
          </template>
        </el-table-column>
        <el-table-column label="结果" align="center" width="90">
          <template #default="scope">
            <el-tag :type="scope.row.success === '1' ? 'success' : 'danger'">
              {{ scope.row.success === '1' ? '成功' : '失败' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="响应文本 / 错误信息" min-width="460">
          <template #default="scope">
            <div v-if="scope.row.errorMessage" class="error-text">{{ scope.row.errorMessage }}</div>
            <pre v-else class="response-text">{{ scope.row.responseText || '(空响应)' }}</pre>
            <el-tag v-if="scope.row.truncated === '1'" type="warning" size="small">响应已截断</el-tag>
          </template>
        </el-table-column>
      </el-table>
      <pagination
        v-show="resultTotal > 0"
        :total="resultTotal"
        v-model:page="resultQuery.pageNum"
        v-model:limit="resultQuery.pageSize"
        @pagination="getResults"
      />
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="resultOpen = false">关 闭</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { listStressTask, addStressTask, stopStressTask, listStressTaskResult, delStressTask } from '@/api/magic-tools/stressTask'

defineOptions({ name: 'MobileStressTest' })

const { proxy } = getCurrentInstance()

const taskList = ref([])
const loading = ref(true)
const showSearch = ref(true)
const total = ref(0)
const submitLoading = ref(false)

const resultOpen = ref(false)
const resultLoading = ref(false)
const resultList = ref([])
const resultTotal = ref(0)
const resultTask = ref({})
const resultQuery = reactive({
  pageNum: 1,
  pageSize: 10
})

const statusOptions = [
  { value: 'RUNNING', label: '运行中', type: 'warning' },
  { value: 'COMPLETED', label: '已完成', type: 'success' },
  { value: 'STOPPED', label: '已停止', type: 'info' },
  { value: 'INTERRUPTED', label: '已中断', type: 'danger' },
  { value: 'FAILED', label: '失败', type: 'danger' }
]

const statusMap = statusOptions.reduce((map, item) => {
  map[item.value] = item
  return map
}, {})

const data = reactive({
  submitForm: {
    phone: '',
    duration: 5,
    unit: 'MINUTE',
    threads: 2
  },
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    phone: undefined,
    status: undefined
  },
  submitRules: {
    phone: [
      { required: true, message: '手机号不能为空', trigger: 'blur' },
      { validator: validatePhone, trigger: 'blur' }
    ],
    duration: [{ validator: validateDuration, trigger: 'blur' }],
    unit: [{ required: true, message: '时长单位不能为空', trigger: 'change' }],
    threads: [{ validator: validateThreads, trigger: 'blur' }]
  }
})

const { submitForm, queryParams, submitRules } = toRefs(data)

/** 执行线程数上限，与后端 stress.max-threads-per-task 保持一致 */
const maxThreads = 8

const maxDuration = computed(() => {
  const multiplier = submitForm.value.unit === 'HOUR' ? 3600 : submitForm.value.unit === 'MINUTE' ? 60 : 1
  return Math.floor(2147483647 / multiplier)
})

watch(() => submitForm.value.unit, () => {
  if (submitForm.value.duration > maxDuration.value) {
    submitForm.value.duration = maxDuration.value
  }
})

function statusLabel(status) {
  return statusMap[status] ? statusMap[status].label : status
}

function statusType(status) {
  return statusMap[status] ? statusMap[status].type : 'info'
}

function validatePhone(rule, value, callback) {
  if (!/^1[3-9][0-9]{9}$/.test((value || '').trim())) {
    callback(new Error('请输入11位中国大陆手机号'))
    return
  }
  callback()
}

function validateDuration(rule, value, callback) {
  if (!value || value < 1 || !Number.isInteger(value)) {
    callback(new Error('持续时长必须为正整数'))
    return
  }
  const multiplier = submitForm.value.unit === 'HOUR' ? 3600 : submitForm.value.unit === 'MINUTE' ? 60 : 1
  if (value * multiplier > 2147483647) {
    callback(new Error('持续时长超出可存储范围'))
    return
  }
  callback()
}

function validateThreads(rule, value, callback) {
  if (!value || value < 1 || !Number.isInteger(value)) {
    callback(new Error('执行线程数必须为正整数'))
    return
  }
  if (value > maxThreads) {
    callback(new Error('执行线程数不能超过 ' + maxThreads))
    return
  }
  callback()
}

/** 查询任务列表 */
function getList(silent = false) {
  if (!silent) {
    loading.value = true
  }
  listStressTask(queryParams.value).then(response => {
    taskList.value = response.rows
    total.value = response.total
  }).finally(() => {
    if (!silent) {
      loading.value = false
    }
  })
}

/** 提交任务 */
function handleSubmit() {
  proxy.$refs['submitRef'].validate(valid => {
    if (!valid) {
      return
    }
    submitLoading.value = true
    addStressTask({
      phone: (submitForm.value.phone || '').trim(),
      duration: submitForm.value.duration,
      unit: submitForm.value.unit,
      threads: submitForm.value.threads
    }).then(() => {
      proxy.$modal.msgSuccess('任务已创建并开始执行')
      queryParams.value.pageNum = 1
      getList()
    }).finally(() => {
      submitLoading.value = false
    })
  })
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

/** 停止任务 */
function handleStop(row) {
  proxy.$modal.confirm('确认停止手机号“' + row.phone + '”的运行中任务吗？已发送的请求无法撤回。').then(() => {
    return stopStressTask(row.taskId)
  }).then(() => {
    proxy.$modal.msgSuccess('停止请求已发送，当前请求退出后更新状态')
    getList()
  }).catch(() => {})
}

/** 删除历史任务 */
function handleDelete(row) {
  proxy.$modal.confirm('确认删除任务“' + row.taskId + '”及其全部请求结果吗？').then(() => {
    return delStressTask(row.taskId)
  }).then(() => {
    proxy.$modal.msgSuccess('删除成功')
    getList()
  }).catch(() => {})
}

/** 打开请求结果 */
function openResult(row) {
  resultTask.value = row
  resultQuery.pageNum = 1
  resultQuery.pageSize = 10
  resultOpen.value = true
  getResults()
}

/** 分页查询请求结果 */
function getResults() {
  resultLoading.value = true
  listStressTaskResult(resultTask.value.taskId, resultQuery).then(response => {
    resultList.value = response.rows
    resultTotal.value = response.total
  }).finally(() => {
    resultLoading.value = false
  })
}

let pollTimer = null

onMounted(() => {
  getList()
  pollTimer = setInterval(() => {
    if (taskList.value.some(item => item.status === 'RUNNING')) {
      getList(true)
    }
  }, 5000)
})

onBeforeUnmount(() => {
  if (pollTimer) {
    clearInterval(pollTimer)
  }
})
</script>

<style scoped>
.mb16 {
  margin-bottom: 16px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.header-tip {
  color: #909399;
  font-size: 12px;
  font-weight: normal;
}

.tip-text {
  margin-top: 4px;
  color: #909399;
  font-size: 12px;
  line-height: 1.7;
}

.sub-text {
  max-width: 100%;
  overflow: hidden;
  color: #909399;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.response-text {
  max-height: 180px;
  margin: 0;
  padding: 8px;
  overflow: auto;
  border-radius: 4px;
  background: #f5f7fa;
  font-family: Consolas, Monaco, "Courier New", monospace;
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-all;
}

.error-text {
  color: #f56c6c;
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
