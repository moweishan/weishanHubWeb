// 执行：node scripts/check-three-runtime.mjs
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { parse } from '@vue/compiler-sfc'
import { createThreeRuntimeLoader, createLoadSession, THREE_CDN_URL } from '../src/views/landing/three-runtime.js'

const three = { WebGLRenderer: class {} }
const controls = { OrbitControls: class {} }
let imports = 0
const loader = createThreeRuntimeLoader({
  loadThree: async () => { imports += 1; return three },
  loadOrbitControls: async () => { imports += 1; return controls }
})
const first = loader.load()
assert.equal(loader.load(), first, '并发加载应共享同一个 Promise')
assert.equal((await first).THREE, three)
assert.equal((await loader.load()).OrbitControls, controls.OrbitControls)
assert.equal(imports, 2, '加载成功后不应重复请求 CDN 模块')

let attempts = 0
const retry = createThreeRuntimeLoader({
  loadThree: async () => { if (++attempts === 1) throw new Error('network'); return three },
  loadOrbitControls: async () => controls
})
await assert.rejects(retry.load(), /network/)
assert.equal((await retry.load()).THREE, three, '失败不应永久缓存被拒绝的 Promise')
assert.equal(attempts, 2)
await assert.rejects(createThreeRuntimeLoader({ loadThree: async () => ({}), loadOrbitControls: async () => controls }).load())

// 直接运行真实组件的异步初始化：CDN 尚未返回时卸载，不能创建孤立渲染器。
const filename = new URL('../src/views/landing/index.vue', import.meta.url)
const source = parse(fs.readFileSync(filename, 'utf8')).descriptor.scriptSetup.content
  .replace(/^import .*\r?\n/gm, '')
  .replace('import.meta.env.VITE_APP_TITLE', "'weishanHub'")
let resolveRuntime
let renderers = 0
let rejectRuntime = false
const pending = new Promise(resolve => { resolveRuntime = resolve })
const noop = () => {}
const sandbox = {
  ref: value => ({ value }), computed: fn => ({ get value() { return fn() } }),
  defineOptions: noop, onMounted: noop, onBeforeUnmount: noop,
  createLoadSession,
  loadThreeRuntime: () => rejectRuntime ? Promise.reject(new Error('network')) : pending,
  window: { cancelAnimationFrame: noop, clearTimeout: noop },
  console: { warn: noop }
}
const page = vm.runInNewContext(source + '\n;({stageRef, init, teardown, fallback})', sandbox)
page.stageRef.value = {}
const initialization = page.init()
page.teardown()
resolveRuntime({ THREE: { WebGLRenderer: class { constructor() { renderers += 1 } } }, OrbitControls: class {} })
await initialization
assert.equal(renderers, 0, '加载期间卸载后不应创建渲染器')
rejectRuntime = true
await page.init()
assert.equal(page.fallback.value, true, 'CDN 失败时应进入静态星空降级')

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8')
const map = html.match(/<script type="importmap">([\s\S]*?)<\/script>/)
assert.ok(map)
assert.equal(JSON.parse(map[1]).imports.three, THREE_CDN_URL)
assert.ok(html.indexOf(map[0]) < html.search(/<script\b[^>]*type="module"/), 'import map 应先于模块脚本')
const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
assert.equal(pkg.dependencies.three, undefined)
assert.ok(THREE_CDN_URL.includes(`three@${pkg.devDependencies.three}/`), '离线模型检查应使用同版本 Three.js')
console.log('通过：CDN 并发缓存、失败重试、卸载取消、静态降级、import map 顺序与版本一致性')
