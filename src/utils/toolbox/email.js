/** 邮箱地址规范化与基础校验；不发送邮件，不查询 DNS。 */

const LOCAL_PATTERN = /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~.-]+$/

export function normalizeEmail(input, options = {}) {
  const {
    trim = true,
    lowerLocal = false,
    lowerDomain = true,
    removePlusTag = false,
    removeGmailDots = false
  } = options
  let email = String(input ?? '')
  const changes = []
  const warnings = []
  if (trim && email !== email.trim()) {
    email = email.trim()
    changes.push('去除首尾空白')
  }
  if (!email) throw new Error('请输入邮箱地址')
  if (/\s/.test(email)) throw new Error('邮箱地址不能包含空白字符')
  const at = email.lastIndexOf('@')
  if (at <= 0 || at !== email.indexOf('@')) throw new Error('邮箱地址必须且只能包含一个 @')
  let local = email.slice(0, at)
  let domain = email.slice(at + 1)
  if (!local) throw new Error('邮箱地址缺少本地部分')
  if (!domain) throw new Error('邮箱地址缺少域名')
  if (local.length > 64) throw new Error('邮箱本地部分不能超过 64 个字符')
  if (!LOCAL_PATTERN.test(local)) throw new Error('邮箱本地部分包含不支持的字符（当前仅支持 ASCII 常用字符）')
  if (local.startsWith('.') || local.endsWith('.') || local.includes('..')) {
    throw new Error('邮箱本地部分的点号位置不合法')
  }
  if (removePlusTag && local.includes('+')) {
    const next = local.slice(0, local.indexOf('+'))
    if (!next) throw new Error('移除加号标签后本地部分为空')
    local = next
    changes.push('移除本地部分的加号标签')
  }
  if (lowerLocal) {
    const next = local.toLowerCase()
    if (next !== local) {
      local = next
      changes.push('本地部分转为小写')
    }
  }
  if (lowerDomain) {
    const next = domain.toLowerCase()
    if (next !== domain) {
      domain = next
      changes.push('域名转为小写')
    }
  }
  if (/\s/.test(domain)) throw new Error('域名不能包含空白字符')
  let asciiDomain
  try {
    const url = new URL(`https://${domain}`)
    if (url.pathname !== '/' || url.search || url.hash || url.port || url.username || url.password) {
      throw new Error('域名包含非法字符')
    }
    asciiDomain = url.hostname
  } catch {
    throw new Error('域名格式不合法')
  }
  if (asciiDomain.length > 253) throw new Error('域名不能超过 253 个字符')
  const labels = asciiDomain.split('.')
  if (labels.some((label) => !label || label.length > 63 || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(label))) {
    throw new Error('域名标签格式不合法')
  }
  if (labels.length < 2) warnings.push('域名没有点号，可能是内网域名。')
  if (labels.length >= 2 && labels[labels.length - 1].length < 2) warnings.push('顶级域名长度异常，请确认。')
  const hadNonAscii = /[^\x00-\x7F]/.test(domain)
  if (hadNonAscii || lowerDomain) {
    if (asciiDomain !== domain) changes.push(hadNonAscii ? '国际化域名转换为 Punycode' : '域名转为小写/Punycode')
    domain = asciiDomain
  }
  const isGmail = ['gmail.com', 'googlemail.com'].includes(domain)
  if (removeGmailDots) {
    if (!isGmail) {
      warnings.push('Gmail 点号移除仅适用于 gmail.com/googlemail.com，已跳过。')
    } else if (local.includes('.')) {
      local = local.replace(/\./g, '')
      changes.push('移除 Gmail 本地部分点号')
    }
  }
  return {
    email: `${local}@${domain}`,
    local,
    domain,
    isGmail,
    valid: true,
    changes,
    warnings
  }
}
