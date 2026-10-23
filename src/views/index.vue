<template>
  <div class="workbench">
    <header class="workbench-head">
      <div>
        <h2 class="workbench-title">个人工作台</h2>
        <p class="workbench-subtitle">
          {{ greeting }}，{{ displayName }}。天气、通知和常用入口都放在这里。
        </p>
      </div>
      <div class="workbench-date">
        <el-icon><Calendar /></el-icon>
        <span>{{ todayText }}</span>
      </div>
    </header>

    <div class="top-grid" :class="{ 'is-single': !showNotification }">
      <home-weather-card />
      <home-notification-card v-if="showNotification" />
    </div>

    <home-shortcuts class="shortcuts-row" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Calendar } from '@element-plus/icons-vue'
import useUserStore from '@/store/modules/user'
import auth from '@/plugins/auth'
import HomeWeatherCard from './home/components/HomeWeatherCard.vue'
import HomeNotificationCard from './home/components/HomeNotificationCard.vue'
import HomeShortcuts from './home/components/HomeShortcuts.vue'

const userStore = useUserStore()

const showNotification = computed(() => auth.hasPermi('notification:record:query'))
const displayName = computed(() => userStore.nickName || userStore.name || '你好')
const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 6) return '夜深了'
  if (hour < 12) return '早上好'
  if (hour < 18) return '下午好'
  return '晚上好'
})
const todayText = computed(() => {
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  }).format(new Date())
})
</script>

<style scoped>
.workbench {
  display: flex;
  flex-direction: column;
  gap: 18px;
  max-width: 1440px;
  margin: 0 auto;
  padding: 20px;
}

.workbench-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
}

.workbench-title {
  margin: 0;
  font-size: 24px;
  line-height: 1.25;
  font-weight: 600;
  letter-spacing: -0.4px;
  color: var(--el-text-color-primary);
}

.workbench-subtitle {
  margin: 7px 0 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--el-text-color-secondary);
}

.workbench-date {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex: 0 0 auto;
  padding: 7px 12px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 999px;
  background: var(--el-bg-color-overlay);
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.top-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr);
  gap: 18px;
  align-items: stretch;
}

.top-grid.is-single {
  grid-template-columns: minmax(0, 1fr);
}

.top-grid > * {
  min-width: 0;
}

.shortcuts-row {
  width: 100%;
}

@media (max-width: 900px) {
  .top-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 640px) {
  .workbench {
    gap: 14px;
    padding: 12px;
  }

  .workbench-head {
    align-items: flex-start;
    flex-direction: column;
    gap: 10px;
  }

  .workbench-title {
    font-size: 20px;
  }
}
</style>
