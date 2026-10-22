/** 正则执行核心。必须放在 Worker 中调用，避免灾难性回溯阻塞界面。 */

const ALLOWED_FLAGS = new Set(['g', 'i', 'm', 's', 'u', 'y'])
const MAX_MATCHES = 1000

export function executeRegex({ pattern, flags = '', text = '', replacement } = {}) {
  const source = String(pattern ?? '')
  if (!source) throw new Error('请输入正则表达式')
  const flagText = String(flags ?? '')
  const seen = new Set()
  for (const flag of flagText) {
    if (!ALLOWED_FLAGS.has(flag)) throw new Error(`不支持的标志：${flag}`)
    if (seen.has(flag)) throw new Error(`标志重复：${flag}`)
    seen.add(flag)
  }
  let regex
  try {
    regex = new RegExp(source, flagText)
  } catch (error) {
    throw new Error(`正则语法错误：${error.message}`)
  }
  const input = String(text ?? '')
  const matches = []
  if (flagText.includes('g') || flagText.includes('y')) {
    let match
    while ((match = regex.exec(input)) !== null) {
      matches.push(toMatch(match))
      if (matches.length >= MAX_MATCHES) break
      if (match[0] === '') regex.lastIndex = advanceStringIndex(input, regex.lastIndex, regex.unicode)
      if (regex.lastIndex > input.length) break
    }
  } else {
    const match = regex.exec(input)
    if (match) matches.push(toMatch(match))
  }
  let replaced = null
  if (replacement !== undefined && replacement !== null) {
    try {
      replaced = input.replace(regex, String(replacement))
    } catch (error) {
      throw new Error(`替换失败：${error.message}`)
    }
  }
  return {
    matches,
    count: matches.length,
    truncated: matches.length >= MAX_MATCHES,
    replaced,
    flags: flagText
  }
}

function toMatch(match) {
  return {
    value: match[0],
    index: match.index,
    groups: match.slice(1).map((value) => (value === undefined ? null : value)),
    namedGroups: match.groups ? { ...match.groups } : null
  }
}

/** ECMAScript AdvanceStringIndex：u 模式下零宽匹配一次跨越完整代理对。 */
function advanceStringIndex(input, index, unicode) {
  if (!unicode) return index + 1
  if (index + 1 >= input.length) return index + 1
  const first = input.charCodeAt(index)
  if (first < 0xd800 || first > 0xdbff) return index + 1
  const second = input.charCodeAt(index + 1)
  if (second < 0xdc00 || second > 0xdfff) return index + 1
  return index + 2
}
