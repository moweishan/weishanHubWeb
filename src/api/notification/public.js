import request from '@/utils/request'

/**
 * 公共通知详情。
 *
 * - 通过统一请求器，自动携带现有系统 token（供过期后已登录有权限者查看）
 * - skipAuthHandler：401 时不弹全局“重新登录”确认框，由详情页展示登录链接
 * - 不把 token 放入查询参数、不持久化正文
 */
export function getNotificationDetail(token) {
  return request({
    url: '/notification/detail/' + encodeURIComponent(token),
    method: 'get',
    skipAuthHandler: true
  })
}
