<template>
  <!-- 公开门面：独立于后台 Layout，不加载用户信息、菜单或任何业务数据 -->
  <main class="landing" :class="{ 'is-dragging': dragging }" :aria-label="appTitle">
    <!-- three.js 画布由脚本挂到舞台内；OrbitControls 只监听这块画布 -->
    <div ref="stageRef" class="landing__stage" aria-hidden="true"></div>

    <!-- WebGL 不可用 / 上下文丢失 / three.js CDN 加载失败时的静态星空降级：纯 CSS，不发起任何请求 -->
    <div v-if="fallback" class="landing__fallback" aria-hidden="true"></div>

    <p v-if="fallback" class="landing__notice">
      暂时无法加载 3D 展示，已切换为静态星空。
    </p>
    <p v-else-if="showHint" class="landing__hint" aria-hidden="true">
      拖动旋转 · 滚轮/双指缩放
    </p>

    <!-- 后台入口：右下角低调六边形，可聚焦、可键盘触发，覆盖在画布之上 -->
    <router-link
      class="landing__entry"
      :to="{ path: '/login', query: { redirect: '/index' } }"
      aria-label="进入后台登录"
    >
      <svg class="landing__entry-mark" viewBox="0 0 24 24" focusable="false" aria-hidden="true">
        <path d="M12 2.8 19.97 7.4v9.2L12 21.2 4.03 16.6V7.4L12 2.8Z" />
        <circle cx="12" cy="12" r="3.1" />
      </svg>
    </router-link>
  </main>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { createLoadSession, loadThreeRuntime } from './three-runtime'
import { computeFitDistance, createSolarSystem } from './solar-system'

defineOptions({ name: 'Landing' })

const appTitle = import.meta.env.VITE_APP_TITLE

/* ---------------- 展示参数 ---------------- */

const CAMERA_FOV = 50
const CAMERA_NEAR = 1
const CAMERA_FAR = 4000
const MIN_DISTANCE = 14
// 每秒约 0.037 弧度：绕太阳系一圈约 170 秒，属于“极缓慢”
const AUTO_ROTATE_SPEED = 0.35
const AUTO_ROTATE_RESUME_DELAY = 1500
const HINT_DURATION = 7000

/* ---------------- Vue 只负责模板可见状态 ---------------- */

const stageRef = ref(null)
const dragging = ref(false)
const hintVisible = ref(true)
const fallback = ref(false)
const reducedMotion = ref(false)
const showHint = computed(() => hintVisible.value && !fallback.value && !reducedMotion.value)

// three 对象、计时器、观察者都放在普通对象里，不进入响应式系统
const state = {
  three: null,
  renderer: null,
  scene: null,
  camera: null,
  controls: null,
  solar: null,
  running: false,
  raf: 0,
  lastTime: 0,
  hintTimer: 0,
  resumeTimer: 0,
  fitDistance: 0,
  pixelRatio: 0,
  needsRender: true,
  resizeObserver: null,
  motionQuery: null,
  onMotionChange: null,
  onVisibility: null,
  onContextLost: null,
  onWindowResize: null
}

function isMobileLayout() {
  if (typeof window === 'undefined') return false
  return window.innerWidth < 768
    || Boolean(window.matchMedia && window.matchMedia('(pointer: coarse)').matches)
}

/* ---------------- 尺寸：只更新相机与画布，不重建场景/纹理 ---------------- */

function resize() {
  const stage = stageRef.value
  const renderer = state.renderer
  const camera = state.camera
  const THREE = state.three
  if (!stage || !renderer || !camera || !THREE) return

  const width = Math.max(1, stage.clientWidth)
  const height = Math.max(1, stage.clientHeight)
  const mobile = isMobileLayout()

  // 分辨率封顶 + 像素预算：高 DPI 大屏不做无谓的填充率开销
  const budget = mobile ? 1_500_000 : 3_000_000
  const ratio = Math.max(0.5, Math.min(
    window.devicePixelRatio || 1,
    mobile ? 1.25 : 1.5,
    Math.sqrt(budget / (width * height))
  ))
  if (state.pixelRatio !== ratio) {
    state.pixelRatio = ratio
    renderer.setPixelRatio(ratio)
  }
  renderer.setSize(width, height, false)

  camera.aspect = width / height
  camera.updateProjectionMatrix()

  const fit = computeFitDistance(camera.aspect, CAMERA_FOV)
  const previousFit = state.fitDistance
  const distance = camera.position.length()
  // 未手动缩放时跟随视口重新构图：手机竖屏首屏也能看全整个太阳系
  const keepFit = distance < 1e-3
    || (previousFit > 0 && Math.abs(distance - previousFit) < previousFit * 0.02)

  state.fitDistance = fit
  if (state.controls) state.controls.maxDistance = fit * 2.4

  if (keepFit) {
    if (distance < 1e-3) {
      // 默认斜俯视：仰角约 28°，方位角 -42°
      camera.position.setFromSphericalCoords(
        fit,
        THREE.MathUtils.degToRad(62),
        THREE.MathUtils.degToRad(-42)
      )
    } else {
      camera.position.setLength(fit)
    }
    camera.lookAt(0, 0, 0)
    if (state.controls) state.controls.update(0)
  }
  state.needsRender = true
}

