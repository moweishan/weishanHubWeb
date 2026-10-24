<template>
  <main class="notification-page">
    <section class="notification-card">
      <div class="notification-brand">
        <span class="notification-brand__mark">W</span>
        <span>weishanHub 通知</span>
      </div>

      <div v-if="state === 'loading'" class="notification-loading">
        <el-skeleton :rows="6" animated />
      </div>

      <el-result
        v-else-if="state === 'login'"
        icon="warning"
        title="需要登录后查看"
        :sub-title="loginSubtitle"
      >
        <template #extra>
          <el-button type="primary" @click="goLogin">前往登录</el-button>
        </template>
      </el-result>

      <el-result
        v-else-if="state === 'forbidden'"
        icon="error"
        title="没有查看权限"
        sub-title="当前账号没有通知记录查询权限，请联系管理员授权。"
      >
        <template #extra>
          <el-button @click="goHome">返回首页</el-button>
        </template>
      </el-result>

      <el-result
        v-else-if="state === 'invalid'"
        icon="info"
        title="通知不存在或链接已失效"
        sub-title="链接可能已过期、被撤销、被删除，或地址不完整。"
      />

      <el-result
        v-else-if="state === 'error'"
        icon="error"
        title="暂时无法加载通知"
        sub-title="请稍后刷新重试；若持续失败，请联系管理员。"
      >
        <template #extra>
          <el-button @click="load">重新加载</el-button>
        </template>
      </el-result>

      <article v-else-if="record" class="notification-article">
        <header class="notification-header">
          <div class="notification-tags">
            <el-tag size="small" effect="plain" type="info">{{ record.messageType === 'CARD' ? '图文通知' : '文本通知' }}</el-tag>
            <el-tag v-if="record.accessMode === 'LOGIN'" size="small" effect="plain" type="success">登录查看</el-tag>
          </div>
          <h1 class="notification-title">{{ record.title }}</h1>
          <p v-if="record.summary" class="notification-summary">{{ record.summary }}</p>
          <div class="notification-meta">
            <span>发送时间：{{ formatDate(record.sentAt) }}</span>
            <span v-if="record.accessMode === 'WECHAT' && !expired">链接剩余：{{ remaining }}</span>
            <span v-else-if="record.accessMode === 'LOGIN'">
              {{ expired ? '链接已超过免登录有效期' : '链接剩余：' + remaining }}
            </span>
          </div>
        </header>

        <el-alert
          v-if="expired && record.accessMode === 'LOGIN'"
          type="warning"
          :closable="false"
          show-icon
          class="notification-expired-alert"
          title="该链接已超过免登录有效期"
          description="当前内容仅因你的后台通知记录查询权限而显示；转发给其他人后将无法免登录查看。"
        />

        <div v-if="record.messageType === 'CARD'" class="notification-markdown" v-html="safeHtml"></div>
        <pre v-else class="notification-text">{{ plainContent }}</pre>

        <NotificationQuestionForm :token="String(route.params.token || '')" @access-error="load" />

        <footer class="notification-footer">
          微信 / 企业微信内可在免登录截止前直接查看；普通浏览器需登录后由具备通知记录查询权限的账号查看。链接到期、撤销或删除后立即失效。
        </footer>
      </article>
    </section>
  </main>
</template>

<script setup>
import { computed, getCurrentInstance, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getNotificationDetail } from '@/api/notification/public'
import {
  buildLoginRedirect,
  formatRemaining,
  isPublicExpired,
  isValidNotificationToken,
  serverTimeOffset
} from '@/utils/notification/public'
import { renderNotificationMarkdown } from '@/utils/notification/markdown'
import { removeToken } from '@/utils/auth'
import useUserStore from '@/store/modules/user'
import NotificationQuestionForm from '@/components/NotificationQuestionForm/index.vue'

defineOptions({ name: 'NotificationPublicDetail' })

const { proxy } = getCurrentInstance()
const route = useRoute()
const router = useRouter()

