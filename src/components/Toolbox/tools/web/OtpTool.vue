<template>
  <ToolPage
    title="OTP 口令生成与校验"
    description="本地 TOTP/HOTP 认证器口令，使用标准 Base32 密钥与 HMAC。支持 SHA-1/SHA-256/SHA-512、6/8/10 位、时间步长与 TOTP 校验窗口。不是短信接口。"
    category="web"
  >
    <div class="toolbox-panel">
      <el-form label-position="top" class="toolbox-form">
        <el-row :gutter="14">
          <el-col :xs="24" :sm="12">
            <el-form-item label="类型">
              <el-radio-group v-model="type">
                <el-radio-button value="totp">TOTP（基于时间）</el-radio-button>
                <el-radio-button value="hotp">HOTP（基于计数器）</el-radio-button>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12">
            <el-form-item label="Base32 密钥">
              <div class="toolbox-inline">
                <el-input v-model="secret" type="password" show-password placeholder="JBSWY3DPEHPK3PXP" class="toolbox-mono" style="flex: 1" />
                <el-button icon="Refresh" @click="createSecret">随机生成</el-button>
              </div>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="14">
          <el-col :xs="24" :sm="8">
            <el-form-item label="位数">
              <el-select v-model="digits" class="toolbox-field-full">
                <el-option :value="6" label="6 位" />
                <el-option :value="8" label="8 位" />
                <el-option :value="10" label="10 位" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="8">
            <el-form-item label="算法">
              <el-select v-model="algorithm" class="toolbox-field-full">
                <el-option label="SHA-1（兼容性最好）" value="SHA-1" />
                <el-option label="SHA-256" value="SHA-256" />
                <el-option label="SHA-512" value="SHA-512" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col v-if="type === 'totp'" :xs="24" :sm="8">
            <el-form-item label="时间步长（秒）">
              <el-select v-model="period" class="toolbox-field-full">
                <el-option :value="30" label="30 秒" />
                <el-option :value="60" label="60 秒" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col v-else :xs="24" :sm="8">
            <el-form-item label="HOTP 计数器">
              <el-input-number v-model="counter" :min="0" :max="maxCounter" class="toolbox-field-full" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-alert v-if="error" type="error" :closable="false" show-icon :title="error" style="margin-bottom: 12px" />

        <template v-if="type === 'totp'">
          <div class="toolbox-otp-code">{{ code || '------' }}</div>
          <el-progress :percentage="remainingPercent" :stroke-width="8" :show-text="false" style="margin-bottom: 8px" />
          <p class="toolbox-hint">剩余 {{ remaining }} 秒；刷新由本地计时器完成，不访问网络。</p>
          <div class="toolbox-inline" style="margin-top: 12px">
            <el-input v-model="token" maxlength="10" placeholder="输入 6-10 位口令校验" style="max-width: 240px" />
            <el-select v-model="window" style="width: 160px">
              <el-option :value="0" label="窗口 ±0" />
              <el-option :value="1" label="窗口 ±1" />
              <el-option :value="2" label="窗口 ±2" />
            </el-select>
            <el-button type="primary" icon="CircleCheck" @click="verify">校验</el-button>
          </div>
        </template>

        <template v-else>
          <div class="toolbox-otp-code">{{ hotpCode || '------' }}</div>
          <div class="toolbox-inline">
            <el-button type="primary" icon="Refresh" @click="refreshHotp">生成当前计数器口令</el-button>
            <el-input v-model="token" maxlength="10" placeholder="输入 6-10 位口令" style="max-width: 220px" />
            <el-button icon="CircleCheck" @click="verify">校验</el-button>
          </div>
          <p class="toolbox-hint">HOTP 校验使用当前填写的计数器，不自动递增，避免客户端与服务器计数不同步。</p>
        </template>

        <el-alert
          v-if="verifyResult"
          :type="verifyResult.valid ? 'success' : 'error'"
          :closable="false"
          show-icon
          :title="verifyResult.valid ? `校验通过${verifyResult.offset !== null && verifyResult.offset !== undefined ? `（偏移 ${verifyResult.offset}）` : ''}` : '校验失败：口令不匹配或已过期'"
          style="margin-top: 12px"
        />
      </el-form>
    </div>

    <div class="toolbox-panel">
      <h3 class="toolbox-panel__title"><el-icon><Link /></el-icon>otpauth URI（含密钥，谨慎分享）</h3>
      <el-input :model-value="otpauthUri" readonly class="toolbox-mono" />
      <div class="toolbox-actions">
        <el-button size="small" icon="CopyDocument" @click="copyUri">复制 URI</el-button>
        <el-button size="small" icon="Delete" @click="clearAll">清空并停止计时</el-button>
      </div>
      <p class="toolbox-hint">密钥只存在于当前组件内存；离开页面（包括 keep-alive 停用）会清空。建议菜单设置 noCache。</p>
    </div>
  </ToolPage>
