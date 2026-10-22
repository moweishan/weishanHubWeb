<template>
  <ToolPage
    title="PDF 签名检查"
    description="在本地解析 PDF 签名结构并校验 PDF 摘要与证书公钥签名。不访问网络，不建立系统根证书信任，也不做 OCSP/CRL 撤销查询；结果不代表法律有效性。"
    category="security"
  >
    <div class="toolbox-panel">
      <FileDrop
        v-model="file"
        label="选择本地 PDF"
        accept=".pdf,application/pdf"
        :max-mb="40"
        hint="点击或拖入 PDF，单个文件不超过 40 MB；不会上传。"
      />
      <div class="toolbox-actions">
        <el-button type="primary" icon="CircleCheck" :loading="loading" :disabled="!file" @click="verify">检查签名</el-button>
        <el-button icon="Delete" @click="clearAll">清空</el-button>
      </div>
      <p class="toolbox-hint">
        仅支持标准 PKCS#7/CMS RSA 签名（SHA-1/256/384/512）；ECDSA、RSASSA-PSS 或特殊 SubFilter 会明确显示不支持。加密 PDF 会被拒绝，不绕过密码。
      </p>
    </div>

    <el-alert v-if="error" type="error" :closable="false" show-icon :title="error" />

    <template v-if="result">
      <div class="toolbox-panel">
        <div class="toolbox-inline">
          <el-tag :type="result.hasSignature ? 'warning' : 'info'">
            {{ result.hasSignature ? `发现 ${result.signatureCount} 个签名` : '未发现数字签名' }}
          </el-tag>
          <el-tag v-if="result.hasSignature" :type="result.integrity ? 'success' : 'danger'">
            {{ result.integrity ? '全文覆盖摘要一致' : '全文摘要不一致或未完整覆盖' }}
          </el-tag>
          <el-tag v-if="result.hasSignature" :type="result.allSignatureValid ? 'success' : 'danger'">
            {{ result.allSignatureValid ? '签名公钥匹配' : '签名公钥未通过' }}
          </el-tag>
          <el-tag v-if="result.hasSignature" :type="result.currentDocumentVerified ? 'success' : 'danger'">
            {{ result.currentDocumentVerified ? '当前全文密码学校验通过（证书仍未受信）' : '当前全文未通过完整验签' }}
          </el-tag>
          <el-tag v-if="result.hasSignature" :type="result.hasUncoveredContent ? 'danger' : 'success'">
            {{ result.hasUncoveredContent ? '末尾内容未被任何签名覆盖' : '至少一个签名覆盖到文件末尾' }}
          </el-tag>
          <el-tag type="info">证书信任/撤销未验证</el-tag>
        </div>
        <p class="toolbox-hint">
          页面数 {{ result.pageCount }}；证书是否由受信 CA 签发、是否被撤销未验证。即使摘要与签名一致，也不代表签署人身份可信。
        </p>
      </div>

      <div v-if="result.hasSignature" class="toolbox-panel">
        <h3 class="toolbox-panel__title"><el-icon><Document /></el-icon>签名明细</h3>
        <div class="toolbox-table-wrap">
          <el-table :data="result.signatures" size="small" border>
            <el-table-column label="#" width="50">
              <template #default="{ row }">{{ row.index + 1 }}</template>
            </el-table-column>
            <el-table-column label="摘要" width="120">
              <template #default="{ row }">
                <el-tag :type="row.integrity === true ? 'success' : row.integrity === false ? 'danger' : 'info'" size="small">
                  {{ row.integrity === true ? '一致' : row.integrity === false ? '不一致' : '未提供' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="签名" width="120">
              <template #default="{ row }">
                <el-tag :type="row.signatureValid ? 'success' : 'danger'" size="small">
                  {{ row.signatureValid ? '公钥匹配' : '未通过' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="覆盖范围" min-width="210">
              <template #default="{ row }">
                <el-tag :type="row.coversWholeDocument ? 'success' : 'warning'" size="small">
                  {{ row.coversWholeDocument ? '覆盖到文件末尾' : '历史/部分覆盖' }}
                </el-tag>
                <div class="toolbox-meta">{{ row.coveredLength }} / {{ row.documentLength }} 字节</div>
              </template>
            </el-table-column>
            <el-table-column label="证书主体" min-width="220">
              <template #default="{ row }">{{ row.certificate?.subject || '-' }}</template>
            </el-table-column>
            <el-table-column label="签发者" min-width="220">
              <template #default="{ row }">{{ row.certificate?.issuer || '-' }}</template>
            </el-table-column>
            <el-table-column label="有效期" min-width="210">
              <template #default="{ row }">
                <span v-if="row.certificate">{{ formatDate(row.certificate.notBefore) }} 至 {{ formatDate(row.certificate.notAfter) }}</span>
                <span v-else>-</span>
                <el-tag v-if="row.certificate?.expired" type="warning" size="small" style="margin-left: 6px">已过期/未生效</el-tag>
                <el-tag v-if="row.certificate?.selfSigned" type="info" size="small" style="margin-left: 6px">自签名</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="说明" min-width="200">
              <template #default="{ row }">
                <span v-if="row.error" class="toolbox-meta">{{ row.error }}</span>
                <span v-else-if="row.coverageWarning" class="toolbox-meta">{{ row.coverageWarning }}；证书链、受信与撤销状态未验证</span>
                <span v-else class="toolbox-meta">覆盖文件末尾；证书链、受信与撤销状态未验证</span>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>

      <el-alert
        v-for="(warning, index) in result.warnings"
        :key="index"
        type="warning"
        :closable="false"
        show-icon
        :title="warning"
        style="margin-bottom: 8px"
      />
    </template>

    <ToolResult
      v-if="!result && !error"
      label="检查结果"
      :text="''"
      empty-text="选择 PDF 后点击检查签名。未发现签名、摘要不一致、坏文件或加密 PDF 都不会显示成功。"
    />
  </ToolPage>
</template>

<script setup>
import ToolPage from '@/components/Toolbox/ToolPage.vue'
import ToolResult from '@/components/Toolbox/ToolResult.vue'
import FileDrop from '@/components/Toolbox/FileDrop.vue'
import { readFileAsArrayBuffer } from '@/utils/toolbox/io'
import { verifyPdfInWorker } from '@/utils/toolbox/pdfSignatureWorkerClient'

const file = ref(null)
const loading = ref(false)
const result = ref(null)
const error = ref('')
let verifyTask = null
let verifyGeneration = 0

function cancelVerifyTask() {
  if (!verifyTask) return
  try {
    verifyTask.cancel()
  } catch {
    // 任务已结束
  }
  verifyTask = null
}

async function verify() {
  error.value = ''
  result.value = null
  const selectedFile = file.value
  if (!selectedFile) {
    error.value = '请选择 PDF 文件'
    return
  }
  cancelVerifyTask()
  const token = ++verifyGeneration
  loading.value = true
  try {
    const buffer = await readFileAsArrayBuffer(selectedFile, { maxBytes: 40 * 1024 * 1024 })
    if (token !== verifyGeneration || file.value !== selectedFile) return
    const task = verifyPdfInWorker(buffer, 20000)
    verifyTask = task
    const value = await task
    if (token !== verifyGeneration || file.value !== selectedFile) return
    result.value = value
  } catch (err) {
    if (token !== verifyGeneration || file.value !== selectedFile) return
    if (err.message !== 'PDF 验签已取消') error.value = err.message
  } finally {
    if (token === verifyGeneration) {
      verifyTask = null
      loading.value = false
    }
  }
}

function formatDate(value) {
  if (!value) return '-'
  return new Date(value).toLocaleString('zh-CN', { hour12: false })
}

function clearAll() {
  verifyGeneration++
  cancelVerifyTask()
  file.value = null
  result.value = null
  error.value = ''
  loading.value = false
}

watch(file, () => {
  verifyGeneration++
  cancelVerifyTask()
  result.value = null
  error.value = ''
  loading.value = false
})

onDeactivated(clearAll)
onBeforeUnmount(clearAll)
</script>
