import request from '@/utils/request'

// 查询工作台天气；adcode 为空时由后端按当前访问者 IP 自动定位
export function getHomeWeather(adcode) {
  return request({
    url: '/home/weather',
    method: 'get',
    params: adcode ? { adcode } : undefined
  })
}

// 按城市/区县名称搜索高德行政区划
export function searchHomeCities(keyword) {
  return request({
    url: '/home/weather/cities',
    method: 'get',
    params: { keyword }
  })
}

// 当前登录账号的快捷入口
export function getHomeShortcuts() {
  return request({
    url: '/home/shortcuts',
    method: 'get'
  })
}

// 当前登录账号有权限且可导航的站内页面
export function getHomeShortcutOptions() {
  return request({
    url: '/home/shortcuts/options',
    method: 'get'
  })
}

// 覆盖保存快捷入口及顺序
export function saveHomeShortcuts(menuIds) {
  return request({
    url: '/home/shortcuts',
    method: 'put',
    data: { menuIds }
  })
}

// 今日通知父记录统计，后端强制 notification:record:query
export function getTodayNotificationCount() {
  return request({
    url: '/home/notification/today',
    method: 'get'
  })
}
