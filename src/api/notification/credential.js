import request from '@/utils/request'

// 调用凭证分页列表（不含哈希/明文）
export function listCredential(query) {
  return request({
    url: '/notification/credential/list',
    method: 'get',
    params: query
  })
}

// 调用凭证详情（不含哈希/明文）
export function getCredential(credentialId) {
  return request({
    url: '/notification/credential/' + credentialId,
    method: 'get'
  })
}

// 创建凭证：响应中的 apiKey 仅出现这一次
export function addCredential(data) {
  return request({
    url: '/notification/credential',
    method: 'post',
    data,
    headers: { repeatSubmit: false }
  })
}

// 修改凭证名称/启用状态
export function updateCredential(credentialId, data) {
  return request({
    url: '/notification/credential/' + credentialId,
    method: 'put',
    data,
    headers: { repeatSubmit: false }
  })
}

// 重置凭证：新 apiKey 仅出现这一次，旧 Key 立即失效
export function resetCredential(credentialId) {
  return request({
    url: '/notification/credential/' + credentialId + '/reset',
    method: 'put',
    headers: { repeatSubmit: false }
  })
}

// 删除凭证
export function delCredential(credentialIds) {
  return request({
    url: '/notification/credential/' + credentialIds,
    method: 'delete',
    headers: { repeatSubmit: false }
  })
}
