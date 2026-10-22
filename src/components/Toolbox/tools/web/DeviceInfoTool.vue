<template>
  <ToolPage
    title="设备与浏览器信息"
    description="只读取当前浏览器公开的 UA、屏幕、语言、时区、硬件并发与网络提示，不采集 Canvas/WebGL/字体指纹，不上传任何数据。"
    category="web"
  >
    <div class="toolbox-panel">
      <div class="toolbox-inline">
        <el-button type="primary" icon="Refresh" @click="refresh">刷新信息</el-button>
        <span class="toolbox-hint">部分字段依赖浏览器权限或实现，可能显示“不可用”。</span>
      </div>
    </div>

    <ToolResult
      label="本机浏览器信息"
      :text="jsonText"
      :rows="rows"
      :error="error"
      :warning="warning"
      filename="device-info.json"
    />
  </ToolPage>
</template>

<script setup>
import ToolPage from '@/components/Toolbox/ToolPage.vue'
import ToolResult from '@/components/Toolbox/ToolResult.vue'
import { parseUserAgent } from '@/utils/toolbox/web'

const rows = ref([])
const error = ref('')
const warning = '这些信息由浏览器与操作系统提供，可能暴露设备型号与浏览器版本，分享前请自行评估。'
const jsonText = computed(() => JSON.stringify(Object.fromEntries(rows.value.map((row) => [row.label, row.value])), null, 2))

async function refresh() {
  error.value = ''
  try {
    const nav = navigator
    const screenInfo = window.screen
    const ua = parseUserAgent(nav.userAgent)
    const connection = nav.connection || nav.mozConnection || nav.webkitConnection
    let storage = '不可用'
    try {
      if (nav.storage?.estimate) {
        const estimate = await nav.storage.estimate()
        storage = `${formatStorage(estimate.usage)} / ${formatStorage(estimate.quota)}`
      }
    } catch {
      storage = '不可用'
    }
    const uaData = nav.userAgentData
    const brands = uaData?.brands?.map((item) => `${item.brand} ${item.version}`).join('；') || '不可用'
    rows.value = [
      { label: 'User-Agent', value: nav.userAgent },
      { label: '浏览器', value: `${ua.browser.name} ${ua.browser.version}` },
      { label: '浏览器引擎', value: `${ua.engine.name} ${ua.engine.version}` },
      { label: '操作系统', value: `${ua.os.name} ${ua.os.version}` },
      { label: '设备', value: `${ua.device.vendor} / ${ua.device.model} / ${ua.device.type}` },
      { label: 'CPU 架构', value: ua.cpu.architecture },
      { label: 'UA Client Hints 品牌', value: brands },
      { label: '平台', value: nav.platform || '不可用' },
      { label: '语言', value: nav.language || '不可用' },
      { label: '语言列表', value: (nav.languages || []).join(', ') || '不可用' },
      { label: '时区', value: Intl.DateTimeFormat().resolvedOptions().timeZone || '不可用' },
      { label: '时区偏移', value: `${-new Date().getTimezoneOffset()} 分钟` },
      { label: '屏幕分辨率', value: `${screenInfo.width} × ${screenInfo.height}` },
      { label: '可用屏幕', value: `${screenInfo.availWidth} × ${screenInfo.availHeight}` },
      { label: '窗口内尺寸', value: `${window.innerWidth} × ${window.innerHeight}` },
      { label: '像素比', value: String(window.devicePixelRatio) },
      { label: '颜色深度', value: `${screenInfo.colorDepth} bit` },
      { label: '硬件并发', value: String(nav.hardwareConcurrency || '不可用') },
      { label: '设备内存（GB，提示值）', value: String(nav.deviceMemory || '不可用') },
      { label: '最大触点数', value: String(nav.maxTouchPoints ?? '不可用') },
      { label: 'Cookie 启用', value: nav.cookieEnabled ? '是' : '否' },
      { label: '网络在线', value: nav.onLine ? '是' : '否' },
      { label: '网络类型（提示）', value: connection?.effectiveType || '不可用' },
      { label: '估算下行（Mbps）', value: String(connection?.downlink ?? '不可用') },
      { label: '估算 RTT（ms）', value: String(connection?.rtt ?? '不可用') },
      { label: '省流量模式', value: connection?.saveData === undefined ? '不可用' : connection.saveData ? '开启' : '关闭' },
      { label: '屏幕方向', value: screenInfo.orientation?.type || '不可用' },
      { label: '深色模式偏好', value: window.matchMedia('(prefers-color-scheme: dark)').matches ? '深色' : '浅色' },
      { label: '减少动效偏好', value: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? '开启' : '关闭' },
      { label: '存储用量估算', value: storage }
    ]
  } catch (err) {
    error.value = err.message
  }
}

function formatStorage(value) {
  if (!Number.isFinite(value)) return '未知'
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  if (value < 1024 * 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`
  return `${(value / 1024 / 1024 / 1024).toFixed(2)} GB`
}

onMounted(refresh)
</script>
