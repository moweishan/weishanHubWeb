import request from '@/utils/request'

// 通知渠道分页列表
export function listChannel(query) {
  return request({
    url: '/notification/channel/list',
    method: 'get',
    params: query
  })
}

// 通知渠道下拉选项（记录页筛选使用）
export function channelOptions() {
  return request({
    url: '/notification/channel/options',
    method: 'get'
  })
}

// 通知渠道详情（不返回 Secret）
export function getChannel(channelId) {
  return request({
    url: '/notification/channel/' + channelId,
    method: 'get'
  })
}

// 所有路径共用的详情页地址（无编辑权限也可查看）
export function getDetailUrl() {
  return request({
    url: '/notification/channel/detail-url',
    method: 'get'
  })
}

// 保存统一详情页地址，仅影响后续新通知
export function updateDetailUrl(url) {
  return request({
    url: '/notification/channel/detail-url',
    method: 'put',
    data: { url },
    headers: { repeatSubmit: false }
  })
}

// 新增通知渠道
export function addChannel(data) {
  return request({
    url: '/notification/channel',
    method: 'post',
    data,
    headers: { repeatSubmit: false }
  })
}

// 修改通知渠道
export function updateChannel(channelId, data) {
  return request({
    url: '/notification/channel/' + channelId,
    method: 'put',
    data,
    headers: { repeatSubmit: false }
  })
}

// 删除通知渠道
export function delChannel(channelIds) {
  return request({
    url: '/notification/channel/' + channelIds,
    method: 'delete',
    headers: { repeatSubmit: false }
  })
}
