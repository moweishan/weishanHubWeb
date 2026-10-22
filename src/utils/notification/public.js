/**
 * 通知公共详情的前端纯函数，便于单元测试。
 */

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{40,64}$/

/** 详情票据应为 256 bit 随机值的 URL-safe Base64 形式 */
export function isValidNotificationToken(token) {
  return typeof token === 'string' && TOKEN_PATTERN.test(token)
}

/** 是否已到/超过免登录截止时间（等于截止时间即过期） */
export function isPublicExpired(expiresAt, now = new Date()) {
  const expiry = toDate(expiresAt)
  const current = toDate(now)
  if (!expiry || !current) {
    return true
  }
  return current.getTime() >= expiry.getTime()
}

/** 剩余时间文本；过期返回“已过期” */
export function formatRemaining(expiresAt, now = new Date()) {
  const expiry = toDate(expiresAt)
  const current = toDate(now)
  if (!expiry || !current || current.getTime() >= expiry.getTime()) {
    return '已过期'
  }
  const totalSeconds = Math.floor((expiry.getTime() - current.getTime()) / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const pad = (value) => String(value).padStart(2, '0')
  return hours > 0
    ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`
}

/** 登录后回到当前详情页；只接受站内路径，避免开放重定向 */
export function buildLoginRedirect(fullPath) {
  const target = typeof fullPath === 'string' && fullPath.startsWith('/') && !fullPath.startsWith('//')
    ? fullPath
    : '/'
  return `/login?redirect=${encodeURIComponent(target)}`
}

/** 解析服务端日期字符串；失败返回 null */
export function toDate(value) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }
  if (typeof value !== 'string' && typeof value !== 'number') {
    return null
  }
  const normalized = typeof value === 'string' ? value.replace(/-/g, '/').replace('T', ' ') : value
  const date = new Date(normalized)
  return Number.isNaN(date.getTime()) ? null : date
}

/** 服务端时间与本地时间的偏差，用于倒计时校正 */
export function serverTimeOffset(serverTime, localNow = new Date()) {
  const server = toDate(serverTime)
  const local = toDate(localNow)
  if (!server || !local) {
    return 0
  }
  return server.getTime() - local.getTime()
}
