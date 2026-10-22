/** 结构化数据（JSON/YAML/TOML/XML/CSV）转换与差异对比。 */

import { parse as parseYamlText, stringify as stringifyYamlText } from 'yaml'
import { parse as parseTomlText, stringify as stringifyTomlText } from 'smol-toml'
import { XMLBuilder, XMLParser, XMLValidator } from 'fast-xml-parser'
import { marked } from 'marked'

export function parseJson(text) {
  try {
    return JSON.parse(String(text ?? ''))
  } catch (error) {
    throw new Error(`JSON 解析失败：${error.message}`)
  }
}

export function stringifyJson(value, { indent = 2, sortKeys = false } = {}) {
  const normalize = (item) => {
    if (Array.isArray(item)) return item.map(normalize)
    if (item && typeof item === 'object') {
      const keys = Object.keys(item)
      if (sortKeys) keys.sort((a, b) => a.localeCompare(b))
      return Object.fromEntries(keys.map((key) => [key, normalize(item[key])]))
    }
    return item
  }
  return JSON.stringify(normalize(value), null, indent === 'tab' ? '\t' : Number(indent))
}

export function minifyJson(text, { sortKeys = false } = {}) {
  return stringifyJson(parseJson(text), { indent: 0, sortKeys })
}

export function parseYaml(text) {
  try {
    return parseYamlText(String(text ?? ''))
  } catch (error) {
    throw new Error(`YAML 解析失败：${formatYamlError(error)}`)
  }
}

export function stringifyYaml(value, { indent = 2, lineWidth = 0 } = {}) {
  try {
    return stringifyYamlText(value, {
      indent: Number(indent) || 2,
      lineWidth: Number(lineWidth) > 0 ? Number(lineWidth) : 0
    })
  } catch (error) {
    throw new Error(`YAML 生成失败：${error.message}`)
  }
}

export function parseToml(text) {
  try {
    return parseTomlText(String(text ?? ''))
  } catch (error) {
    throw new Error(`TOML 解析失败：${error.message}`)
  }
}

export function stringifyToml(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('TOML 根节点必须是对象，当前内容无法转换为 TOML')
  }
  try {
    return stringifyTomlText(value)
  } catch (error) {
    throw new Error(`TOML 生成失败：${error.message}`)
  }
}

export function yamlToJson(text, options) {
  return stringifyJson(parseYaml(text), options)
}

export function yamlToToml(text) {
  return stringifyToml(parseYaml(text))
}

export function jsonToYaml(text, options) {
  return stringifyYaml(parseJson(text), options)
}

export function jsonToToml(text) {
  return stringifyToml(parseJson(text))
}

export function tomlToJson(text, options) {
  return stringifyJson(parseToml(text), options)
}

export function tomlToYaml(text, options) {
  return stringifyYaml(parseToml(text), options)
}

function validateXml(xml) {
  const result = XMLValidator.validate(String(xml ?? ''))
  if (result === true) return
  const detail = result.err
  throw new Error(
    `XML 解析失败：第 ${detail.line} 行第 ${detail.col} 列，${detail.msg}${detail.code ? `（${detail.code}）` : ''}`
  )
}

export function xmlToJson(text, { attributes = true, textNode = '#text', parseValues = false } = {}) {
  validateXml(text)
  const parser = new XMLParser({
    ignoreAttributes: !attributes,
    attributeNamePrefix: '@_',
    textNodeName: textNode,
    trimValues: false,
    parseTagValue: parseValues,
    parseAttributeValue: false,
    commentPropName: '#comment',
    cdataPropName: '#cdata'
  })
  try {
    return stringifyJson(parser.parse(String(text)))
  } catch (error) {
    throw new Error(`XML 转 JSON 失败：${error.message}`)
  }
}

export function jsonToXml(text, { rootName = 'root', declaration = false, indent = 2 } = {}) {
  const value = parseJson(text)
  const name = String(rootName || 'root').trim()
  if (!/^[A-Za-z_][\w.-]*$/.test(name)) throw new Error('根元素名称不合法')
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('JSON 转 XML 需要对象作为根内容，数组或标量请先包裹在对象中')
  }
  const builder = new XMLBuilder({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
    format: true,
    indentBy: ' '.repeat(Number(indent) || 2),
    suppressEmptyNode: false,
    suppressBooleanAttributes: false
  })
  try {
    const body = builder.build({ [name]: value })
    return declaration ? `<?xml version="1.0" encoding="UTF-8"?>\n${body}` : body
  } catch (error) {
    throw new Error(`JSON 转 XML 失败：${error.message}`)
  }
}

