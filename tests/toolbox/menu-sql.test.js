import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { toolboxCategories, toolboxTools } from '../../src/data/toolbox/catalog.js'

const sqlUrl = new URL('../../../server/sql/20261021_add_toolbox.sql', import.meta.url)
const iconDir = new URL('../../src/assets/icons/svg', import.meta.url)
const sql = readFileSync(fileURLToPath(sqlUrl), 'utf8')

test('工具箱菜单 SQL 包含根、5 个分类与 63 个叶子，共 69 条 sys_menu 插入', () => {
  assert.equal((sql.match(/INSERT INTO sys_menu/g) || []).length, 69)
  assert.ok(sql.includes("'toolbox'"))
  assert.ok(sql.includes("'Toolbox'"))
  for (const category of toolboxCategories) {
    assert.ok(sql.includes(`'${category.title}'`), `缺少分类名称：${category.title}`)
    assert.ok(sql.includes(`'${category.routeName}'`), `缺少分类路由名：${category.routeName}`)
  }
  assert.match(sql, /^--|SET NAMES/m)
  assert.match(sql, /START TRANSACTION/)
  assert.match(sql, /COMMIT/)
  assert.doesNotMatch(sql, /\b(DELETE|DROP|TRUNCATE)\b/i)
})

test('63 个叶子 SQL 与 catalog 的 path/component/routeName/perms 精确匹配', () => {
  const leafPattern =
    /SELECT '([^']*)', (@\w+), (\d+), '([^']*)', '([^']*)', '([^']*)',\s+1, 1, 'C', '0', '0', '([^']*)', '([^']*)'/g
  const rows = [...sql.matchAll(leafPattern)].map((match) => ({
    title: match[1],
    parent: match[2],
    order: Number(match[3]),
    path: match[4],
    component: match[5],
    routeName: match[6],
    perms: match[7],
    icon: match[8]
  }))
  assert.equal(rows.length, 63)
  assert.equal(new Set(rows.map((row) => row.routeName)).size, 63)
  assert.equal(new Set(rows.map((row) => row.perms)).size, 63)
  const byComponent = new Map(rows.map((row) => [row.component, row]))
  assert.equal(byComponent.size, 63)
  for (const tool of toolboxTools) {
    const row = byComponent.get(tool.component)
    assert.ok(row, `SQL 缺少 component：${tool.component}`)
    assert.equal(row.title, tool.title)
    assert.equal(row.path, tool.slug)
    assert.equal(row.routeName, tool.routeName)
    assert.equal(row.perms, tool.permission)
    assert.equal(row.parent, `@${tool.category}_id`)
    assert.ok(row.order >= 1)
  }
  assert.equal((sql.match(/'toolbox\/[^']+\/index'/g) || []).length, 63)
  assert.equal((sql.match(/,\s+1, 1, 'C', '0', '0'/g) || []).length, 63, '叶子必须 is_frame=1、is_cache=1')
})

test('SQL 只使用 web/src/assets/icons/svg 中存在的 SVG 图标名', () => {
  const icons = new Set(readdirSync(fileURLToPath(iconDir)).filter((name) => name.endsWith('.svg')).map((name) => name.slice(0, -4)))
  const used = new Set()
  for (const match of sql.matchAll(/'([a-z0-9-]+)',\s*\n?\s*'admin'/g)) used.add(match[1])
  for (const icon of used) {
    assert.ok(icons.has(icon), `SQL 使用了不存在的 SVG 图标：${icon}`)
  }
  assert.ok(used.size >= 20, '应使用多种 SVG 图标')
  assert.ok(!['Switch', 'Folder', 'Lock', 'Tools', 'Monitor'].some((name) => used.has(name)), 'SQL 不应写 Element Plus 大写图标名')
})

test('SQL 的权限标识与叶子权限全局唯一', () => {
  const permissions = toolboxTools.map((tool) => tool.permission)
  assert.equal(new Set(permissions).size, 63)
  for (const permission of permissions) {
    assert.ok(sql.includes(`'${permission}'`), `缺少权限：${permission}`)
  }
  assert.ok(sql.includes("'toolbox:files:view'"))
  assert.ok(sql.includes("'toolbox:security:view'"))
})
