import request from '@/utils/request'

// 通知记录分页列表
export function listRecord(query) {
  return request({
    url: '/notification/record/list',
    method: 'get',
    params: query
  })
}

// 通知记录详情（含各渠道结果与可复制链接）
export function getRecord(recordId) {
  return request({
    url: '/notification/record/' + recordId,
    method: 'get'
  })
}

// 只重试失败渠道
export function retryRecord(recordId) {
  return request({
    url: '/notification/record/' + recordId + '/retry',
    method: 'post',
    headers: { repeatSubmit: false }
  })
}

// 撤销公共详情链接
export function revokeRecord(recordId) {
  return request({
    url: '/notification/record/' + recordId + '/revoke',
    method: 'put',
    headers: { repeatSubmit: false }
  })
}

// 删除通知记录（软删除）
export function delRecord(recordIds) {
  return request({
    url: '/notification/record/' + recordIds,
    method: 'delete',
    headers: { repeatSubmit: false }
  })
}
