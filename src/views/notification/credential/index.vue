<template>
  <div class="app-container">
    <el-alert type="warning" :closable="false" show-icon class="mb16">
      <template #title>调用凭证</template>
      <div class="config-tip">
        对外接口使用独立请求头 <code>X-Notification-Key</code>，与系统登录 Authorization 完全独立。
        API Key 只在创建或重置时显示一次，数据库只保存 SHA-256 哈希；请立即保存到调用方密钥管理系统。
      </div>
    </el-alert>

    <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch">
      <el-form-item label="凭证名称" prop="credentialName">
        <el-input v-model="queryParams.credentialName" placeholder="凭证名称" clearable style="width: 210px" @keyup.enter="handleQuery" />
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
        <el-button type="primary" plain icon="Plus" @click="handleAdd" v-hasPermi="['notification:credential:add']">新增凭证</el-button>
      </el-col>
      <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
    </el-row>

    <el-table v-loading="loading" :data="credentialList">
      <el-table-column label="名称" prop="credentialName" min-width="180" show-overflow-tooltip />
      <el-table-column label="Key 前缀" min-width="150">
        <template #default="scope"><code class="key-prefix">{{ scope.row.keyPrefix || '-' }}</code></template>
      </el-table-column>
      <el-table-column label="状态" align="center" width="90">
        <template #default="scope">
          <el-tag :type="scope.row.enabled === '0' ? 'success' : 'info'" size="small">
            {{ scope.row.enabled === '0' ? '启用' : '停用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="最近调用" align="center" width="170">
        <template #default="scope">{{ scope.row.lastUsedTime ? parseTime(scope.row.lastUsedTime) : '从未调用' }}</template>
      </el-table-column>
      <el-table-column label="创建时间" align="center" width="170">
        <template #default="scope">{{ parseTime(scope.row.createTime) }}</template>
      </el-table-column>
      <el-table-column label="备注" prop="remark" min-width="140" show-overflow-tooltip />
      <el-table-column label="操作" align="center" width="230" class-name="small-padding fixed-width">
        <template #default="scope">
          <el-button link type="primary" icon="Edit" @click="handleUpdate(scope.row)" v-hasPermi="['notification:credential:edit']">修改</el-button>
          <el-button link type="warning" icon="RefreshRight" @click="handleReset(scope.row)" v-hasPermi="['notification:credential:reset']">重置 Key</el-button>
          <el-button link type="danger" icon="Delete" @click="handleDelete(scope.row)" v-hasPermi="['notification:credential:remove']">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <pagination v-show="total > 0" :total="total" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" @pagination="getList" />

    <el-dialog :title="title" v-model="open" width="520px" append-to-body :close-on-click-modal="false">
      <el-form ref="credentialRef" :model="form" :rules="rules" label-width="92px">
        <el-form-item label="凭证名称" prop="credentialName">
          <el-input v-model="form.credentialName" placeholder="例如：订单系统生产环境" maxlength="100" show-word-limit />
        </el-form-item>
        <el-form-item label="启用状态" prop="enabled">
          <el-switch v-model="form.enabled" active-value="0" inactive-value="1" active-text="启用" inactive-text="停用" />
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="form.remark" type="textarea" :rows="2" maxlength="500" show-word-limit placeholder="选填" />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button type="primary" :loading="submitting" @click="submitForm">确 定</el-button>
          <el-button @click="open = false">取 消</el-button>
        </div>
      </template>
    </el-dialog>

    <el-dialog
      title="请立即保存 API Key"
      v-model="keyDialog.open"
      width="600px"
      append-to-body
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      @closed="clearOneTimeKey"
    >
      <el-alert type="error" :closable="false" show-icon title="这个 Key 只显示这一次，关闭后无法再次查看。">
        <div class="key-warning">请立即复制并保存到调用方的密钥管理系统；如遗失只能重置（旧 Key 会立即失效）。</div>
      </el-alert>
      <div class="one-time-key">
        <code>{{ oneTimeKey }}</code>
        <el-button type="primary" plain icon="CopyDocument" @click="copyKey">复制</el-button>
      </div>
      <div class="key-usage">
        <div>调用示例：</div>
        <pre>POST /open/notifications
X-Notification-Key: {{ oneTimeKey }}
Content-Type: application/json</pre>
      </div>
      <template #footer>
        <el-button type="primary" @click="keyDialog.open = false">我已保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { getCurrentInstance, reactive, ref, toRefs } from 'vue'
import { ElMessage } from 'element-plus'
import { addCredential, delCredential, listCredential, resetCredential, updateCredential } from '@/api/notification/credential'

defineOptions({ name: 'NotificationCredential' })

const { proxy } = getCurrentInstance()
const credentialList = ref([])
const loading = ref(true)
const showSearch = ref(true)
const total = ref(0)
const open = ref(false)
const title = ref('')
const submitting = ref(false)
const oneTimeKey = ref('')
const keyDialog = reactive({ open: false })

const data = reactive({
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    credentialName: undefined,
    enabled: undefined
  },
  form: {},
  rules: {
    credentialName: [{ required: true, message: '凭证名称不能为空', trigger: 'blur' }]
  }
})

const { queryParams, form, rules } = toRefs(data)

function getList() {
  loading.value = true
  listCredential(queryParams.value).then(response => {
    credentialList.value = response.rows || []
    total.value = response.total || 0
  }).finally(() => {
    loading.value = false
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
  form.value = {
    credentialId: undefined,
    credentialName: undefined,
    enabled: '0',
    remark: undefined
  }
  proxy.resetForm('credentialRef')
}

function handleAdd() {
  reset()
  title.value = '新增调用凭证'
  open.value = true
}

function handleUpdate(row) {
  reset()
  form.value = {
    credentialId: row.credentialId,
    credentialName: row.credentialName,
    enabled: row.enabled,
    remark: row.remark
  }
  title.value = '修改调用凭证'
  open.value = true
}

function submitForm() {
  proxy.$refs['credentialRef'].validate(valid => {
    if (!valid) {
      return
    }
    const payload = {
      credentialName: (form.value.credentialName || '').trim(),
      enabled: form.value.enabled,
      remark: form.value.remark
    }
    submitting.value = true
    if (form.value.credentialId) {
      updateCredential(form.value.credentialId, payload).then(() => {
        proxy.$modal.msgSuccess('修改成功')
        open.value = false
        getList()
      }).finally(() => {
        submitting.value = false
      })
    } else {
      addCredential(payload).then(response => {
        open.value = false
        showOneTimeKey(response.data)
        getList()
      }).finally(() => {
        submitting.value = false
      })
    }
  })
}

function handleReset(row) {
  proxy.$modal.confirm('确认重置“' + row.credentialName + '”的 API Key 吗？旧 Key 会立即失效，正在使用旧 Key 的调用方将无法发送通知。').then(() => {
    return resetCredential(row.credentialId)
  }).then(response => {
    showOneTimeKey(response.data)
    getList()
  }).catch(() => {})
}

function handleDelete(row) {
  proxy.$modal.confirm('确认删除调用凭证“' + row.credentialName + '”吗？删除后使用该 Key 的调用方将无法再发送通知。').then(() => {
    return delCredential(row.credentialId)
  }).then(() => {
    proxy.$modal.msgSuccess('删除成功')
    getList()
  }).catch(() => {})
}

function showOneTimeKey(data) {
  oneTimeKey.value = (data && data.apiKey) || ''
  keyDialog.open = true
}

function clearOneTimeKey() {
  oneTimeKey.value = ''
}

async function copyKey() {
  if (!oneTimeKey.value) {
    return
  }
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(oneTimeKey.value)
    } else {
      const textarea = document.createElement('textarea')
      textarea.value = oneTimeKey.value
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }
    ElMessage.success('已复制，请妥善保存')
  } catch (error) {
    ElMessage.error('复制失败，请手动选择 Key 复制')
  }
}

getList()
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
  color: #337ecc;
}

.key-prefix {
  padding: 1px 6px;
  border-radius: 4px;
  background: #f5f7fa;
  color: #606266;
  font-family: Consolas, Monaco, 'Courier New', monospace;
}

.key-warning {
  margin-top: 6px;
  line-height: 1.7;
}

.one-time-key {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 16px;
}

.one-time-key code {
  flex: 1;
  padding: 12px 14px;
  border-radius: 8px;
  border: 1px dashed #e6a23c;
  background: #fdf6ec;
  color: #b88230;
  font-family: Consolas, Monaco, 'Courier New', monospace;
  font-size: 14px;
  word-break: break-all;
}

.key-usage {
  margin-top: 16px;
  color: #606266;
  font-size: 13px;
  line-height: 1.7;
}

.key-usage pre {
  margin: 6px 0 0;
  padding: 12px;
  border-radius: 8px;
  background: #f5f7fa;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
