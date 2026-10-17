/**
 * three.js 浏览器运行时加载器
 *
 * 只在这里按需加载 CDN 上的 three 与 OrbitControls，npm 的 three 不再进入浏览器产物。
 * 版本固定，不使用 latest；index.html 中的 importmap 会把 OrbitControls 内部的裸导入
 * 'three' 指回同一份 CDN 模块，因此浏览器里只存在一份 three 实例。
 */

const CDN_VERSION = '0.186.1'
const CDN_BASE = `https://cdn.jsdelivr.net/npm/three@${CDN_VERSION}`

/** three.js 核心模块 CDN 地址（固定版本） */
export const THREE_CDN_URL = `${CDN_BASE}/build/three.module.js`

/** OrbitControls CDN 地址（固定版本） */
export const ORBIT_CONTROLS_CDN_URL = `${CDN_BASE}/examples/jsm/controls/OrbitControls.js`

// 必须保持原生动态导入（@vite-ignore），避免 Vite 改写地址或把 npm three 预构建进来。
const importThree = () => import(/* @vite-ignore */ THREE_CDN_URL)
const importOrbitControls = () => import(/* @vite-ignore */ ORBIT_CONTROLS_CDN_URL)

/**
 * 创建独立加载器。默认加载真实 CDN，测试可注入假模块验证并发与失败重试。
 */
export function createThreeRuntimeLoader({
  loadThree = importThree,
  loadOrbitControls = importOrbitControls
} = {}) {
  let pending = null

  return {
    load() {
      if (!pending) {
        pending = Promise.all([loadThree(), loadOrbitControls()])
          .then(([three, controls]) => {
            if (!three || typeof three.WebGLRenderer !== 'function') {
              throw new Error('three.js CDN 模块格式异常')
            }
            if (!controls || typeof controls.OrbitControls !== 'function') {
              throw new Error('OrbitControls CDN 模块格式异常')
            }
            return { THREE: three, OrbitControls: controls.OrbitControls }
          })
          .catch((error) => {
            // 失败不缓存：网络恢复后再次进入首页可以重新尝试
            pending = null
            throw error
          })
      }
      return pending
    }
  }
}

/**
 * 轻量加载会话：组件卸载时 cancel()，异步结果返回后用 isCurrent(token) 判断是否继续。
 * 真实 import 无法中断，但可以保证卸载后不再创建渲染器、事件或 RAF。
 */
export function createLoadSession() {
  let current = 0

  return {
    begin() {
      current += 1
      return current
    },
    cancel() {
      current += 1
    },
    isCurrent(token) {
      return token === current
    }
  }
}

const runtimeLoader = createThreeRuntimeLoader()

/** 加载浏览器运行时；并发调用共享同一个 Promise。 */
export function loadThreeRuntime() {
  return runtimeLoader.load()
}