</template>

<script setup>
import { ElMessage } from 'element-plus'
import ToolPage from '@/components/Toolbox/ToolPage.vue'
import { buildOtpAuthUri, generateBase32Secret, generateHotp, generateTotp, verifyHotp, verifyTotp } from '@/utils/toolbox/otp'
import { copyText } from '@/utils/toolbox/io'

const type = ref('totp')
const secret = ref('')
const digits = ref(6)
const algorithm = ref('SHA-1')
const period = ref(30)
const counter = ref(0)
const maxCounter = Number.MAX_SAFE_INTEGER
const window = ref(1)
const code = ref('')
const remaining = ref(0)
const hotpCode = ref('')
const token = ref('')
const verifyResult = ref(null)
const error = ref('')
let timer = null
let running = false

const remainingPercent = computed(() => {
  if (!period.value) return 0
  return Math.max(0, Math.min(100, Math.round((remaining.value / period.value) * 100)))
})

const otpauthUri = computed(() => {
  if (!secret.value.trim()) return ''
  try {
    return buildOtpAuthUri({
      type: type.value,
      secret: secret.value,
      issuer: 'weishanHub',
      account: 'local@weishanhub',
      digits: digits.value,
      period: period.value,
      algorithm: algorithm.value
    })
  } catch {
    return ''
  }
})

async function refreshTotp() {
  if (running || type.value !== 'totp') return
  if (!secret.value.trim()) {
    code.value = ''
    remaining.value = 0
    return
  }
  running = true
  try {
    const result = await generateTotp(secret.value, {
      digits: digits.value,
      period: period.value,
      algorithm: algorithm.value
    })
    code.value = result.code
    remaining.value = result.remaining
    error.value = ''
  } catch (err) {
    code.value = ''
    error.value = err.message
  } finally {
    running = false
  }
}

async function refreshHotp() {
  error.value = ''
  verifyResult.value = null
  try {
    const result = await generateHotp(secret.value, {
      counter: counter.value,
      digits: digits.value,
      algorithm: algorithm.value
    })
    hotpCode.value = result.code
  } catch (err) {
    hotpCode.value = ''
    error.value = err.message
  }
}

async function verify() {
  error.value = ''
  verifyResult.value = null
  try {
    if (!token.value.trim()) throw new Error('请输入待校验口令')
    const result =
      type.value === 'totp'
        ? await verifyTotp(secret.value, token.value, {
            digits: digits.value,
            period: period.value,
            algorithm: algorithm.value,
            window: window.value
          })
        : await verifyHotp(secret.value, token.value, counter.value, {
            digits: digits.value,
            algorithm: algorithm.value
          })
    verifyResult.value = result
  } catch (err) {
    error.value = err.message
  }
}

function createSecret() {
  secret.value = generateBase32Secret(20)
  code.value = ''
  hotpCode.value = ''
  verifyResult.value = null
  error.value = ''
  if (type.value === 'totp') refreshTotp()
}

async function copyUri() {
  if (!otpauthUri.value) {
    ElMessage.warning('当前没有可复制的 otpauth URI')
    return
  }
  try {
    await copyText(otpauthUri.value)
    ElMessage.success('已复制 otpauth URI')
  } catch (err) {
    ElMessage.error(err.message)
  }
}

function startTimer() {
  stopTimer()
  if (type.value !== 'totp') return
  timer = setInterval(refreshTotp, 1000)
  refreshTotp()
}

function stopTimer() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

function clearAll() {
  stopTimer()
  secret.value = ''
  code.value = ''
  hotpCode.value = ''
  token.value = ''
  remaining.value = 0
  verifyResult.value = null
  error.value = ''
}

watch([secret, digits, algorithm, period], () => {
  verifyResult.value = null
  if (type.value === 'totp') refreshTotp()
})

watch(type, (value) => {
  code.value = ''
  hotpCode.value = ''
  verifyResult.value = null
  token.value = ''
  if (value === 'totp') startTimer()
  else {
    stopTimer()
    refreshHotp()
  }
})

watch(counter, () => {
  if (type.value === 'hotp') {
    hotpCode.value = ''
    verifyResult.value = null
  }
})

onMounted(startTimer)
onActivated(startTimer)
onDeactivated(clearAll)
onBeforeUnmount(clearAll)
</script>

<style scoped>
.toolbox-otp-code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: clamp(30px, 8vw, 48px);
  font-weight: 700;
  letter-spacing: 0.16em;
  text-align: center;
  padding: 14px 8px;
  border-radius: 10px;
  background: var(--el-fill-color-lighter);
  color: var(--el-color-primary);
  user-select: all;
}
</style>