/* ---------------- 帧循环：单 RAF，delta 夹紧 ---------------- */

function startLoop() {
  if (state.running || !state.renderer || !state.camera) return
  state.running = true
  state.lastTime = window.performance.now()
  state.raf = window.requestAnimationFrame(frame)
}

function stopLoop() {
  state.running = false
  if (state.raf) {
    window.cancelAnimationFrame(state.raf)
    state.raf = 0
  }
}

function frame(now) {
  if (!state.running || !state.solar || !state.controls || !state.renderer) return
  const delta = Math.min(0.05, Math.max(0, (now - state.lastTime) / 1000))
  state.lastTime = now

  const still = reducedMotion.value
  state.solar.update(still ? 0 : delta) // 减少动效：行星/太阳停在当前姿态
  const cameraMoved = state.controls.update(delta)

  // 减少动效时只在相机或尺寸变化时重绘，静置时几乎不耗 GPU
  if (!still || cameraMoved || state.needsRender) {
    state.renderer.render(state.scene, state.camera)
    state.needsRender = false
  }
  state.raf = window.requestAnimationFrame(frame)
}

/* ---------------- 自动环绕：拖动暂停，松手延迟恢复 ---------------- */

function clearResumeTimer() {
  if (state.resumeTimer) {
    window.clearTimeout(state.resumeTimer)
    state.resumeTimer = 0
  }
}

function handleControlsStart() {
  hintVisible.value = false
  dragging.value = true
  if (state.hintTimer) {
    window.clearTimeout(state.hintTimer)
    state.hintTimer = 0
  }
  clearResumeTimer()
  if (state.controls) state.controls.autoRotate = false
}

function handleControlsEnd() {
  dragging.value = false
  if (!state.controls || reducedMotion.value) return
  clearResumeTimer()
  state.resumeTimer = window.setTimeout(() => {
    state.resumeTimer = 0
    if (state.controls && !reducedMotion.value) state.controls.autoRotate = true
  }, AUTO_ROTATE_RESUME_DELAY)
}

/* ---------------- 初始化 ---------------- */

const loadSession = createLoadSession()

async function init() {
  const stage = stageRef.value
  if (!stage) return

  const token = loadSession.begin()
  let runtime
  try {
    runtime = await loadThreeRuntime()
  } catch (error) {
    if (!loadSession.isCurrent(token)) return
    console.warn('[landing] three.js CDN 加载失败，已切换为静态星空：', error)
    fallback.value = true
    return
  }
  // 加载期间离开页面：promise 返回后不能再创建渲染器、事件或 RAF
  if (!loadSession.isCurrent(token) || !stageRef.value) return

  const { THREE, OrbitControls } = runtime

  try {
    state.three = THREE
    const mobile = isMobileLayout()
    const renderer = new THREE.WebGLRenderer({
      antialias: !mobile,
      alpha: false,
      stencil: false,
      powerPreference: 'high-performance'
    })
    renderer.setClearColor(0x000206, 1)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.domElement.setAttribute('aria-hidden', 'true')
    stage.appendChild(renderer.domElement)
    state.renderer = renderer

    // 太阳系模型自带 Scene；WebGL 不可用时这里会抛错并走静态星空降级
    const solar = createSolarSystem({ detail: mobile ? 'low' : 'high', three: THREE })
    state.solar = solar
    state.scene = solar.scene

    const camera = new THREE.PerspectiveCamera(CAMERA_FOV, 1, CAMERA_NEAR, CAMERA_FAR)
    state.camera = camera

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.target.set(0, 0, 0)
    controls.enablePan = false
    controls.enableDamping = true
    controls.dampingFactor = 0.055
    controls.rotateSpeed = 0.55
    controls.zoomSpeed = 0.7
    controls.autoRotate = !reducedMotion.value
    controls.autoRotateSpeed = AUTO_ROTATE_SPEED
    controls.minDistance = MIN_DISTANCE
    controls.maxDistance = 400
    controls.addEventListener('start', handleControlsStart)
    controls.addEventListener('end', handleControlsEnd)
    state.controls = controls

    resize()
    startLoop()

    state.onVisibility = () => {
      if (document.hidden) stopLoop()
      else startLoop()
    }
    document.addEventListener('visibilitychange', state.onVisibility)

    // 窗口尺寸兜底（浏览器缩放改变 DPR 时 ResizeObserver 不会触发）
    state.onWindowResize = () => resize()
    window.addEventListener('resize', state.onWindowResize)

    if (typeof ResizeObserver !== 'undefined') {
      state.resizeObserver = new ResizeObserver(() => resize())
      state.resizeObserver.observe(stage)
    }

    state.onContextLost = (event) => {
      event.preventDefault()
      stopLoop()
      fallback.value = true
    }
    renderer.domElement.addEventListener('webglcontextlost', state.onContextLost, false)

    if (!reducedMotion.value) {
      state.hintTimer = window.setTimeout(() => {
        hintVisible.value = false
      }, HINT_DURATION)
    }
  } catch (error) {
    console.warn('[landing] 太阳系场景初始化失败，已切换为静态星空：', error)
    fallback.value = true
    teardown()
  }
}

