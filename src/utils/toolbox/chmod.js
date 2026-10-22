/** chmod 八进制 / 符号权限计算。 */

const PERMISSION_BITS = { read: 4, write: 2, execute: 1 }

function emptyState() {
  return {
    special: { setuid: false, setgid: false, sticky: false },
    user: { read: false, write: false, execute: false },
    group: { read: false, write: false, execute: false },
    other: { read: false, write: false, execute: false }
  }
}

function applyOctalDigit(target, digit, specialTarget) {
  target.read = (digit & 4) !== 0
  target.write = (digit & 2) !== 0
  target.execute = (digit & 1) !== 0
  if (specialTarget) {
    specialTarget.setuid = (digit & 4) !== 0
    specialTarget.setgid = (digit & 2) !== 0
    specialTarget.sticky = (digit & 1) !== 0
  }
}

export function parseOctalMode(input) {
  const digits = String(input ?? '').trim().replace(/^0o/i, '')
  if (!/^[0-7]{3,4}$/.test(digits)) throw new Error('八进制权限必须是 3 位或 4 位数字（0-7）')
  const padded = digits.padStart(4, '0')
  const state = emptyState()
  applyOctalDigit(state.user, Number(padded[1]), null)
  applyOctalDigit(state.group, Number(padded[2]), null)
  applyOctalDigit(state.other, Number(padded[3]), null)
  state.special.setuid = (Number(padded[0]) & 4) !== 0
  state.special.setgid = (Number(padded[0]) & 2) !== 0
  state.special.sticky = (Number(padded[0]) & 1) !== 0
  return { ...state, ...formatMode(state) }
}

export function stateToOctal(state) {
  const user = (state.user.read ? 4 : 0) + (state.user.write ? 2 : 0) + (state.user.execute ? 1 : 0)
  const group = (state.group.read ? 4 : 0) + (state.group.write ? 2 : 0) + (state.group.execute ? 1 : 0)
  const other = (state.other.read ? 4 : 0) + (state.other.write ? 2 : 0) + (state.other.execute ? 1 : 0)
  const special =
    (state.special.setuid ? 4 : 0) + (state.special.setgid ? 2 : 0) + (state.special.sticky ? 1 : 0)
  return `${special ? special : ''}${user}${group}${other}`
}

export function formatSymbolic(state) {
  const part = (target, special, specialChar) => {
    const read = target.read ? 'r' : '-'
    const write = target.write ? 'w' : '-'
    let execute = target.execute ? 'x' : '-'
    if (special === 'setuid') execute = target.execute ? 's' : 'S'
    if (special === 'setgid') execute = target.execute ? 's' : 'S'
    if (special === 'sticky') execute = target.execute ? 't' : 'T'
    return `${read}${write}${execute}`
  }
  return [
    part(state.user, state.special.setuid ? 'setuid' : '', 's'),
    part(state.group, state.special.setgid ? 'setgid' : '', 's'),
    part(state.other, state.special.sticky ? 'sticky' : '', 't')
  ].join('')
}

export function formatMode(state) {
  return {
    octal: stateToOctal(state),
    symbolic: formatSymbolic(state)
  }
}

function setPermission(target, permission, enabled) {
  if (permission === 'r') target.read = enabled
  else if (permission === 'w') target.write = enabled
  else if (permission === 'x') target.execute = enabled
}

export function symbolicToState(input) {
  const text = String(input ?? '').trim()
  if (!text) throw new Error('请输入符号权限，例如 u=rwx,g=rx,o=')
  if (/^[rwx-]{9}$/.test(text)) {
    const state = emptyState()
    ;['user', 'group', 'other'].forEach((who, block) => {
      const slice = text.slice(block * 3, block * 3 + 3)
      state[who].read = slice[0] === 'r'
      state[who].write = slice[1] === 'w'
      state[who].execute = slice[2] === 'x'
    })
    return { ...state, ...formatMode(state) }
  }
  const state = emptyState()
  const clauses = text.split(',')
  for (const clause of clauses) {
    const match = /^([ugoa]*)([+\-=])([rwxst]*)$/.exec(clause.trim())
    if (!match) throw new Error(`无法识别符号权限片段：${clause}`)
    const whoText = match[1] || 'a'
    const operation = match[2]
    const permissions = match[3]
    if (!permissions && operation !== '=') throw new Error(`符号权限片段缺少权限位：${clause}`)
    const targets = []
    if (whoText.includes('a')) targets.push('user', 'group', 'other')
    if (whoText.includes('u')) targets.push('user')
    if (whoText.includes('g')) targets.push('group')
    if (whoText.includes('o')) targets.push('other')
    for (const who of new Set(targets)) {
      if (operation === '=') {
        state[who].read = false
        state[who].write = false
        state[who].execute = false
        if (who === 'user') state.special.setuid = false
        if (who === 'group') state.special.setgid = false
        if (who === 'other') state.special.sticky = false
      }
      for (const permission of permissions) {
        if (permission === 's') {
          if (who === 'user') state.special.setuid = operation !== '-'
          else if (who === 'group') state.special.setgid = operation !== '-'
          else throw new Error('s 权限位只能用于 u 或 g')
          continue
        }
        if (permission === 't') {
          if (who !== 'other') throw new Error('t 权限位只能用于 o')
          state.special.sticky = operation !== '-'
          continue
        }
        if (!['r', 'w', 'x'].includes(permission)) throw new Error(`不支持的权限位：${permission}`)
        setPermission(state[who], permission, operation === '-' ? false : true)
      }
    }
  }
  return { ...state, ...formatMode(state) }
}

export function chmodInfo(input) {
  const text = String(input ?? '').trim()
  const state = /^[0-7]{3,4}$/.test(text) ? parseOctalMode(text) : symbolicToState(text)
  return {
    ...state,
    explanation: explainMode(state)
  }
}

export function explainMode(state) {
  const labels = [
    ['user', '所有者'],
    ['group', '所属组'],
    ['other', '其他用户']
  ]
  const parts = labels.map(([key, label]) => {
    const target = state[key]
    const actions = []
    if (target.read) actions.push('读取')
    if (target.write) actions.push('写入')
    if (target.execute) actions.push('执行')
    return `${label}${actions.length ? `可${actions.join('、')}` : '无权限'}`
  })
  if (state.special.setuid) parts.push('setuid（以文件所有者身份执行）')
  if (state.special.setgid) parts.push('setgid（以文件所属组身份执行/继承组）')
  if (state.special.sticky) parts.push('sticky（仅所有者可删除目录内文件）')
  return parts.join('；')
}

export const CHMOD_ACTIONS = Object.freeze([
  { key: 'read', label: '读取 r', bit: 4 },
  { key: 'write', label: '写入 w', bit: 2 },
  { key: 'execute', label: '执行 x', bit: 1 }
])

export { PERMISSION_BITS }
