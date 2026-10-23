<template>
  <el-card
    class="workbench-card notification-card"
    :class="{ 'is-clickable': canJump }"
    shadow="never"
    @click="openRecord"
  >
    <template #header>
      <div class="card-head">
        <div class="card-title-group">
          <span class="card-icon"><el-icon><Bell /></el-icon></span>
          <div>
            <div class="card-title">今日通知</div>
            <div class="card-sub">北京时间今日</div>
          </div>
        </div>
        <el-tag size="small" effect="plain">00:00 - 24:00</el-tag>
      </div>
    </template>

    <div v-if="loading" class="notify-skeleton">
      <el-skeleton :rows="2" animated />
    </div>

    <div v-else-if="error" class="notify-state">
      <el-icon class="state-icon"><WarningFilled /></el-icon>
      <div class="state-text">{{ error }}</div>
      <el-button type="primary" plain size="small" @click.stop="loadStat">重试</el-button>
    </div>

    <div v-else class="notify-content">
      <div class="notify-main">
        <span class="notify-count">{{ stat.count }}</span>
        <span class="notify-unit">条</span>
      </div>
      <div class="notify-label">今日发送成功的通知</div>
      <div class="notify-date">{{ stat.date || '--' }} · 北京时间</div>
      <div v-if="canJump" class="notify-link">
        查看通知记录
        <el-icon><ArrowRight /></el-icon>
      </div>
    </div>
  </el-card>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { ArrowRight, Bell, WarningFilled } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import { getTodayNotificationCount } from '@/api/home'
import auth from '@/plugins/auth'

const router = useRouter()
const loading = ref(false)
const error = ref('')
const stat = ref({ count: 0, date: '', timeZone: 'Asia/Shanghai' })
const canJump = computed(() => auth.hasPermi('notification:record:list'))

onMounted(loadStat)

async function loadStat() {
  loading.value = true
  error.value = ''
  try {
    const res = await getTodayNotificationCount()
    stat.value = res.data || { count: 0, date: '', timeZone: 'Asia/Shanghai' }
  } catch (e) {
    error.value = '今日通知统计加载失败，请稍后重试。'
  } finally {
    loading.value = false
  }
}

function openRecord() {
  if (!canJump.value) {
    return
  }
  router.push({ path: '/notification/record' })
}
</script>

<style scoped>
.notification-card {
  min-height: 236px;
  background: var(--el-bg-color-overlay);
}

.notification-card.is-clickable {
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.notification-card.is-clickable:hover {
  transform: translateY(-2px);
  box-shadow: var(--el-box-shadow-light);
}

.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.card-title-group {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.card-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  color: #b88230;
  background: rgba(230, 162, 60, 0.14);
  font-size: 18px;
}

.card-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.card-sub {
  margin-top: 2px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.notify-content {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-top: 4px;
}

.notify-main {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.notify-count {
  font-size: 54px;
  line-height: 1.05;
  font-weight: 300;
  letter-spacing: -2px;
  color: var(--el-text-color-primary);
}

.notify-unit {
  font-size: 15px;
  color: var(--el-text-color-secondary);
}

.notify-label {
  font-size: 13px;
  color: var(--el-text-color-regular);
}

.notify-date {
  margin-top: 6px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.notify-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 12px;
  font-size: 13px;
  color: var(--el-color-primary);
}

.notify-state {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  padding: 14px 2px 6px;
}

.state-icon {
  font-size: 26px;
  color: var(--el-color-warning);
}

.state-text {
  font-size: 13px;
  line-height: 1.7;
  color: var(--el-text-color-secondary);
}

.notify-skeleton {
  padding-top: 8px;
}

@media (max-width: 640px) {
  .notify-count {
    font-size: 44px;
  }
}
</style>
