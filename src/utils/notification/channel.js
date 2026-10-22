/**
 * 通知渠道前端纯函数：provider 中文标签、摘要、只读详情字段与统一详情页地址校验。
 *
 * 新增 provider 时只需在这里登记 label / summary / detailFields，通用表格、抽屉和
 * 未知类型兜底都从同一入口读取，避免把企业微信字段散落到通用表头。
 */

export const PROVIDER_WECOM_APP = 'WECOM_APP'

const PROVIDER_REGISTRY = {
  [PROVIDER_WECOM_APP]: {
    label: '企业微信应用',
    summary(channel) {
      return `应用${channel.agentId || '未配置'} · ${recipientSummary(channel.toUser)} · ${secretSummary(channel)}`
    },
    detailFields(channel) {
      return [
        { label: 'CorpID', value: channel.corpId || '未配置' },
        { label: 'AgentID', value: channel.agentId || '未配置' },
        { label: '接收 UserID', value: recipientDisplay(channel.toUser) },
        { label: 'Secret 状态', value: channel.secretConfigured ? '已配置' : '未配置' }
      ]
    }
  }
}

export function providerMeta(provider) {
  const key = String(provider || '').trim().toUpperCase()
  return PROVIDER_REGISTRY[key] || null
}

export function providerLabel(provider) {
  const meta = providerMeta(provider)
  return meta ? meta.label : '未知类型'
}

export function providerSummary(channel) {
  const meta = providerMeta(channel && channel.provider)
  return meta ? meta.summary(channel) : '暂不支持的渠道类型'
}

export function providerDetailFields(channel) {
  const meta = providerMeta(channel && channel.provider)
  return meta ? meta.detailFields(channel) : [{ label: '渠道类型', value: '暂不支持' }]
}

export function providerDetailTitle(provider) {
  const meta = providerMeta(provider)
  return meta ? `${meta.label}专属字段` : '渠道专属字段'
}

export function providerOptions() {
  return Object.keys(PROVIDER_REGISTRY).map(value => ({ value, label: PROVIDER_REGISTRY[value].label }))
}

export function isWeComProvider(provider) {
  return String(provider || '').trim().toUpperCase() === PROVIDER_WECOM_APP
}

export function recipientSummary(toUser) {
  const users = splitRecipients(toUser)
  if (users.some(isAllRecipient)) {
    return '接收全体成员'
  }
  return users.length ? `接收${users.length}人` : '接收人未配置'
}

export function recipientDisplay(toUser) {
  const users = splitRecipients(toUser)
  if (!users.length) {
    return '未配置'
  }
  if (users.some(isAllRecipient)) {
    return '全体成员（@all）'
  }
  return users.join('、')
}

export function detailUrlSourceLabel(source) {
  if (source === 'DATABASE') return '页面设置'
  if (source === 'CONFIG') return '配置文件回退'
  return '未配置'
}

/**
 * 与后端 NotificationUrlService 保持一致：
 * - 绝对 http/https；http 仅 localhost / 127.0.0.1 / ::1；
 * - 可带部署子路径和端口，去除末尾斜杠；
 * - 拒绝 userinfo、query、fragment、空白/控制字符、空值和超长地址。
 */
export function normalizeDetailBaseUrl(raw) {
  if (typeof raw !== 'string' || !raw.trim()) {
    return invalid('详情页地址不能为空')
  }
  if (raw.length > 500) {
    return invalid('详情页地址不能超过 500 个字符')
  }
  if (/[\s\u0000-\u001F\u007F]/.test(raw)) {
    return invalid('详情页地址不能包含空格或控制字符')
  }

  let base = raw
  while (base.endsWith('/')) {
    base = base.slice(0, -1)
  }
  if (!base) {
    return invalid('详情页地址不能为空')
  }
  if (/[?#]/.test(base)) {
    return invalid('详情页地址不能包含查询参数或锚点')
  }

  let parsed
  try {
    parsed = new URL(base)
  } catch (error) {
    return invalid('详情页地址不是合法 URL')
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return invalid('详情页地址只支持 http 或 https 协议')
  }
  if (parsed.username || parsed.password) {
    return invalid('详情页地址不能包含用户名或密码')
  }
  if (parsed.search || parsed.hash) {
    return invalid('详情页地址不能包含查询参数或锚点')
  }
  if (!parsed.hostname) {
    return invalid('详情页地址必须是包含主机名的绝对地址')
  }
  if (parsed.protocol === 'http:' && !isLocalHost(parsed.hostname)) {
    return invalid('详情页地址必须使用 https（仅 localhost / 127.0.0.1 / ::1 本地测试允许 http）')
  }
  return { valid: true, value: base, error: '' }
}

function invalid(error) {
  return { valid: false, value: '', error }
}

function isLocalHost(hostname) {
  const host = String(hostname || '').toLowerCase()
  return host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '[::1]'
}

function splitRecipients(toUser) {
  return String(toUser || '')
    .split(/[|,，;；]/)
    .map(item => item.trim())
    .filter(Boolean)
}

function isAllRecipient(user) {
  const normalized = String(user || '').trim().toLowerCase()
  return normalized === '@all' || normalized === 'all'
}

function secretSummary(channel) {
  return channel.secretConfigured ? '密钥已配置' : '密钥未配置'
}