export function formatXml(text, { indent = 2 } = {}) {
  validateXml(text)
  const parser = new XMLParser({
    preserveOrder: true,
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
    commentPropName: '#comment',
    trimValues: false,
    parseTagValue: false,
    parseAttributeValue: false
  })
  const builder = new XMLBuilder({
    preserveOrder: true,
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
    commentPropName: '#comment',
    format: true,
    indentBy: ' '.repeat(Number(indent) || 2),
    suppressEmptyNode: false
  })
  try {
    return builder.build(parser.parse(String(text))).trim()
  } catch (error) {
    throw new Error(`XML 格式化失败：${error.message}`)
  }
}

export function markdownToHtml(text) {
  try {
    const result = marked.parse(String(text ?? ''), {
      async: false,
      gfm: true,
      breaks: false
    })
    return String(result)
  } catch (error) {
    throw new Error(`Markdown 渲染失败：${error.message}`)
  }
}

function csvEscape(value, delimiter) {
  const text = value === null || value === undefined ? '' : String(value)
  if (text.includes('"') || text.includes('\n') || text.includes('\r') || text.includes(delimiter)) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

function csvValue(value) {
  if (value === null || value === undefined) return ''
  if (typeof value === 'object') return JSON.stringify(value)
  return value
}

/**
 * JSON 对象数组转 CSV。
 * options.columns 可显式指定列；未指定时按首次出现顺序合并所有键。
 */
export function jsonToCsv(input, { delimiter = ',', includeHeader = true, columns = [] } = {}) {
  const rows = typeof input === 'string' ? parseJson(input) : input
  if (!Array.isArray(rows)) throw new Error('JSON 转 CSV 需要对象数组，例如 [{"name":"张三"}]')
  if (rows.length === 0) return ''
  if (!rows.every((row) => row && typeof row === 'object' && !Array.isArray(row))) {
    throw new Error('JSON 数组的每一项都必须是对象')
  }
  const header = columns.length
    ? columns
    : Array.from(new Set(rows.flatMap((row) => Object.keys(row))))
  const lines = []
  if (includeHeader) lines.push(header.map((key) => csvEscape(key, delimiter)).join(delimiter))
  for (const row of rows) {
    lines.push(header.map((key) => csvEscape(csvValue(row[key]), delimiter)).join(delimiter))
  }
  return lines.join('\r\n')
}

export function formatJsonPath(path, key) {
  return /^[A-Za-z_$][\w$]*$/.test(key) ? `${path}.${key}` : `${path}[${JSON.stringify(key)}]`
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function typeName(value) {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  return typeof value
}

/** 深度比较两个 JSON 值；对象键顺序不影响结果。 */
export function diffJson(left, right, { maxChanges = 2000 } = {}) {
  const changes = []
  const walk = (a, b, path) => {
    if (changes.length >= maxChanges) return
    if (Object.is(a, b)) return
    if (typeName(a) !== typeName(b)) {
      changes.push({ type: 'modified', path, before: a, after: b })
      return
    }
    if (Array.isArray(a)) {
      const length = Math.max(a.length, b.length)
      for (let index = 0; index < length; index++) {
        const itemPath = `${path}[${index}]`
        if (index >= a.length) changes.push({ type: 'added', path: itemPath, after: b[index] })
        else if (index >= b.length) changes.push({ type: 'removed', path: itemPath, before: a[index] })
        else walk(a[index], b[index], itemPath)
      }
      return
    }
    if (isPlainObject(a)) {
      const keys = Array.from(new Set([...Object.keys(a), ...Object.keys(b)])).sort((x, y) => x.localeCompare(y))
      for (const key of keys) {
        const itemPath = formatJsonPath(path, key)
        if (!Object.prototype.hasOwnProperty.call(a, key)) {
          changes.push({ type: 'added', path: itemPath, after: b[key] })
        } else if (!Object.prototype.hasOwnProperty.call(b, key)) {
          changes.push({ type: 'removed', path: itemPath, before: a[key] })
        } else {
          walk(a[key], b[key], itemPath)
        }
      }
      return
    }
    changes.push({ type: 'modified', path, before: a, after: b })
  }
  walk(left, right, '$')
  return {
    changes,
    truncated: changes.length >= maxChanges,
    summary: {
      added: changes.filter((item) => item.type === 'added').length,
      removed: changes.filter((item) => item.type === 'removed').length,
      modified: changes.filter((item) => item.type === 'modified').length
    }
  }
}

export function diffJsonText(leftText, rightText, options) {
  const left = parseJson(leftText)
  const right = parseJson(rightText)
  return diffJson(left, right, options)
}

function formatYamlError(error) {
  if (error && Array.isArray(error.linePos) && error.linePos[0]) {
    const position = error.linePos[0]
    return `${error.message}（第 ${position.line} 行第 ${position.col} 列）`
  }
  return error?.message || String(error)
}