const state = ref('loading')
const record = ref(null)
const safeHtml = ref('')
const now = ref(new Date())
const serverOffset = ref(0)
const loginSubtitle = ref('该链接需要在微信 / 企业微信内打开，或登录后由具备通知记录查询权限的账号查看。')
const DEFAULT_LOGIN_SUBTITLE = loginSubtitle.value
const authFailed = ref(false)

let timer = null
let referrerMeta = null
let robotsMeta = null
let originalTitle = ''
let loadSequence = 0

const expired = computed(() => (record.value ? isPublicExpired(record.value.expiresAt, now.value) : true))
const remaining = computed(() => (record.value ? formatRemaining(record.value.expiresAt, now.value) : ''))
const plainContent = computed(() => {
  if (!record.value) {
    return ''
  }
  return record.value.detail || record.value.summary || ''
})

function formatDate(value) {
  return value ? proxy.parseTime(value) : '-'
}

function stopTimer() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

function clearRendered() {
  record.value = null
  safeHtml.value = ''
}

function tick() {
  now.value = new Date(Date.now() + serverOffset.value)
  if (record.value && record.value.accessMode === 'WECHAT' && isPublicExpired(record.value.expiresAt, now.value)) {
    // 免登录窗口结束：立即清除已渲染正文并改为登录提示
    stopTimer()
    clearRendered()
    loginSubtitle.value = '链接免登录有效期已结束。请登录后使用具备通知记录查询权限的账号继续查看。'
    state.value = 'login'
  }
}

function startTimer() {
  stopTimer()
  tick()
  if (state.value === 'ready') {
    timer = setInterval(tick, 1000)
  }
}

async function load() {
  const sequence = ++loadSequence
  stopTimer()
  clearRendered()
  serverOffset.value = 0
  loginSubtitle.value = DEFAULT_LOGIN_SUBTITLE
  authFailed.value = false
  state.value = 'loading'

  const token = String(route.params.token || '')
  if (!isValidNotificationToken(token)) {
    state.value = 'invalid'
    return
  }

  try {
    const response = await getNotificationDetail(token)
    if (sequence !== loadSequence) {
      return
    }
    const data = response.data || {}
    record.value = data
    serverOffset.value = serverTimeOffset(data.serverTime, new Date())
    now.value = new Date(Date.now() + serverOffset.value)
    safeHtml.value = data.messageType === 'CARD' ? renderNotificationMarkdown(data.detail || '') : ''
    state.value = 'ready'
    document.title = (data.title || '通知详情') + ' - weishanHub'
    startTimer()
  } catch (error) {
    if (sequence !== loadSequence) {
      return
    }
    clearRendered()
    const code = error && typeof error === 'object' ? error.code : null
    if (code === 401) {
      authFailed.value = true
      loginSubtitle.value = '该链接需要在微信 / 企业微信内打开，或登录后由具备通知记录查询权限的账号查看。'
      state.value = 'login'
    } else if (code === 403) {
      state.value = 'forbidden'
    } else if (code === 404) {
      state.value = 'invalid'
    } else {
      state.value = 'error'
    }
  }
}

function goLogin() {
  // 只有接口已确认 401 且用户主动点击登录时才清理失效登录态；
  // 正常微信免登录查看不会触碰有效 token。
  if (authFailed.value) {
    removeToken()
    const userStore = useUserStore()
    userStore.token = ''
    userStore.roles = []
    userStore.permissions = []
    authFailed.value = false
  }
  router.push(buildLoginRedirect(route.fullPath))
}

function goHome() {
  router.push('/index')
}

watch(
  () => route.params.token,
  () => {
    if (route.name === 'NotificationPublicDetail') {
      load()
    }
  }
)

onMounted(() => {
  originalTitle = document.title
  referrerMeta = document.createElement('meta')
  referrerMeta.setAttribute('name', 'referrer')
  referrerMeta.setAttribute('content', 'no-referrer')
  document.head.appendChild(referrerMeta)
  robotsMeta = document.createElement('meta')
  robotsMeta.setAttribute('name', 'robots')
  robotsMeta.setAttribute('content', 'noindex, nofollow, noarchive')
  document.head.appendChild(robotsMeta)
  load()
})