/* ---------------- 清理：动画帧 / 事件 / 计时器 / GPU 资源 ---------------- */

function teardown() {
  // 使仍在等待 CDN 的 init 失效，避免卸载/重进后重复创建渲染器
  loadSession.cancel()
  stopLoop()
  if (state.hintTimer) {
    window.clearTimeout(state.hintTimer)
    state.hintTimer = 0
  }
  clearResumeTimer()

  if (state.resizeObserver) {
    state.resizeObserver.disconnect()
    state.resizeObserver = null
  }
  if (state.onWindowResize) {
    window.removeEventListener('resize', state.onWindowResize)
    state.onWindowResize = null
  }
  if (state.onVisibility) {
    document.removeEventListener('visibilitychange', state.onVisibility)
    state.onVisibility = null
  }
  if (state.motionQuery && state.onMotionChange) {
    try {
      state.motionQuery.removeEventListener('change', state.onMotionChange)
    } catch (error) {
      /* 旧内核只支持 addListener，忽略即可 */
    }
  }
  state.motionQuery = null
  state.onMotionChange = null

  const canvas = state.renderer ? state.renderer.domElement : null
  if (canvas && state.onContextLost) {
    canvas.removeEventListener('webglcontextlost', state.onContextLost)
  }
  state.onContextLost = null

  if (state.controls) {
    state.controls.removeEventListener('start', handleControlsStart)
    state.controls.removeEventListener('end', handleControlsEnd)
    state.controls.dispose()
    state.controls = null
  }
  if (state.solar) {
    state.solar.dispose()
    state.solar = null
  }
  if (state.renderer) {
    state.renderer.dispose()
    if (typeof state.renderer.forceContextLoss === 'function') state.renderer.forceContextLoss()
    if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas)
    state.renderer = null
  }

  state.scene = null
  state.camera = null
  state.three = null
  state.running = false
  state.needsRender = true
  state.pixelRatio = 0
  dragging.value = false
}

/* ---------------- 生命周期 ---------------- */

onMounted(() => {
  if (window.matchMedia) {
    try {
      state.motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
      reducedMotion.value = state.motionQuery.matches
      state.onMotionChange = (event) => {
        reducedMotion.value = event.matches
        if (!state.controls) return
        if (event.matches) {
          state.controls.autoRotate = false
          clearResumeTimer()
        } else {
          state.controls.autoRotate = true
        }
        state.needsRender = true
      }
      state.motionQuery.addEventListener('change', state.onMotionChange)
    } catch (error) {
      state.motionQuery = null
    }
  }
  // init 内部已处理加载/构建失败；这里兜底，避免任何意外异常成为未处理的 Promise
  init().catch((error) => {
    console.warn('[landing] 太阳系初始化失败，已切换为静态星空：', error)
    fallback.value = true
  })
})

onBeforeUnmount(teardown)
</script>

<style scoped>
.landing {
  position: fixed;
  inset: 0;
  overflow: hidden;
  background: #000206;
  color: #cfe6ff;
  font-family: system-ui, -apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
}

/* three.js 画布铺满视口；触摸手势交给 OrbitControls */
.landing__stage {
  position: absolute;
  inset: 0;
  z-index: 0;
}

.landing__stage :deep(canvas) {
  display: block;
  width: 100%;
  height: 100%;
  touch-action: none;
  -webkit-user-select: none;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  cursor: grab;
}

