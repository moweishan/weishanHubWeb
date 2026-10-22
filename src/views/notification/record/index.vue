<template>
  <div class="app-container">
    <el-alert type="info" :closable="false" show-icon class="mb16">
      <template #title>通知记录</template>
      <div class="config-tip">
        每条记录共用一个不可枚举详情票据；首个渠道成功时写入 sentAt 与 expiresAt（固定 1 小时），后续渠道成功或重试都不会延长。
        发送使用接单时的渠道快照，后续修改渠道配置不影响已接单记录。
      </div>
    </el-alert>

    <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch">
      <el-form-item label="requestId" prop="requestId">
        <el-input v-model="queryParams.requestId" placeholder="requestId" clearable style="width: 180px" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="标题" prop="title">
        <el-input v-model="queryParams.title" placeholder="通知标题" clearable style="width: 180px" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="路径" prop="routeCode">
        <el-select v-model="queryParams.routeCode" placeholder="全部" clearable filterable style="width: 170px">
          <el-option v-for="item in routeOptions" :key="item.routeCode" :label="item.channelName + '（' + item.routeCode + '）'" :value="item.routeCode" />
        </el-select>
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <el-select v-model="queryParams.status" placeholder="全部" clearable style="width: 150px">
          <el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="创建时间">
        <el-date-picker
          v-model="dateRange"
          value-format="YYYY-MM-DD HH:mm:ss"
          type="datetimerange"
          range-separator="-"
          start-placeholder="开始时间"
          end-placeholder="结束时间"
          :default-time="[new Date(2000, 1, 1, 0, 0, 0), new Date(2000, 1, 1, 23, 59, 59)]"
          style="width: 360px"
        />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
        <el-button icon="Refresh" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <el-row :gutter="10" class="mb8">
      <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
    </el-row>

    <el-table v-loading="loading" :data="recordList">
      <el-table-column label="requestId" prop="requestId" min-width="150" show-overflow-tooltip>
        <template #default="scope">
          <el-button link type="primary" @click="showDetail(scope.row)">{{ scope.row.requestId }}</el-button>
        </template>
      </el-table-column>
      <el-table-column label="标题" prop="title" min-width="180" show-overflow-tooltip />
      <el-table-column label="类型" align="center" width="80">
        <template #default="scope">
          <el-tag size="small" effect="plain" :type="scope.row.messageType === 'CARD' ? 'success' : 'info'">
            {{ scope.row.messageType }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="路径" min-width="150" show-overflow-tooltip>
        <template #default="scope">
          <span class="route-codes">{{ (scope.row.routeCodes || '').split(',').join(' / ') }}</span>
        </template>
      </el-table-column>
      <el-table-column label="状态" align="center" width="120">
        <template #default="scope">
          <el-tag size="small" :type="statusTagType(scope.row.status)">{{ statusLabel(scope.row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="成功/总数" align="center" width="105">
        <template #default="scope">
          <span :class="{ 'fail-count': (scope.row.failCount || 0) > 0 }">{{ scope.row.successCount || 0 }}/{{ scope.row.totalCount || 0 }}</span>
        </template>
      </el-table-column>
      <el-table-column label="首个成功" align="center" width="170">
        <template #default="scope">{{ scope.row.sentAt ? parseTime(scope.row.sentAt) : '-' }}</template>
      </el-table-column>
      <el-table-column label="免登录截止" align="center" width="170">
        <template #default="scope">{{ scope.row.expiresAt ? parseTime(scope.row.expiresAt) : '-' }}</template>
      </el-table-column>
      <el-table-column label="链接" align="center" width="80">
        <template #default="scope">
          <el-tag size="small" :type="scope.row.revoked === '1' ? 'danger' : 'success'">
            {{ scope.row.revoked === '1' ? '已撤销' : '有效' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="创建时间" align="center" width="170">
        <template #default="scope">{{ parseTime(scope.row.createTime) }}</template>
      </el-table-column>
      <el-table-column label="操作" align="center" width="250" class-name="small-padding fixed-width">
        <template #default="scope">
          <el-button link type="primary" icon="View" @click="showDetail(scope.row)" v-hasPermi="['notification:record:query']">详情</el-button>
          <el-button
            link
            type="warning"
            icon="RefreshRight"
            :disabled="scope.row.revoked === '1' || !scope.row.failCount"
            @click="handleRetry(scope.row)"
            v-hasPermi="['notification:record:retry']"
          >重试失败</el-button>
          <el-button
            link
            type="info"
            icon="CircleClose"
            :disabled="scope.row.revoked === '1'"
            @click="handleRevoke(scope.row)"
            v-hasPermi="['notification:record:revoke']"
          >撤销</el-button>
          <el-button link type="danger" icon="Delete" @click="handleDelete(scope.row)" v-hasPermi="['notification:record:remove']">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <pagination v-show="total > 0" :total="total" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" @pagination="getList" />

    <el-dialog title="通知记录详情" v-model="detailOpen" width="920px" append-to-body :close-on-click-modal="false" @closed="clearDetail">
      <div v-loading="detailLoading">
        <template v-if="currentDetail && currentDetail.record">
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="requestId">{{ currentDetail.record.requestId }}</el-descriptions-item>
            <el-descriptions-item label="状态">
              <el-tag size="small" :type="statusTagType(currentDetail.record.status)">{{ statusLabel(currentDetail.record.status) }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="标题" :span="2">{{ currentDetail.record.title }}</el-descriptions-item>
            <el-descriptions-item label="摘要" :span="2">{{ currentDetail.record.summary || '-' }}</el-descriptions-item>
            <el-descriptions-item label="路径" :span="2">{{ (currentDetail.record.routeCodes || '').split(',').join('、') }}</el-descriptions-item>
            <el-descriptions-item label="首个成功时间">{{ currentDetail.record.sentAt ? parseTime(currentDetail.record.sentAt) : '-' }}</el-descriptions-item>
            <el-descriptions-item label="免登录截止">{{ currentDetail.record.expiresAt ? parseTime(currentDetail.record.expiresAt) : '-' }}</el-descriptions-item>
            <el-descriptions-item label="成功/失败/总数">
              {{ currentDetail.record.successCount || 0 }} / {{ currentDetail.record.failCount || 0 }} / {{ currentDetail.record.totalCount || 0 }}
            </el-descriptions-item>
            <el-descriptions-item label="链接状态">
              <el-tag size="small" :type="currentDetail.record.revoked === '1' ? 'danger' : 'success'">
                {{ currentDetail.record.revoked === '1' ? '已撤销' : '有效' }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="详情链接" :span="2">
              <div class="detail-link-row">
                <code>{{ currentDetail.detailUrl || '主密钥不可用，暂无法恢复链接' }}</code>
                <el-button v-if="currentDetail.detailUrl" link type="primary" icon="CopyDocument" @click="copyDetailLink">复制</el-button>
              </div>
            </el-descriptions-item>
          </el-descriptions>

          <el-divider content-position="left">正文（原始 Markdown / 文本）</el-divider>
          <div v-if="currentDetail.record.messageType === 'CARD'" class="detail-markdown" v-html="detailHtml"></div>
          <pre v-else class="detail-text">{{ currentDetail.record.detail || currentDetail.record.summary || '' }}</pre>

          <el-divider content-position="left">各渠道发送结果</el-divider>
          <el-table :data="currentDetail.channels || []" size="small" border>
            <el-table-column label="路径" prop="routeCode" width="140" />
            <el-table-column label="渠道" prop="channelName" min-width="150" show-overflow-tooltip />
            <el-table-column label="状态" align="center" width="100">
              <template #default="scope">
                <el-tag size="small" :type="channelStatusType(scope.row.status)">{{ channelStatusLabel(scope.row.status) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="尝试次数" align="center" prop="attemptCount" width="90" />
            <el-table-column label="最近尝试" align="center" width="170">
              <template #default="scope">{{ scope.row.lastAttemptTime ? parseTime(scope.row.lastAttemptTime) : '-' }}</template>
            </el-table-column>
            <el-table-column label="消息 ID" prop="wecomMsgId" min-width="160" show-overflow-tooltip />
            <el-table-column label="失败原因" prop="errorMessage" min-width="200" show-overflow-tooltip />
          </el-table>
        </template>
      </div>
      <template #footer>
        <el-button v-if="currentDetail && currentDetail.record && currentDetail.record.revoked !== '1'" type="warning" plain @click="handleRevoke(currentDetail.record)">撤销链接</el-button>
        <el-button @click="detailOpen = false">关 闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { getCurrentInstance, reactive, ref, toRefs } from 'vue'
import { ElMessage } from 'element-plus'
import { channelOptions } from '@/api/notification/channel'
import { delRecord, getRecord, listRecord, retryRecord, revokeRecord } from '@/api/notification/record'
import { renderNotificationMarkdown } from '@/utils/notification/markdown'

defineOptions({ name: 'NotificationRecord' })

const { proxy } = getCurrentInstance()
const recordList = ref([])
const routeOptions = ref([])
const loading = ref(true)
const showSearch = ref(true)
const total = ref(0)
const dateRange = ref([])
const detailOpen = ref(false)
const detailLoading = ref(false)
const currentDetail = ref(null)
const detailHtml = ref('')

const statusOptions = [
  { value: 'PENDING', label: '待发送' },
  { value: 'SENDING', label: '发送中' },
  { value: 'SUCCESS', label: '全部成功' },
  { value: 'PARTIAL_SUCCESS', label: '部分成功' },
  { value: 'FAILED', label: '全部失败' }
]

const data = reactive({
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    requestId: undefined,
    title: undefined,
    routeCode: undefined,
    status: undefined
  }
})

const { queryParams } = toRefs(data)

function getList() {
  loading.value = true
  const params = proxy.addDateRange({ ...queryParams.value }, dateRange.value)
  listRecord(params).then(response => {
    recordList.value = response.rows || []
    total.value = response.total || 0
  }).finally(() => {
    loading.value = false
  })
}

function loadRouteOptions() {
  channelOptions().then(response => {
    routeOptions.value = response.data || []
  }).catch(() => {
    routeOptions.value = []
  })
}

function handleQuery() {
  queryParams.value.pageNum = 1
  getList()
}

function resetQuery() {
  proxy.resetForm('queryRef')
  dateRange.value = []
  handleQuery()
}

function statusLabel(status) {
  const item = statusOptions.find(option => option.value === status)
  return item ? item.label : status || '-'
}

function statusTagType(status) {
  if (status === 'SUCCESS') return 'success'
  if (status === 'PARTIAL_SUCCESS') return 'warning'
  if (status === 'FAILED') return 'danger'
  if (status === 'SENDING') return 'warning'
  return 'info'
}

function channelStatusLabel(status) {
  if (status === 'SUCCESS') return '成功'
  if (status === 'FAILED') return '失败'
  if (status === 'SENDING') return '发送中'
  return '待发送'
}

function channelStatusType(status) {
  if (status === 'SUCCESS') return 'success'
  if (status === 'FAILED') return 'danger'
  if (status === 'SENDING') return 'warning'
  return 'info'
}

function showDetail(row) {
  detailLoading.value = true
  detailOpen.value = true
  currentDetail.value = null
  detailHtml.value = ''
  getRecord(row.recordId).then(response => {
    currentDetail.value = response.data || null
    const record = currentDetail.value && currentDetail.value.record
    if (record && record.messageType === 'CARD') {
      try {
        detailHtml.value = renderNotificationMarkdown(record.detail || '')
      } catch (error) {
        detailHtml.value = ''
        proxy.$modal.msgError('通知正文渲染失败，请查看原始记录')
      }
    }
  }).finally(() => {
    detailLoading.value = false
  })
}

function clearDetail() {
  currentDetail.value = null
  detailHtml.value = ''
}

function handleRetry(row) {
  proxy.$modal.confirm('仅重试该记录的失败渠道，成功渠道不会重复发送；免登录截止时间不会延长。是否继续？').then(() => {
    return retryRecord(row.recordId)
  }).then(response => {
    proxy.$modal.msgSuccess(response.msg || '已提交重试')
    getList()
    if (detailOpen.value) {
      showDetail(row)
    }
  }).catch(() => {})
}

function handleRevoke(row) {
  proxy.$modal.confirm('撤销后该详情链接立即失效（包括微信内免登录访问），是否继续？').then(() => {
    return revokeRecord(row.recordId)
  }).then(() => {
    proxy.$modal.msgSuccess('链接已撤销')
    getList()
    if (detailOpen.value) {
      showDetail(row)
    }
  }).catch(() => {})
}

function handleDelete(row) {
  proxy.$modal.confirm('删除后该记录与详情链接立即失效（软删除保留审计行），是否继续？').then(() => {
    return delRecord(row.recordId)
  }).then(() => {
    proxy.$modal.msgSuccess('删除成功')
    if (detailOpen.value) {
      detailOpen.value = false
    }
    getList()
  }).catch(() => {})
}

async function copyDetailLink() {
  const link = currentDetail.value && currentDetail.value.detailUrl
  if (!link) {
    return
  }
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(link)
    } else {
      const textarea = document.createElement('textarea')
      textarea.value = link
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }
    ElMessage.success('详情链接已复制')
  } catch (error) {
    ElMessage.error('复制失败，请手动选择链接复制')
  }
}

getList()
loadRouteOptions()
</script>

<style scoped>
.mb16 {
  margin-bottom: 16px;
}

.config-tip {
  line-height: 1.7;
}

.route-codes {
  font-family: Consolas, Monaco, 'Courier New', monospace;
  font-size: 12px;
  color: #606266;
}

.fail-count {
  color: #f56c6c;
  font-weight: 600;
}

.detail-link-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.detail-link-row code {
  word-break: break-all;
  color: #337ecc;
}

.detail-markdown {
  max-height: 360px;
  overflow: auto;
  padding: 12px 16px;
  border-radius: 8px;
  border: 1px solid #ebeef5;
  background: #fafafa;
  line-height: 1.75;
  word-break: break-word;
}

.detail-markdown :deep(pre) {
  padding: 12px;
  border-radius: 6px;
  background: #f5f7fa;
  white-space: pre-wrap;
}

.detail-markdown :deep(a) {
  color: #337ecc;
}

.detail-text {
  max-height: 360px;
  overflow: auto;
  margin: 0;
  padding: 12px 16px;
  border-radius: 8px;
  border: 1px solid #ebeef5;
  background: #fafafa;
  font-family: inherit;
  line-height: 1.75;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
