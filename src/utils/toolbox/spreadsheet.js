/** CSV/JSON 表格解析与序列化。纯函数，保留前导 0 与文本，不做 Number 自动推断。 */

export function stripBom(text) {
  const value = String(text ?? '')
  return value.charCodeAt(0) === 0xfeff ? value.slice(1) : value
}

export function cellToText(value) {
  if (value === null || value === undefined) return ''
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function escapeCell(value, delimiter) {
  const text = cellToText(value)
  if (text.includes('"') || text.includes('\n') || text.includes('\r') || text.includes(delimiter)) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

export function normalizeHeadersWithMeta(row, count) {
  const bases = Array.from({ length: count }, (_, index) => {
    const value = cellToText(row?.[index]).trim()
    return value || `列${index + 1}`
  })
  const reserved = new Set(bases)
  const used = new Set()
  const renames = []
  const headers = bases.map((base, index) => {
    let candidate = base
    if (used.has(base)) {
      let suffix = 2
      do {
        candidate = `${base}_${suffix++}`
      } while (used.has(candidate) || reserved.has(candidate))
    }
    used.add(candidate)
    if (candidate !== base) {
      renames.push({ index, original: cellToText(row?.[index]).trim(), renamed: candidate })
    }
    return candidate
  })
  return { headers, renames }
}

export function normalizeHeaders(row, count) {
  return normalizeHeadersWithMeta(row, count).headers
}

export function parseCsvText(input, { delimiter = ',', hasHeader = false } = {}) {
  const text = stripBom(input)
  if (!text.length) throw new Error('CSV 内容为空')
  if (String(delimiter).length !== 1) throw new Error('分隔符必须是单个字符')
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false
  let rowStarted = false
  for (let index = 0; index < text.length; index++) {
    const char = text[index]
    if (inQuotes) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"'
          index++
        } else {
          inQuotes = false
        }
      } else {
        field += char
      }
      continue
    }
    if (char === '"') {
      if (field !== '') throw new Error(`CSV 第 ${rows.length + 1} 行引号位置不合法`)
      inQuotes = true
      rowStarted = true
      continue
    }
    if (char === delimiter) {
      row.push(field)
      field = ''
      rowStarted = true
      continue
    }
    if (char === '\r' || char === '\n') {
      if (char === '\r' && text[index + 1] === '\n') index++
      row.push(field)
      rows.push(row)
      row = []
      field = ''
      rowStarted = false
      continue
    }
    field += char
    rowStarted = true
  }
  if (inQuotes) throw new Error('CSV 存在未闭合的引号')
  if (rowStarted || field !== '' || row.length) {
    row.push(field)
    rows.push(row)
  }
  const nonEmptyRows = rows.filter((item) => item.some((cell) => cell !== ''))
  if (!nonEmptyRows.length) throw new Error('CSV 没有有效数据')
  const width = Math.max(...nonEmptyRows.map((item) => item.length))
  if (width === 0) throw new Error('CSV 没有有效列')
  const normalized = nonEmptyRows.map((item) => Array.from({ length: width }, (_, index) => item[index] ?? ''))
  const headerMeta = normalizeHeadersWithMeta(hasHeader ? normalized[0] : [], width)
  const dataRows = hasHeader ? normalized.slice(1) : normalized
  return { headers: headerMeta.headers, rows: dataRows, hasHeader, width, headerRenames: headerMeta.renames }
}

export function serializeCsv(headers, rows, { delimiter = ',', includeHeader = true } = {}) {
  if (String(delimiter).length !== 1) throw new Error('分隔符必须是单个字符')
  const header = normalizeHeaders(headers, headers.length)
  if (header.length !== rows[0]?.length && rows.length) {
    throw new Error('表头列数与数据列数不一致')
  }
  const lines = []
  if (includeHeader) lines.push(header.map((value) => escapeCell(value, delimiter)).join(delimiter))
  for (const row of rows) {
    lines.push(Array.from({ length: header.length }, (_, index) => escapeCell(row[index], delimiter)).join(delimiter))
  }
  return lines.join('\r\n')
}

/** 二維数组或对象数组归一化；对象数组按首次出现顺序合并键。 */
export function normalizeJsonTable(value, { hasHeader = false } = {}) {
  if (!Array.isArray(value)) throw new Error('JSON 必须是对象数组或二维数组')
  if (!value.length) return { headers: [], rows: [], source: 'empty', headerRenames: [] }
  const everyArray = value.every((item) => Array.isArray(item))
  const everyObject = value.every((item) => item !== null && typeof item === 'object' && !Array.isArray(item))
  if (!everyArray && !everyObject) throw new Error('JSON 数组不能混用对象与数组，也不能包含标量项')
  if (everyObject) {
    const rawHeaders = Array.from(new Set(value.flatMap((item) => Object.keys(item))))
    const headerMeta = normalizeHeadersWithMeta(rawHeaders, rawHeaders.length)
    const rows = value.map((item) => rawHeaders.map((key) => cellToText(item[key])))
    return { headers: headerMeta.headers, rows, source: 'objects', headerRenames: headerMeta.renames }
  }
  const width = Math.max(...value.map((row) => row.length))
  if (width === 0) throw new Error('JSON 二维数组没有有效列')
  const normalized = value.map((row) => Array.from({ length: width }, (_, index) => cellToText(row[index])))
  const headerMeta = normalizeHeadersWithMeta(hasHeader ? normalized[0] : [], width)
  const rows = hasHeader ? normalized.slice(1) : normalized
  return { headers: headerMeta.headers, rows, source: 'arrays', headerRenames: headerMeta.renames }
}

export function rowsToObjects(headers, rows) {
  const uniqueHeaders = normalizeHeaders(headers, Array.isArray(headers) ? headers.length : 0)
  return rows.map((row) => Object.fromEntries(uniqueHeaders.map((header, index) => [header, row[index] ?? ''])))
}

export function tableFromWorksheet(matrix, { hasHeader = false } = {}) {
  if (!Array.isArray(matrix) || !matrix.length) throw new Error('工作表没有有效数据')
  const width = Math.max(...matrix.map((row) => (Array.isArray(row) ? row.length : 0)))
  if (width === 0) throw new Error('工作表没有有效列')
  const normalized = matrix.map((row) => Array.from({ length: width }, (_, index) => cellToText(row?.[index])))
  const headerMeta = normalizeHeadersWithMeta(hasHeader ? normalized[0] : [], width)
  return {
    headers: headerMeta.headers,
    rows: hasHeader ? normalized.slice(1) : normalized,
    width,
    headerRenames: headerMeta.renames
  }
}

export function countNonEmptyRows(rows) {
  return rows.filter((row) => row.some((cell) => cell !== '')).length
}
