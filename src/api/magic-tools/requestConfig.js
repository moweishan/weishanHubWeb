import request from '@/utils/request'

// 查询请求配置列表
export function listRequestConfig(query) {
  return request({
    url: '/tool/stress/config/list',
    method: 'get',
    params: query
  })
}

// 查询请求配置详情
export function getRequestConfig(configId) {
  return request({
    url: '/tool/stress/config/' + configId,
    method: 'get'
  })
}

// 新增请求配置
export function addRequestConfig(data) {
  return request({
    url: '/tool/stress/config',
    method: 'post',
    data: data
  })
}

// 修改请求配置
export function updateRequestConfig(data) {
  return request({
    url: '/tool/stress/config',
    method: 'put',
    data: data
  })
}

// 删除请求配置
export function delRequestConfig(configIds) {
  return request({
    url: '/tool/stress/config/' + configIds,
    method: 'delete'
  })
}

// 批量试活：按条件（或 configIds）逐个探测接口，失效接口标记为失效状态
export function probeRequestConfig(data) {
  return request({
    url: '/tool/stress/config/probe',
    method: 'post',
    data: data
  })
}

// 查询试活进度
export function getProbeProgress() {
  return request({
    url: '/tool/stress/config/probe/progress',
    method: 'get'
  })
}

// 停止试活
export function stopProbe() {
  return request({
    url: '/tool/stress/config/probe/stop',
    method: 'post'
  })
}

// 一键停用全部试活失效的配置
export function disableDeadConfig() {
  return request({
    url: '/tool/stress/config/disable-dead',
    method: 'put'
  })
}