onBeforeUnmount(() => {
  loadSequence++
  stopTimer()
  clearRendered()
  document.title = originalTitle
  if (referrerMeta && referrerMeta.parentNode) {
    referrerMeta.parentNode.removeChild(referrerMeta)
  }
  referrerMeta = null
  if (robotsMeta && robotsMeta.parentNode) {
    robotsMeta.parentNode.removeChild(robotsMeta)
  }
  robotsMeta = null
})
</script>

<style scoped>
.notification-page {
  min-height: 100vh;
  padding: 40px 20px;
  box-sizing: border-box;
  background:
    radial-gradient(circle at 15% 10%, rgba(64, 158, 255, 0.16), transparent 34%),
    radial-gradient(circle at 85% 90%, rgba(103, 194, 58, 0.1), transparent 30%),
    #f5f7fa;
  display: flex;
  justify-content: center;
  align-items: flex-start;
}

.notification-card {
  width: min(860px, 100%);
  min-height: 320px;
  padding: 28px 34px 30px;
  box-sizing: border-box;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 18px 54px rgba(30, 54, 90, 0.12);
}

.notification-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 22px;
  color: #606266;
  font-size: 14px;
  letter-spacing: 0.02em;
}

.notification-brand__mark {
  display: inline-flex;
  width: 30px;
  height: 30px;
  border-radius: 9px;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 700;
  background: linear-gradient(135deg, #409eff, #337ecc);
}

.notification-loading {
  padding: 10px 2px;
}

.notification-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.notification-title {
  margin: 0 0 12px;
  color: #1f2d3d;
  font-size: 30px;
  line-height: 1.35;
  word-break: break-word;
}

.notification-summary {
  margin: 0 0 14px;
  padding: 12px 14px;
  border-left: 3px solid #409eff;
  border-radius: 4px;
  background: #f4f8ff;
  color: #5b6573;
  font-size: 15px;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
}

.notification-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 22px;
  color: #909399;
  font-size: 13px;
  line-height: 1.6;
}

.notification-expired-alert {
  margin-top: 20px;
}

.notification-markdown {
  margin-top: 24px;
  color: #303133;
  font-size: 16px;
  line-height: 1.8;
  word-break: break-word;
  overflow-wrap: anywhere;
}

.notification-markdown :deep(h1),
.notification-markdown :deep(h2),
.notification-markdown :deep(h3) {
  color: #1f2d3d;
  line-height: 1.4;
}

.notification-markdown :deep(pre) {
  padding: 14px;
  border-radius: 8px;
  background: #f5f7fa;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-word;
}

.notification-markdown :deep(code) {
  font-family: Consolas, Monaco, 'Courier New', monospace;
  font-size: 0.92em;
}

.notification-markdown :deep(a) {
  color: #337ecc;
  text-decoration: underline;
}

.notification-markdown :deep(blockquote) {
  margin: 0;
  padding: 8px 14px;
  border-left: 3px solid #dcdfe6;
  background: #fafafa;
  color: #606266;
}

.notification-markdown :deep(table) {
  width: 100%;
  border-collapse: collapse;
}

.notification-markdown :deep(th),
.notification-markdown :deep(td) {
  padding: 8px 10px;
  border: 1px solid #ebeef5;
  text-align: left;
}

.notification-text {
  margin: 24px 0 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: #303133;
  font-family: inherit;
  font-size: 16px;
  line-height: 1.8;
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: anywhere;
}

.notification-footer {
  margin-top: 32px;
  padding-top: 16px;
  border-top: 1px solid #ebeef5;
  color: #a8abb2;
  font-size: 12px;
  line-height: 1.7;
}

@media (max-width: 640px) {
  .notification-page {
    padding: 12px 10px;
    align-items: stretch;
  }

  .notification-card {
    min-height: calc(100vh - 24px);
    padding: 20px 18px 22px;
    border-radius: 12px;
    box-shadow: 0 8px 24px rgba(30, 54, 90, 0.1);
  }

  .notification-title {
    font-size: 23px;
  }

  .notification-markdown,
  .notification-text {
    font-size: 15px;
  }
}
</style>
