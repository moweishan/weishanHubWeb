/**
 * 个人工作台展示辅助函数（无副作用，便于 Node 行为测试）。
 */

export const SHORTCUT_LIMIT = 20

/** 与后端 hasPermi 一致：*:*:* 为全部权限。 */
export function hasPermission(permissions, permission) {
  const list = Array.isArray(permissions) ? permissions : []
  if (!permission) {
    return false
  }
  return list.includes('*:*:*') || list.includes(permission)
}

/** 高德天气文字映射到 Element Plus 图标组件名。 */
export function weatherIconName(text) {
  const value = String(text || '')
  if (value.includes('雷')) return 'Lightning'
  if (value.includes('暴雨') || value.includes('大雨') || value.includes('中雨')) return 'Pouring'
  if (value.includes('雨')) return 'Drizzling'
  if (value.includes('雪')) return 'Cloudy'
  if (value.includes('雾') || value.includes('霾') || value.includes('沙') || value.includes('尘')) return 'MostlyCloudy'
  if (value.includes('阴')) return 'Cloudy'
  if (value.includes('多云')) return 'PartlyCloudy'
  if (value.includes('晴')) return 'Sunny'
  return 'Cloudy'
}

/** 快捷入口编辑抽屉搜索：匹配标题、完整路由和父级目录。 */
export function filterShortcutOptions(options, keyword) {
  const list = Array.isArray(options) ? options : []
  const value = String(keyword || '').trim().toLowerCase()
  if (!value) {
    return list.slice()
  }
  return list.filter(item => {
    const breadcrumb = Array.isArray(item.breadcrumb) ? item.breadcrumb.join(' / ') : ''
    return [item.title, item.path, breadcrumb]
      .some(field => String(field || '').toLowerCase().includes(value))
  })
}

/** 构造站内路由目标，保留菜单配置的 query。 */
export function shortcutRoute(item) {
  if (!item || !item.path) {
    return null
  }
  const query = item.query && typeof item.query === 'object' ? item.query : null
  if (query && Object.keys(query).length > 0) {
    return { path: item.path, query }
  }
  return { path: item.path }
}
