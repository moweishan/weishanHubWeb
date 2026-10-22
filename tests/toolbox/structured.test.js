import test from 'node:test'
import assert from 'node:assert/strict'
import {
  diffJson,
  formatXml,
  jsonToCsv,
  jsonToToml,
  jsonToXml,
  markdownToHtml,
  parseYaml,
  stringifyJson,
  stringifyYaml,
  tomlToJson,
  xmlToJson,
  yamlToJson,
  yamlToToml
} from '../../src/utils/toolbox/structured.js'

test('YAML 转 JSON 保留嵌套结构与数组', () => {
  const yaml = 'server:\n  host: 127.0.0.1\n  ports:\n    - 80\n    - 443\n'
  const parsed = JSON.parse(yamlToJson(yaml))
  assert.equal(parsed.server.host, '127.0.0.1')
  assert.deepEqual(parsed.server.ports, [80, 443])
  assert.equal(JSON.parse(yamlToJson('a: 1'))?.a, 1)
  assert.throws(() => parseYaml('a: [1, 2'), /YAML 解析失败/)
})

test('JSON 与 YAML/TOML 互转并能处理嵌套对象', () => {
  const json = '{"title":"demo","server":{"port":8080},"tags":["a","b"]}'
  const yaml = stringifyYaml(JSON.parse(json))
  assert.match(yaml, /title: demo/)
  const toml = jsonToToml(json)
  assert.match(toml, /\[server\]/)
  assert.equal(JSON.parse(tomlToJson(toml)).server.port, 8080)
  assert.match(yamlToToml('name: demo\nport: 80'), /port = 80/)
  assert.match(stringifyJson({ b: 1, a: 2 }, { sortKeys: true }), /"a": 2/)
})

test('XML 属性、重复节点与错误定位', () => {
  const xml = '<catalog><book id="1"><title>A</title></book><book id="2"><title>B</title></book></catalog>'
  const json = JSON.parse(xmlToJson(xml, { attributes: true }))
  assert.equal(json.catalog.book.length, 2)
  assert.equal(json.catalog.book[0]['@_id'], '1')
  assert.equal(json.catalog.book[1].title, 'B')
  assert.throws(() => xmlToJson('<a><b></a>'), /XML 解析失败/)
  const built = jsonToXml('{"book":{"@_id":"1","#text":"A"}}', { rootName: 'catalog', declaration: true })
  assert.match(built, /^<\?xml/)
  assert.match(built, /<book id="1">\s*A\s*<\/book>/)
  const formatted = formatXml('<a><b>1</b></a>')
  assert.match(formatted, /<a>/)
  assert.match(formatted, /<b>1<\/b>/)
  assert.ok(formatted.includes('\n'), '格式化结果应包含换行')
})

test('CSV 正确处理逗号、双引号、换行与列顺序', () => {
  const csv = jsonToCsv([
    { name: 'A,B', note: 'say "hi"', line: 'x\ny' },
    { name: 'C', note: 'plain', line: 'z' }
  ])
  assert.equal(csv, 'name,note,line\r\n"A,B","say ""hi""","x\ny"\r\nC,plain,z')
  assert.equal(jsonToCsv([{ a: 1 }, { b: 2 }], { includeHeader: false }), '1,\r\n,2')
  assert.throws(() => jsonToCsv({ a: 1 }), /对象数组/)
})

test('JSON 差异忽略对象键顺序，识别新增/删除/修改', () => {
  const left = { a: 1, b: { x: 1, y: 2 }, arr: [1, 2] }
  const right = { b: { y: 3, x: 1 }, a: 1, arr: [1, 2, 3], added: true }
  const diff = diffJson(left, right)
  assert.equal(diff.summary.added, 2)
  assert.equal(diff.summary.removed, 0)
  assert.equal(diff.summary.modified, 1)
  assert.equal(diffJson({ a: 1, b: 2 }, { b: 2, a: 1 }).changes.length, 0)
})

test('Markdown 渲染与 JSON 格式化', () => {
  const html = markdownToHtml('# 标题\n\n**粗体**')
  assert.match(html, /<h1>标题<\/h1>/)
  assert.match(html, /<strong>粗体<\/strong>/)
  assert.equal(stringifyJson({ b: 1, a: 2 }, { sortKeys: true }), '{\n  "a": 2,\n  "b": 1\n}')
})
