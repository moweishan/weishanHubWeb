<template>
  <div class="app-container">
    <el-card shadow="never" class="intro-card">
      <div class="intro-line">
        <span>统一管理通知渠道与详情页地址，外部系统按 routeCode 选择通知路径。</span>
        <el-button link type="primary" @click="helpOpen = !helpOpen">
          {{ helpOpen ? '收起配置帮助' : '配置帮助' }}
        </el-button>
      </div>
      <el-collapse-transition>
        <div v-show="helpOpen" class="help-content">
          <p>每个 routeCode 唯一，调用方按此编码选择目标渠道；新增或启用渠道前必须配置企业微信应用 Secret。</p>
          <p>
            <strong>两种密钥：</strong>本页“Secret”是企业微信自建应用的 Secret，加密落库、保存后不回显，编辑时留空表示保持原值；
            后端通知加密主密钥 notification.master-key（或环境变量 NOTIFICATION_MASTER_KEY）不在本页填写，也不能用应用 Secret 代替。
          </p>
          <p>修改已有渠道不能切换类型；已接单通知使用接单时的渠道与详情页地址快照，不受后续修改影响。</p>
        </div>
      </el-collapse-transition>
    </el-card>

    <el-card shadow="never" class="detail-url-card">
      <template #header>
        <div class="card-header">
          <span>详情页地址</span>
          <el-tag size="small" effect="plain" :type="detailUrlState.source === 'DATABASE' ? 'success' : 'info'">
            {{ detailUrlSourceLabel(detailUrlState.source) }}
          </el-tag>
        </div>
      </template>
      <div class="detail-url-current">
        <span class="current-label">当前生效：</span>
        <code v-if="detailUrlState.effectiveUrl" class="current-value">{{ detailUrlState.effectiveUrl }}</code>
        <span v-else class="muted">未配置</span>
      </div>
      <el-form :inline="!isMobile" class="detail-url-form" @submit.prevent>
        <el-form-item label="统一地址" class="detail-url-item">
          <el-input
            v-model="detailUrlInput"
            :disabled="!canEdit"
            clearable
            maxlength="500"
            placeholder="https://hub.example.com，可带部署子路径与端口"
            @keyup.enter="saveDetailUrl"
          />
        </el-form-item>
        <el-form-item>
          <el-button
            v-hasPermi="['notification:channel:edit']"
            type="primary"
            :loading="detailUrlSaving"
            :disabled="!canEdit"
            @click="saveDetailUrl"
          >保存</el-button>
        </el-form-item>
      </el-form>
      <div class="form-tip">保存后立即生效，仅影响后续新通知；所有路径共用同一地址，已接单记录使用接单时的地址快照。</div>
      <div v-if="detailUrlState.fallbackUrl" class="form-tip">
        页面未保存地址时回退后端 notification.public-base-url：{{ detailUrlState.fallbackUrl }}
      </div>
      <div v-if="!canEdit" class="form-tip">当前账号没有 notification:channel:edit 权限，只能查看，不能修改。</div>
      <el-alert v-if="detailUrlError" type="error" :closable="false" show-icon class="mt8" :title="detailUrlError" />
    </el-card>

    <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch" class="query-form">
      <el-form-item label="路径编码" prop="routeCode">
        <el-input v-model="queryParams.routeCode" placeholder="routeCode" clearable style="width: 190px" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="渠道名称" prop="channelName">
        <el-input v-model="queryParams.channelName" placeholder="渠道名称" clearable style="width: 190px" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="状态" prop="enabled">
        <el-select v-model="queryParams.enabled" placeholder="全部" clearable style="width: 140px">
          <el-option label="启用" value="0" />
          <el-option label="停用" value="1" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
        <el-button icon="Refresh" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <el-row :gutter="10" class="mb8">
      <el-col :span="1.5">
        <el-button type="primary" plain icon="Plus" @click="handleAdd" v-hasPermi="['notification:channel:add']">新增</el-button>
      </el-col>
      <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
    </el-row>

    <el-table v-loading="loading" :data="channelList">
      <el-table-column label="渠道名称" prop="channelName" min-width="150" show-overflow-tooltip />
      <el-table-column label="路径编码" prop="routeCode" min-width="150" show-overflow-tooltip>
        <template #default="scope"><code class="route-code">{{ scope.row.routeCode }}</code></template>
      </el-table-column>
      <el-table-column label="通知方式" align="center" min-width="120">
        <template #default="scope">
          <el-tag size="small" effect="plain">{{ providerLabel(scope.row.provider) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="配置摘要" min-width="260">
        <template #default="scope">
          <div class="summary-cell" :title="providerSummary(scope.row)">{{ providerSummary(scope.row) }}</div>
        </template>
      </el-table-column>
      <el-table-column label="状态" align="center" width="90">
        <template #default="scope">
          <el-tag :type="scope.row.enabled === '0' ? 'success' : 'info'" size="small">
            {{ scope.row.enabled === '0' ? '启用' : '停用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="更新时间" align="center" width="170">
        <template #default="scope">{{ parseTime(scope.row.updateTime || scope.row.createTime) }}</template>
      </el-table-column>
      <el-table-column label="操作" align="center" width="210" class-name="small-padding fixed-width">
        <template #default="scope">
          <el-button link type="primary" icon="View" @click="showDetail(scope.row)" v-hasPermi="['notification:channel:list']">详情</el-button>
          <el-button link type="primary" icon="Edit" @click="handleUpdate(scope.row)" v-hasPermi="['notification:channel:edit']">编辑</el-button>
          <el-button link type="danger" icon="Delete" @click="handleDelete(scope.row)" v-hasPermi="['notification:channel:remove']">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <pagination v-show="total > 0" :total="total" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" @pagination="getList" />

    <el-drawer
      v-model="detailOpen"
      title="渠道详情"
      :size="drawerSize"
      append-to-body
      :close-on-click-modal="true"
      @closed="detailChannel = null"
    >
      <div v-loading="detailLoading" class="drawer-body">
        <template v-if="detailChannel">
          <el-descriptions title="公共信息" :column="isMobile ? 1 : 2" border size="small">
            <el-descriptions-item label="渠道名称">{{ detailChannel.channelName }}</el-descriptions-item>
            <el-descriptions-item label="路径编码"><code class="route-code">{{ detailChannel.routeCode }}</code></el-descriptions-item>
            <el-descriptions-item label="通知方式">{{ providerLabel(detailChannel.provider) }}</el-descriptions-item>
            <el-descriptions-item label="状态">
              <el-tag size="small" :type="detailChannel.enabled === '0' ? 'success' : 'info'">
                {{ detailChannel.enabled === '0' ? '启用' : '停用' }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="更新时间">{{ parseTime(detailChannel.updateTime || detailChannel.createTime) }}</el-descriptions-item>
            <el-descriptions-item label="备注">{{ detailChannel.remark || '-' }}</el-descriptions-item>
          </el-descriptions>

          <el-descriptions :title="providerDetailTitle(detailChannel.provider)" :column="isMobile ? 1 : 2" border size="small" class="mt16">
            <el-descriptions-item v-for="field in detailFields" :key="field.label" :label="field.label">
              {{ field.value }}
            </el-descriptions-item>
          </el-descriptions>
        </template>
      </div>
    </el-drawer>

    <el-dialog :title="title" v-model="open" :width="dialogWidth" append-to-body :close-on-click-modal="false" @closed="reset">
      <el-form
        ref="channelRef"
        :model="form"
        :rules="rules"
        :label-width="isMobile ? 'auto' : '112px'"
        :label-position="isMobile ? 'top' : 'right'"
        class="channel-form"
      >
        <el-divider content-position="left">基本信息</el-divider>
        <el-form-item label="渠道名称" prop="channelName">
          <el-input v-model="form.channelName" placeholder="例如：订单通知群" maxlength="100" />
        </el-form-item>
        <el-form-item label="路径编码" prop="routeCode">
          <el-input v-model="form.routeCode" placeholder="例如：order-alert" maxlength="64" />
          <div class="form-tip">唯一，只允许字母、数字、下划线和中划线；调用方按此编码选择通知路径。</div>
        </el-form-item>
        <el-form-item label="渠道类型" prop="provider">
          <el-select v-model="form.provider" style="width: 100%" :disabled="!!form.channelId">
            <el-option v-for="item in providerSelectOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
          <div v-if="form.channelId" class="form-tip">已有渠道不允许切换类型。</div>
        </el-form-item>
        <el-form-item label="启用状态" prop="enabled">
          <el-switch v-model="form.enabled" active-value="0" inactive-value="1" active-text="启用" inactive-text="停用" />
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="form.remark" type="textarea" :rows="2" maxlength="500" show-word-limit placeholder="选填" />
        </el-form-item>

        <el-divider content-position="left">渠道配置</el-divider>
        <template v-if="isWeComProvider(form.provider)">
          <el-form-item label="CorpID" prop="corpId">
            <el-input v-model="form.corpId" placeholder="企业微信 CorpID" maxlength="128" />
          </el-form-item>
          <el-form-item label="AgentID" prop="agentId">
            <el-input-number v-model="form.agentId" :min="1" :max="2147483647" controls-position="right" style="width: 220px; max-width: 100%" />
          </el-form-item>
          <el-form-item label="接收 UserID" prop="toUser">
            <el-input v-model="form.toUser" type="textarea" :rows="2" placeholder="例如：zhangsan|lisi，多个成员用 | 或逗号分隔；@all 表示全体成员" maxlength="1000" show-word-limit />
            <div class="form-tip">企业微信成员 UserID；多个成员可用 |、逗号或分号分隔，保存时统一为 |。</div>
          </el-form-item>
          <el-form-item label="Secret" prop="secret">
            <el-input
              v-model="form.secret"
              type="password"
              show-password
              autocomplete="new-password"
              :placeholder="secretPlaceholder"
              maxlength="2048"
            />
            <div class="form-tip">
              企业微信自建应用 Secret，不是后端通知加密主密钥；加密落库且永不回显，编辑时留空表示保持原值。
            </div>
          </el-form-item>
        </template>
        <el-alert
          v-else
          type="warning"
          :closable="false"
          show-icon
          title="暂不支持该渠道类型的配置编辑，请升级系统或仅维护基本信息。"
        />
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button type="primary" :loading="submitting" @click="submitForm">确 定</el-button>
          <el-button @click="cancel">取 消</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, getCurrentInstance, onBeforeUnmount, onMounted, reactive, ref, toRefs } from 'vue'
import {
  addChannel,
  delChannel,
  getChannel,
  getDetailUrl,
  listChannel,
  updateChannel,
  updateDetailUrl
} from '@/api/notification/channel'
import { checkPermi } from '@/utils/permission'
import {
  detailUrlSourceLabel,
  isWeComProvider,
  normalizeDetailBaseUrl,
  providerDetailFields,
  providerDetailTitle,
  providerLabel,
  providerOptions,
  providerSummary
} from '@/utils/notification/channel'

defineOptions({ name: 'NotificationChannel' })

const { proxy } = getCurrentInstance()
const channelList = ref([])
const loading = ref(true)
const showSearch = ref(true)
const total = ref(0)
const open = ref(false)
const title = ref('')
const submitting = ref(false)
const secretConfigured = ref(false)
const helpOpen = ref(false)
const isMobile = ref(window.innerWidth <= 768)
const detailOpen = ref(false)
const detailLoading = ref(false)
const detailChannel = ref(null)
const detailUrlSaving = ref(false)
const detailUrlInput = ref('')
const detailUrlError = ref('')
const detailUrlState = ref({
  effectiveUrl: '',
  configuredValue: '',
  fallbackUrl: '',
  source: 'NONE',
  error: ''
})

const data = reactive({
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    routeCode: undefined,
    channelName: undefined,
    enabled: undefined
  },
  form: {},
  rules: {
    routeCode: [
      { required: true, message: '路径编码不能为空', trigger: 'blur' },
      { pattern: /^[A-Za-z0-9_-]{1,64}$/, message: '只允许字母、数字、下划线和中划线，长度 1-64', trigger: 'blur' }
    ],
    channelName: [{ required: true, message: '渠道名称不能为空', trigger: 'blur' }],
    provider: [{ required: true, message: '渠道类型不能为空', trigger: 'change' }],
    corpId: [{ required: true, message: 'CorpID 不能为空', trigger: 'blur' }],
    agentId: [{ required: true, message: 'AgentID 不能为空', trigger: 'blur' }],
    toUser: [{ required: true, message: '接收 UserID 不能为空', trigger: 'blur' }],
    secret: [{ validator: validateSecret, trigger: 'blur' }]
  }
})

const { queryParams, form, rules } = toRefs(data)
const secretPlaceholder = ref('新增时必填；编辑时留空保持原 Secret')
const canEdit = computed(() => checkPermi(['notification:channel:edit']))
const drawerSize = computed(() => (isMobile.value ? '100%' : '560px'))
const dialogWidth = computed(() => (isMobile.value ? '94%' : '680px'))
const detailFields = computed(() => providerDetailFields(detailChannel.value || {}))
const providerSelectOptions = computed(() => {
  const options = providerOptions()
  if (form.value.provider && !options.some(item => item.value === form.value.provider)) {
    options.push({ value: form.value.provider, label: providerLabel(form.value.provider) })
  }
  return options
})

function validateSecret(rule, value, callback) {
  if (!isWeComProvider(form.value.provider)) {
    callback()
    return
  }
  if (!form.value.channelId && !value) {
    callback(new Error('新增渠道必须填写 Secret'))
    return
  }
  if (form.value.enabled === '0' && !secretConfigured.value && !value) {
    callback(new Error('启用渠道前必须填写 Secret'))
    return
  }
  callback()
}

function getList() {
  loading.value = true
  listChannel(queryParams.value).then(response => {
    channelList.value = response.rows || []
    total.value = response.total || 0
  }).finally(() => {
    loading.value = false
  })
}

function loadDetailUrl() {
  getDetailUrl().then(response => {
    const payload = response.data || {}
    detailUrlState.value = {
      effectiveUrl: payload.effectiveUrl || '',
      configuredValue: payload.configuredValue || '',
      fallbackUrl: payload.fallbackUrl || '',
      source: payload.source || 'NONE',
      error: payload.error || ''
    }
    detailUrlInput.value = payload.configuredValue || payload.effectiveUrl || ''
    detailUrlError.value = payload.error || ''
  }).catch(error => {
    detailUrlError.value = error?.msg || error?.message || '详情页地址加载失败，请稍后重试'
  })
}

function saveDetailUrl() {
  if (!canEdit.value) {
    return
  }
  const normalized = normalizeDetailBaseUrl(detailUrlInput.value)
  if (!normalized.valid) {
    detailUrlError.value = normalized.error
    proxy.$modal.msgError(normalized.error)
    return
  }
  detailUrlSaving.value = true
  updateDetailUrl(normalized.value).then(response => {
    const payload = response.data || {}
    detailUrlState.value = {
      effectiveUrl: payload.effectiveUrl || '',
      configuredValue: payload.configuredValue || '',
      fallbackUrl: payload.fallbackUrl || '',
      source: payload.source || 'NONE',
      error: payload.error || ''
    }
    detailUrlInput.value = payload.configuredValue || payload.effectiveUrl || normalized.value
    detailUrlError.value = payload.error || ''
    proxy.$modal.msgSuccess('详情页地址已保存，立即生效')
  }).catch(error => {
    // 保存失败时保留页面上一次生效值，只显示明确错误
    detailUrlError.value = error?.msg || error?.message || '详情页地址保存失败，当前生效值未改变'
  }).finally(() => {
    detailUrlSaving.value = false
  })
}

function handleQuery() {
  queryParams.value.pageNum = 1
  getList()
}

function resetQuery() {
  proxy.resetForm('queryRef')
  handleQuery()
}

function reset() {
  secretConfigured.value = false
  form.value = {
    channelId: undefined,
    routeCode: undefined,
    channelName: undefined,
    provider: 'WECOM_APP',
    corpId: undefined,
    agentId: 1,
    toUser: undefined,
    secret: undefined,
    enabled: '0',
    remark: undefined
  }
  proxy.resetForm('channelRef')
}

function handleAdd() {
  reset()
  title.value = '新增通知渠道'
  open.value = true
}

function handleUpdate(row) {
  reset()
  getChannel(row.channelId).then(response => {
    const channel = response.data || {}
    form.value = {
      channelId: channel.channelId,
      routeCode: channel.routeCode,
      channelName: channel.channelName,
      provider: channel.provider || 'WECOM_APP',
      corpId: channel.corpId,
      agentId: channel.agentId,
      toUser: channel.toUser,
      secret: '',
      enabled: channel.enabled || '0',
      remark: channel.remark
    }
    secretConfigured.value = !!channel.secretConfigured
    title.value = '编辑通知渠道'
    open.value = true
  })
}

function showDetail(row) {
  detailOpen.value = true
  detailLoading.value = true
  detailChannel.value = null
  getChannel(row.channelId).then(response => {
    detailChannel.value = response.data || null
  }).finally(() => {
    detailLoading.value = false
  })
}

function cancel() {
  open.value = false
  reset()
}

function submitForm() {
  proxy.$refs['channelRef'].validate(valid => {
    if (!valid) {
      return
    }
    const payload = {
      routeCode: (form.value.routeCode || '').trim(),
      channelName: (form.value.channelName || '').trim(),
      provider: form.value.provider,
      corpId: (form.value.corpId || '').trim(),
      agentId: form.value.agentId,
      toUser: (form.value.toUser || '').trim(),
      enabled: form.value.enabled,
      remark: form.value.remark,
      secret: form.value.secret || undefined
    }
    submitting.value = true
    const action = form.value.channelId
      ? updateChannel(form.value.channelId, payload)
      : addChannel(payload)
    action.then(() => {
      proxy.$modal.msgSuccess(form.value.channelId ? '修改成功' : '新增成功')
      open.value = false
      getList()
    }).finally(() => {
      submitting.value = false
    })
  })
}

function handleDelete(row) {
  proxy.$modal.confirm('确认删除渠道“' + row.channelName + '（' + row.routeCode + '）”吗？已接单记录使用快照，不受影响。').then(() => {
    return delChannel(row.channelId)
  }).then(() => {
    proxy.$modal.msgSuccess('删除成功')
    getList()
  }).catch(() => {})
}

function handleResize() {
  isMobile.value = window.innerWidth <= 768
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
})

getList()
loadDetailUrl()
</script>

<style scoped>
.intro-card,
.detail-url-card {
  margin-bottom: 16px;
}

.intro-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  color: #303133;
}

.help-content {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid #ebeef5;
  color: #606266;
  font-size: 13px;
  line-height: 1.75;
}

.help-content p {
  margin: 4px 0;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.detail-url-current {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 14px;
}

.current-label {
  color: #606266;
}

.current-value {
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(64, 158, 255, 0.1);
  color: #337ecc;
  word-break: break-all;
}

.muted {
  color: #909399;
}

.detail-url-form {
  display: flex;
  flex-wrap: wrap;
}

.detail-url-item {
  flex: 1;
  min-width: 260px;
}

.detail-url-item :deep(.el-form-item__content) {
  width: 100%;
}

.query-form {
  margin-top: 4px;
}

.mb8 {
  margin-bottom: 8px;
}

.mt8 {
  margin-top: 8px;
}

.mt16 {
  margin-top: 16px;
}

.route-code {
  padding: 1px 6px;
  border-radius: 4px;
  background: rgba(64, 158, 255, 0.12);
  color: #337ecc;
  font-family: Consolas, Monaco, 'Courier New', monospace;
}

.summary-cell {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.5;
  word-break: break-all;
}

.form-tip {
  width: 100%;
  margin-top: 4px;
  color: #909399;
  font-size: 12px;
  line-height: 1.6;
}

.drawer-body {
  min-height: 120px;
}

.channel-form :deep(.el-input-number) {
  max-width: 100%;
}

@media (max-width: 768px) {
  .detail-url-item {
    min-width: 100%;
  }

  .detail-url-form :deep(.el-form-item) {
    width: 100%;
    margin-right: 0;
  }

  .el-dialog {
    max-width: 100%;
  }

  .summary-cell {
    -webkit-line-clamp: 2;
  }
}
</style>
