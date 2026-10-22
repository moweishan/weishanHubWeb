import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  getToolboxPath,
  serializeToolboxCatalog,
  toolboxCategories,
  toolboxModule,
  toolboxTools
} from '../../src/data/toolbox/catalog.js'

test('目录注册表包含 5 个分类与 63 个叶子项', () => {
  assert.equal(toolboxCategories.length, 5)
  assert.deepEqual(
    toolboxCategories.map((item) => item.key),
    ['files', 'convert', 'web', 'development', 'security']
  )
  assert.deepEqual(
    toolboxCategories.map((item) => item.title),
    ['文件处理', '格式转换', '网页工具', '开发辅助', '加密与安全']
  )
  assert.equal(toolboxTools.length, 63)
  const counts = Object.fromEntries(
    toolboxCategories.map((category) => [category.key, toolboxTools.filter((tool) => tool.category === category.key).length])
  )
  assert.deepEqual(counts, { files: 5, convert: 20, web: 16, development: 14, security: 8 })
  assert.equal(toolboxModule.path, '/toolbox')
})

test('routeName、permission、component 与路径规则一致且全局唯一', () => {
  const routeNames = new Set()
  const permissions = new Set()
  for (const tool of toolboxTools) {
    assert.match(tool.routeName, /^Toolbox[A-Z][A-Za-z0-9]*$/)
    assert.match(tool.permission, /^toolbox:[a-z][a-zA-Z0-9]*:view$/)
    assert.equal(tool.component, `toolbox/${tool.category}/${tool.slug}/index`)
    assert.equal(getToolboxPath(tool), `/toolbox/${tool.category}/${tool.slug}`)
    assert.ok(!routeNames.has(tool.routeName), `routeName 重复：${tool.routeName}`)
    assert.ok(!permissions.has(tool.permission), `permission 重复：${tool.permission}`)
    routeNames.add(tool.routeName)
    permissions.add(tool.permission)
  }
  assert.equal(routeNames.size, 63)
  assert.equal(permissions.size, 63)
})

test('63 项全部标记完成，不再保留阶段占位', () => {
  assert.equal(toolboxTools.filter((tool) => tool.implemented).length, 63)
  for (const tool of toolboxTools) {
    assert.equal(tool.implemented, true, `${tool.slug} 未标记完成`)
    assert.equal(Object.prototype.hasOwnProperty.call(tool, 'stage'), false, `${tool.slug} 仍保留 stage`)
  }
})

test('63 个叶子页面文件全部存在', () => {
  for (const tool of toolboxTools) {
    const file = new URL(`../../src/views/${tool.component}.vue`, import.meta.url)
    assert.equal(existsSync(fileURLToPath(file)), true, `缺少页面：${tool.component}`)
  }
})

test('目录可以完整序列化为 JSON 并还原', () => {
  const text = serializeToolboxCatalog()
  const parsed = JSON.parse(text)
  assert.equal(parsed.tools.length, 63)
  assert.equal(parsed.categories.length, 5)
  assert.deepEqual(parsed.tools[0].routeName, toolboxTools[0].routeName)
  assert.equal(parsed.tools.filter((tool) => tool.implemented).length, 63)
})
