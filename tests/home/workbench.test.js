import test from 'node:test'
import assert from 'node:assert/strict'
import {
  SHORTCUT_LIMIT,
  filterShortcutOptions,
  hasPermission,
  shortcutRoute,
  weatherIconName
} from '../../src/views/home/workbench.js'

test('权限判断支持全部权限与精确权限', () => {
  assert.equal(hasPermission(['*:*:*'], 'notification:record:query'), true)
  assert.equal(hasPermission(['notification:record:query'], 'notification:record:query'), true)
  assert.equal(hasPermission(['notification:record:list'], 'notification:record:query'), false)
  assert.equal(hasPermission([], 'notification:record:query'), false)
  assert.equal(hasPermission(['*:*:*'], ''), false)
})

test('天气文字映射到稳定图标名', () => {
  assert.equal(weatherIconName('晴'), 'Sunny')
  assert.equal(weatherIconName('多云'), 'PartlyCloudy')
  assert.equal(weatherIconName('阴'), 'Cloudy')
  assert.equal(weatherIconName('雷阵雨'), 'Lightning')
  assert.equal(weatherIconName('大雨'), 'Pouring')
  assert.equal(weatherIconName('小雨'), 'Drizzling')
  assert.equal(weatherIconName('雾霾'), 'MostlyCloudy')
  assert.equal(weatherIconName('未知'), 'Cloudy')
})

test('快捷入口搜索匹配标题、路径和父级目录', () => {
  const options = [
    { menuId: 1, title: '用户管理', path: '/system/user', breadcrumb: ['系统管理'] },
    { menuId: 2, title: '通知记录', path: '/notification/record', breadcrumb: ['通知中心'] }
  ]
  assert.equal(filterShortcutOptions(options, '').length, 2)
  assert.deepEqual(filterShortcutOptions(options, '系统').map(item => item.menuId), [1])
  assert.deepEqual(filterShortcutOptions(options, '/notification').map(item => item.menuId), [2])
  assert.deepEqual(filterShortcutOptions(options, '不存在'), [])
  assert.equal(SHORTCUT_LIMIT, 20)
})

test('快捷入口路由保留菜单 query', () => {
  assert.deepEqual(shortcutRoute({ path: '/a/b', query: {} }), { path: '/a/b' })
  assert.deepEqual(shortcutRoute({ path: '/a/b', query: { id: 1 } }), { path: '/a/b', query: { id: 1 } })
  assert.equal(shortcutRoute({ path: '' }), null)
})