.landing.is-dragging .landing__stage :deep(canvas) {
  cursor: grabbing;
}

/* 降级星空：纯 CSS 点光 + 两团低亮度星云，无脚本、无请求 */
.landing__fallback {
  position: absolute;
  inset: 0;
  z-index: 0;
  background:
    radial-gradient(circle 1.4px at 18% 24%, rgba(255, 255, 255, 0.82), rgba(255, 255, 255, 0) 70%),
    radial-gradient(circle 1.1px at 72% 18%, rgba(207, 226, 255, 0.7), rgba(207, 226, 255, 0) 70%),
    radial-gradient(circle 1.6px at 84% 62%, rgba(255, 236, 209, 0.62), rgba(255, 236, 209, 0) 70%),
    radial-gradient(circle 1px at 38% 72%, rgba(255, 255, 255, 0.6), rgba(255, 255, 255, 0) 70%),
    radial-gradient(circle 1.2px at 58% 42%, rgba(190, 214, 255, 0.55), rgba(190, 214, 255, 0) 70%),
    radial-gradient(circle 1px at 8% 58%, rgba(255, 255, 255, 0.5), rgba(255, 255, 255, 0) 70%),
    radial-gradient(circle 1.5px at 30% 12%, rgba(255, 255, 255, 0.45), rgba(255, 255, 255, 0) 70%),
    radial-gradient(circle 1px at 92% 38%, rgba(214, 206, 255, 0.5), rgba(214, 206, 255, 0) 70%),
    radial-gradient(circle 1.2px at 64% 86%, rgba(255, 255, 255, 0.4), rgba(255, 255, 255, 0) 70%),
    radial-gradient(ellipse 62% 48% at 68% 56%, rgba(72, 54, 146, 0.3), rgba(0, 0, 0, 0) 72%),
    radial-gradient(ellipse 52% 44% at 24% 78%, rgba(34, 66, 132, 0.26), rgba(0, 0, 0, 0) 72%),
    #000206;
}

/* 首次交互提示：极淡，交互或超时后消失 */
.landing__hint {
  position: fixed;
  left: 50%;
  bottom: calc(env(safe-area-inset-bottom) + 22px);
  z-index: 2;
  margin: 0;
  transform: translateX(-50%);
  font-size: 12px;
  letter-spacing: 0.14em;
  white-space: nowrap;
  color: rgba(158, 200, 244, 0.42);
  pointer-events: none;
  animation: landingHint 7s ease-in-out forwards;
}

@keyframes landingHint {
  0%,
  100% {
    opacity: 0;
  }
  18%,
  68% {
    opacity: 1;
  }
}

/* 降级说明：克制、不抢后台入口 */
.landing__notice {
  position: fixed;
  left: 50%;
  bottom: calc(env(safe-area-inset-bottom) + 26px);
  z-index: 2;
  width: min(420px, calc(100vw - 120px));
  margin: 0;
  transform: translateX(-50%);
  font-size: 12px;
  line-height: 1.7;
  letter-spacing: 0.04em;
  text-align: center;
  color: rgba(178, 205, 232, 0.55);
  pointer-events: none;
}

/* 隐蔽入口：静止时几乎不可见，悬停/聚焦时才浮现 */
.landing__entry {
  position: fixed;
  right: max(12px, env(safe-area-inset-right));
  bottom: max(12px, env(safe-area-inset-bottom));
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  color: rgba(146, 196, 232, 0.3);
  text-decoration: none;
  -webkit-tap-highlight-color: transparent;
  transition: color 0.25s ease, background-color 0.25s ease, box-shadow 0.25s ease;
}

.landing__entry:hover {
  color: rgba(186, 224, 255, 0.78);
}

.landing__entry:focus-visible {
  color: rgba(216, 241, 255, 0.96);
  background-color: rgba(88, 168, 255, 0.12);
  outline: 2px solid rgba(140, 214, 255, 0.9);
  outline-offset: 2px;
  box-shadow: 0 0 20px rgba(84, 168, 255, 0.42);
}

.landing__entry-mark {
  width: 18px;
  height: 18px;
}

.landing__entry-mark path,
.landing__entry-mark circle {
  fill: none;
  stroke: currentColor;
  stroke-width: 1.5;
  stroke-linejoin: round;
}

@media (max-width: 480px) {
  .landing__entry {
    width: 46px;
    height: 46px;
  }

  .landing__hint {
    font-size: 11px;
    letter-spacing: 0.1em;
  }
}

@media (prefers-reduced-motion: reduce) {
  .landing__hint {
    animation: none;
    opacity: 0;
  }

  .landing__entry {
    transition: none;
  }
}
</style>
