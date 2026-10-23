<template>
  <el-card class="workbench-card weather-card" shadow="never" v-loading="loading">
    <template #header>
      <div class="card-head">
        <div class="card-title-group">
          <span class="card-icon"><el-icon><Sunny /></el-icon></span>
          <div>
            <div class="card-title">天气</div>
            <div class="card-sub">{{ configured ? '中国大陆 · 高德天气' : '高德 Web 服务未配置' }}</div>
          </div>
        </div>
        <div class="card-actions">
          <el-button link icon="Refresh" :loading="loading" @click="loadWeather">刷新</el-button>
          <el-button v-if="configured" link icon="Location" @click="openPicker">切换城市</el-button>
          <el-button v-if="manualCity" link icon="RefreshLeft" @click="useAuto">自动定位</el-button>
        </div>
      </div>
    </template>

    <div v-if="networkError" class="state-block">
      <el-icon class="state-icon"><WarningFilled /></el-icon>
      <div class="state-title">天气加载失败</div>
      <div class="state-text">{{ networkError }}</div>
      <el-button type="primary" plain @click="loadWeather">重试</el-button>
    </div>

    <div v-else-if="!data && loading" class="weather-skeleton">
      <el-skeleton :rows="3" animated />
    </div>

    <div v-else-if="data && data.status === 'NO_KEY'" class="state-block">
      <el-icon class="state-icon"><WarningFilled /></el-icon>
      <div class="state-title">天气服务未配置</div>
      <div class="state-text">{{ data.message }}</div>
      <el-tag type="info" effect="plain">需要后端配置高德 Web 服务 Key</el-tag>
    </div>

    <div v-else-if="data && (data.status === 'UNSUPPORTED_IP' || data.status === 'LOCATE_FAILED')" class="state-block">
      <el-icon class="state-icon"><Location /></el-icon>
      <div class="state-title">{{ data.status === 'UNSUPPORTED_IP' ? '无法自动定位' : '自动定位失败' }}</div>
      <div class="state-text">{{ data.message }}</div>
      <div class="state-actions">
        <el-button type="primary" @click="openPicker">手动选择城市</el-button>
        <el-button plain @click="loadWeather">重新定位</el-button>
      </div>
    </div>

    <div v-else-if="data && data.status === 'WEATHER_FAILED'" class="state-block">
      <el-icon class="state-icon"><WarningFilled /></el-icon>
      <div class="state-title">{{ displayCity ? displayCity + ' · ' : '' }}天气暂不可用</div>
      <div class="state-text">{{ data.message }}</div>
      <div class="state-actions">
        <el-button type="primary" plain @click="loadWeather">重试</el-button>
        <el-button v-if="configured" plain @click="openPicker">切换城市</el-button>
        <el-button v-if="manualCity" link @click="useAuto">恢复自动定位</el-button>
      </div>
    </div>

    <div v-else-if="data && data.weather" class="weather-content">
      <div class="weather-main">
        <div class="weather-glyph">
          <el-icon><component :is="iconComponent" /></el-icon>
        </div>
        <div class="weather-temp">
          {{ data.weather.temperature || '--' }}<span class="degree">°</span>
        </div>
        <div class="weather-summary">
          <div class="weather-city">
            <span>{{ displayCity }}</span>
            <el-tag v-if="modeLabel" size="small" effect="plain" :type="data.locationMode === 'IP' ? 'success' : 'warning'">
              {{ modeLabel }}
            </el-tag>
          </div>
          <div class="weather-desc">{{ data.weather.weather }}</div>
          <div class="weather-range">
            今日最低 {{ data.weather.minTemperature || '--' }}° · 最高 {{ data.weather.maxTemperature || '--' }}°
          </div>
        </div>
      </div>

      <div class="weather-details">
        <div class="detail-item">
          <span class="detail-label">湿度</span>
          <span>{{ formatHumidity(data.weather.humidity) }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">风向</span>
          <span>{{ data.weather.windDirection || '--' }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">风力</span>
          <span>{{ data.weather.windPower ? data.weather.windPower + ' 级' : '--' }}</span>
        </div>
      </div>

      <div class="weather-footer">
        <span>来源：{{ data.source || '高德地图' }}</span>
        <span>更新时间：{{ data.weather.reportTime || data.weather.fetchedAt || data.updatedAt || '--' }}</span>
      </div>
    </div>

    <el-dialog
      v-model="pickerVisible"
      title="选择城市"
      width="min(560px, 92vw)"
      append-to-body
      :close-on-click-modal="false"
    >
      <div v-if="!configured" class="picker-tip">
        高德 Web 服务 Key 未配置，暂时不能搜索城市。请联系管理员在服务端配置。
      </div>
      <div class="picker-search">
        <el-input
          v-model="keyword"
          placeholder="搜索城市或区县，例如：杭州、西湖区"
          clearable
          :disabled="!configured"
          @keyup.enter="searchCity"
        />
        <el-button type="primary" :loading="searchLoading" :disabled="!configured" @click="searchCity">搜索</el-button>
      </div>
      <div class="picker-hint">{{ searchMessage || '按城市或区县名称搜索，选择后查询对应天气' }}</div>
      <div v-if="cityOptions.length" class="city-list">
        <button v-for="city in cityOptions" :key="city.adcode" type="button" class="city-item" @click="selectCity(city)">
          <span>{{ city.label || city.name }}</span>
          <span class="city-adcode">{{ city.adcode }}</span>
        </button>
      </div>
      <el-empty v-else-if="searched && !searchLoading" :description="searchMessage || '没有匹配结果'" :image-size="54" />
      <template #footer>
        <el-button @click="pickerVisible = false">取消</el-button>
        <el-button v-if="manualCity" @click="useAuto">恢复自动定位</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import {
  Cloudy,
  Drizzling,
  Lightning,
  Location,
  MostlyCloudy,
  PartlyCloudy,
  Pouring,
  Sunny,
  WarningFilled
} from '@element-plus/icons-vue'
import { getHomeWeather, searchHomeCities } from '@/api/home'
import { weatherIconName } from '../workbench'

const iconMap = {
  Sunny,
  Cloudy,
  PartlyCloudy,
  Drizzling,
  Pouring,
  Lightning,
  MostlyCloudy
}

const loading = ref(false)
const networkError = ref('')
const data = ref(null)
const manualCity = ref(null)
const pickerVisible = ref(false)
const keyword = ref('')
const searchLoading = ref(false)
const searchMessage = ref('')
const cityOptions = ref([])
const searched = ref(false)

const configured = computed(() => (data.value ? data.value.configured !== false : true))
const locationMode = computed(() => {
  if (data.value && data.value.locationMode) {
    return data.value.locationMode
  }
  return manualCity.value ? 'MANUAL' : ''
})
const modeLabel = computed(() => {
  if (locationMode.value === 'IP') return 'IP 自动定位'
  if (locationMode.value === 'MANUAL') return '手动选择'
  return ''
})
const displayCity = computed(() => {
  if (data.value && data.value.city && data.value.city.name) {
    return data.value.city.name
  }
  return manualCity.value ? manualCity.value.name : ''
})
const iconComponent = computed(() => {
  const name = weatherIconName(data.value && data.value.weather ? data.value.weather.weather : '')
  return iconMap[name] || Cloudy
})

onMounted(loadWeather)

async function loadWeather() {
  loading.value = true
  networkError.value = ''
  try {
    const res = await getHomeWeather(manualCity.value ? manualCity.value.adcode : '')
    data.value = res.data || null
  } catch (error) {
    data.value = null
    networkError.value = '天气服务请求失败，请稍后重试。'
  } finally {
    loading.value = false
  }
}

function openPicker() {
  if (!configured.value) {
    return
  }
  pickerVisible.value = true
  keyword.value = ''
  searchMessage.value = ''
  cityOptions.value = []
  searched.value = false
}

async function searchCity() {
  const value = keyword.value.trim()
  if (!value) {
    searchMessage.value = '请输入城市或区县名称'
    cityOptions.value = []
    searched.value = false
    return
  }
  searchLoading.value = true
  searchMessage.value = ''
  searched.value = false
  try {
    const res = await searchHomeCities(value)
    const result = res.data || {}
    cityOptions.value = Array.isArray(result.cities) ? result.cities : []
    searchMessage.value = result.message || ''
    searched.value = true
  } catch (error) {
    cityOptions.value = []
    searchMessage.value = '城市搜索失败，请稍后重试。'
    searched.value = true
  } finally {
    searchLoading.value = false
  }
}

function selectCity(city) {
  manualCity.value = {
    adcode: city.adcode,
    name: city.name,
    label: city.label || city.name
  }
  pickerVisible.value = false
  loadWeather()
}

function useAuto() {
  manualCity.value = null
  pickerVisible.value = false
  loadWeather()
}

function formatHumidity(value) {
  return value ? value + '%' : '--'
}
</script>

<style scoped>
.weather-card {
  min-height: 236px;
  background-color: var(--el-bg-color-overlay);
  background-image: linear-gradient(135deg, rgba(64, 158, 255, 0.08) 0%, transparent 58%);
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
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-8);
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

.card-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 2px;
}

.weather-content {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.weather-main {
  display: flex;
  align-items: center;
  gap: 18px;
}

.weather-glyph {
  flex: 0 0 auto;
  color: var(--el-color-primary);
  font-size: 64px;
  line-height: 1;
}

.weather-temp {
  flex: 0 0 auto;
  font-size: 52px;
  line-height: 1;
  font-weight: 300;
  letter-spacing: -3px;
  color: var(--el-text-color-primary);
}

.weather-temp .degree {
  font-size: 28px;
  vertical-align: top;
  letter-spacing: 0;
}

.weather-summary {
  min-width: 0;
}

.weather-city {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 18px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.weather-desc {
  margin-top: 5px;
  font-size: 14px;
  color: var(--el-text-color-regular);
}

.weather-range {
  margin-top: 5px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.weather-details {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--el-fill-color-light);
  font-size: 13px;
  color: var(--el-text-color-primary);
}

.detail-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.weather-footer {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 6px;
  padding-top: 2px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.state-block {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  padding: 14px 4px 8px;
}

.state-icon {
  font-size: 28px;
  color: var(--el-color-warning);
}

.state-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.state-text {
  max-width: 720px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--el-text-color-secondary);
}

.state-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.weather-skeleton {
  padding-top: 8px;
}

.picker-search {
  display: flex;
  gap: 8px;
}

.picker-hint {
  margin: 10px 0;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.picker-tip {
  margin-bottom: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--el-text-color-regular);
  background: var(--el-fill-color-light);
}

.city-list {
  display: flex;
  flex-direction: column;
  max-height: 320px;
  overflow: auto;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 10px;
}

.city-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 11px 14px;
  border: 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
  background: transparent;
  color: var(--el-text-color-primary);
  font-size: 14px;
  text-align: left;
  cursor: pointer;
}

.city-item:last-child {
  border-bottom: 0;
}

.city-item:hover {
  background: var(--el-fill-color-light);
}

.city-adcode {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

@media (max-width: 640px) {
  .weather-main {
    gap: 12px;
  }

  .weather-glyph {
    font-size: 48px;
  }

  .weather-temp {
    font-size: 42px;
  }

  .weather-details {
    grid-template-columns: 1fr;
  }

  .card-head {
    align-items: flex-start;
  }

  .card-actions {
    justify-content: flex-start;
  }
}
</style>
