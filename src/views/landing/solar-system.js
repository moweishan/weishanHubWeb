/**
 * 太阳系场景（纯 three.js 模块）
 *
 * 职责：构建场景、逐帧推进、释放资源。不监听任何浏览器事件，也不引用 Vue，
 * 且不静态 import three：THREE 由调用方通过 options.three 注入，浏览器用 CDN 加载的
 * 运行时，Node 回归测试用 npm three。因此可以在 Node 中验证轨道与释放逻辑。
 *
 * 贴图通过 options.textureFactory 注入；默认实现基于 CanvasTexture 程序化绘制，
 * 零外部图片请求。Node 下未注入时会自动退化为纯色材质。
 *
 * 尺度：半径、轨道距离、公转/自转速度均为展示比例，不是天文等比例。
 */

const TAU = Math.PI * 2

/** 太阳半径（场景单位） */
export const SUN_RADIUS = 5

/** 太阳系展示外接半径：用于计算“全景”相机距离 */
export const SCENE_RADIUS = 80

/**
 * 八大行星展示参数。
 * distance / radius / orbitSpeed / spinSpeed 都是观感比例，不是天文数据：
 * 真实比例下行星会小到不可见、轨道会远到无法同屏。
 */
export const PLANET_DEFS = [
  { key: 'mercury', label: '水星', radius: 0.58, distance: 13.5, orbitSpeed: 0.42, spinSpeed: 0.25, axialTilt: 0.02, inclination: 0.06, startAngle: 0.4, color: 0x9a8f82 },
  { key: 'venus', label: '金星', radius: 0.92, distance: 17.5, orbitSpeed: 0.3, spinSpeed: 0.14, axialTilt: 0.05, inclination: 0.035, startAngle: 2, color: 0xe0c68d },
  { key: 'earth', label: '地球', radius: 1, distance: 22.5, orbitSpeed: 0.22, spinSpeed: 1.05, axialTilt: 0.41, inclination: 0, startAngle: 3.7, color: 0x2f6fbf },
  { key: 'mars', label: '火星', radius: 0.72, distance: 28, orbitSpeed: 0.17, spinSpeed: 0.92, axialTilt: 0.44, inclination: 0.03, startAngle: 5.2, color: 0xb5522f },
  { key: 'jupiter', label: '木星', radius: 3, distance: 40, orbitSpeed: 0.095, spinSpeed: 2, axialTilt: 0.05, inclination: 0.02, startAngle: 1.1, color: 0xd8b48a },
  { key: 'saturn', label: '土星', radius: 2.5, distance: 53, orbitSpeed: 0.07, spinSpeed: 1.8, axialTilt: 0.47, inclination: 0.045, startAngle: 2.9, color: 0xdcc49a, ring: { inner: 3.3, outer: 5.3 } },
  { key: 'uranus', label: '天王星', radius: 1.55, distance: 65, orbitSpeed: 0.05, spinSpeed: 1.2, axialTilt: 1.71, inclination: 0.02, startAngle: 4.4, color: 0x8fd3dc },
  { key: 'neptune', label: '海王星', radius: 1.5, distance: 75, orbitSpeed: 0.04, spinSpeed: 1.1, axialTilt: 0.49, inclination: 0.035, startAngle: 5.9, color: 0x3f66d6 }
]

/** 全景相机距离：竖屏时按水平视场角计算，保证整个太阳系都在画面内 */
export function computeFitDistance(aspect, fovDeg = 50, radius = SCENE_RADIUS, padding = 1.06) {
  const safeAspect = Math.max(0.3, Number(aspect) || 1)
  const halfFov = (fovDeg * Math.PI) / 360
  const vertical = radius / Math.tan(halfFov)
  return Math.max(vertical, vertical / safeAspect) * padding
}

/* ---------------- 确定性随机 ---------------- */

// 同一 seed 每次生成相同外观，便于调试、截图比对和 Node 断言
export function createRandom(seed) {
  let s = (seed >>> 0) || 0x2f6e2b1
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hashString(value) {
  let h = 0x811c9dc5
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/* ---------------- Canvas 绘制小工具 ---------------- */

const hexCache = new Map()

// '#rrggbb' + 透明度 -> 'rgba(...)'，避免逐块拼字符串时解析颜色
function rgba(hex, alpha) {
  let rgb = hexCache.get(hex)
  if (!rgb) {
    const value = parseInt(hex.slice(1), 16)
    rgb = [(value >> 16) & 255, (value >> 8) & 255, value & 255]
    hexCache.set(hex, rgb)
  }
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`
}

// 柔和斑块：经度方向跨边界时补画，保证球面贴图接缝不明显
function paintBlob(ctx, w, cx, cy, rx, ry, color, alpha) {
  for (let k = -1; k <= 1; k += 1) {
    const x = cx + k * w
    if (x + rx < 0 || x - rx > w) continue
    const gradient = ctx.createRadialGradient(x, cy, 0, x, cy, Math.max(0.5, rx))
    gradient.addColorStop(0, rgba(color, alpha))
    gradient.addColorStop(0.55, rgba(color, alpha * 0.5))
    gradient.addColorStop(1, rgba(color, 0))
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.ellipse(x, cy, rx, ry, 0, 0, TAU)
    ctx.fill()
  }
}

// 气态行星的水平条带：整幅宽度的柔和渐变，天然左右无缝
function paintBands(ctx, w, h, colors, count, alpha) {
  const bandHeight = h / count
  for (let i = 0; i < count; i += 1) {
    const y = i * bandHeight
    const gradient = ctx.createLinearGradient(0, y, 0, y + bandHeight)
    gradient.addColorStop(0, rgba(colors[i % colors.length], 0))
    gradient.addColorStop(0.5, rgba(colors[i % colors.length], alpha))
    gradient.addColorStop(1, rgba(colors[i % colors.length], 0))
    ctx.fillStyle = gradient
    ctx.fillRect(0, y - bandHeight * 0.12, w, bandHeight * 1.24)
  }
}

// 极冠：上下边缘各一段渐隐的白（冰）色
function paintCaps(ctx, w, h, color, ratio) {
  const top = ctx.createLinearGradient(0, 0, 0, h * ratio)
  top.addColorStop(0, rgba(color, 0.92))
  top.addColorStop(1, rgba(color, 0))
  ctx.fillStyle = top
  ctx.fillRect(0, 0, w, h * ratio)
  const bottom = ctx.createLinearGradient(0, h, 0, h * (1 - ratio))
  bottom.addColorStop(0, rgba(color, 0.92))
  bottom.addColorStop(1, rgba(color, 0))
  ctx.fillStyle = bottom
  ctx.fillRect(0, h * (1 - ratio), w, h * ratio)
}

/* ---------------- 各行星表面画法 ---------------- */

const SURFACE_PAINTERS = {
  mercury(ctx, w, h, rng) {
    ctx.fillStyle = '#8d8377'
    ctx.fillRect(0, 0, w, h)
    for (let i = 0; i < 80; i += 1) {
      paintBlob(ctx, w, rng() * w, rng() * h, w * (0.015 + rng() * 0.05), h * (0.02 + rng() * 0.06), rng() < 0.55 ? '#6a6157' : '#b6ab9d', 0.18 + rng() * 0.22)
    }
    // 少量年轻陨石坑的亮环
    for (let i = 0; i < 12; i += 1) {
      ctx.strokeStyle = 'rgba(232, 223, 208, 0.2)'
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.arc(rng() * w, rng() * h, w * (0.01 + rng() * 0.018), 0, TAU)
      ctx.stroke()
    }
  },

  venus(ctx, w, h, rng) {
    ctx.fillStyle = '#dfc58c'
    ctx.fillRect(0, 0, w, h)
    paintBands(ctx, w, h, ['#f4e4b8', '#d3ae6c', '#eed79f'], 9, 0.42)
    for (let i = 0; i < 46; i += 1) {
      paintBlob(ctx, w, rng() * w, rng() * h, w * (0.05 + rng() * 0.14), h * (0.01 + rng() * 0.03), rng() < 0.5 ? '#fff0c8' : '#c39b58', 0.08 + rng() * 0.12)
    }
  },

  earth(ctx, w, h, rng) {
    const ocean = ctx.createLinearGradient(0, 0, 0, h)
    ocean.addColorStop(0, '#0b3160')
    ocean.addColorStop(0.5, '#1667b5')
    ocean.addColorStop(1, '#0b3160')
    ctx.fillStyle = ocean
    ctx.fillRect(0, 0, w, h)

    // 大陆：若干中心点向外叠加不规则斑块，形成海岸线
    const land = ['#2e7539', '#3d8443', '#5c8b39', '#8a8a45', '#77683a']
    const centers = [
      [0.22, 0.32, 0.12], [0.28, 0.66, 0.09], [0.52, 0.34, 0.15],
      [0.56, 0.62, 0.1], [0.72, 0.7, 0.06], [0.82, 0.36, 0.12], [0.94, 0.72, 0.05]
    ]
    for (const [cx, cy, spread] of centers) {
      for (let i = 0; i < 18; i += 1) {
        const angle = rng() * TAU
        const dist = Math.sqrt(rng()) * spread
        paintBlob(
          ctx, w,
          (cx + Math.cos(angle) * dist) * w,
          (cy + Math.sin(angle) * dist * 0.72) * h,
          w * (0.022 + rng() * 0.05),
          h * (0.03 + rng() * 0.07),
          land[(rng() * land.length) | 0],
          0.55 + rng() * 0.3
        )
      }
    }
    // 沙漠与高原
    for (let i = 0; i < 16; i += 1) {
      paintBlob(ctx, w, rng() * w, h * (0.36 + rng() * 0.24), w * (0.02 + rng() * 0.04), h * (0.02 + rng() * 0.05), '#b7a066', 0.16 + rng() * 0.16)
    }
    // 稀薄云系
    for (let i = 0; i < 26; i += 1) {
      paintBlob(ctx, w, rng() * w, rng() * h, w * (0.04 + rng() * 0.1), h * (0.012 + rng() * 0.035), '#ffffff', 0.07 + rng() * 0.1)
    }
    paintCaps(ctx, w, h, '#eef6ff', 0.1)
  },

  mars(ctx, w, h, rng) {
    ctx.fillStyle = '#a9482a'
    ctx.fillRect(0, 0, w, h)
    for (let i = 0; i < 26; i += 1) {
      paintBlob(ctx, w, rng() * w, h * (0.2 + rng() * 0.6), w * (0.04 + rng() * 0.12), h * (0.03 + rng() * 0.1), rng() < 0.6 ? '#7c3520' : '#c9773f', 0.24 + rng() * 0.24)
    }
    // 暗色峡谷带
    for (let i = 0; i < 10; i += 1) {
      paintBlob(ctx, w, rng() * w, h * (0.42 + rng() * 0.2), w * (0.05 + rng() * 0.1), h * 0.014, '#6c2c18', 0.22)
    }
    paintCaps(ctx, w, h, '#f2ece2', 0.07)
  },

  jupiter(ctx, w, h, rng) {
    ctx.fillStyle = '#d3b184'
    ctx.fillRect(0, 0, w, h)
    paintBands(ctx, w, h, ['#f4e6c8', '#c49a63', '#e9cf9e', '#96683c', '#f7edd6'], 18, 0.5)
    // 湍流细纹：横向拉长的斑块打散条带边缘
    for (let i = 0; i < 70; i += 1) {
      paintBlob(ctx, w, rng() * w, rng() * h, w * (0.04 + rng() * 0.1), h * (0.008 + rng() * 0.02), rng() < 0.5 ? '#f6ecd4' : '#a2733f', 0.1 + rng() * 0.14)
    }
    // 大红斑：暗红核心 + 浅色外晕
    paintBlob(ctx, w, w * 0.68, h * 0.62, w * 0.085, h * 0.06, '#b9502f', 0.9)
    paintBlob(ctx, w, w * 0.68, h * 0.62, w * 0.115, h * 0.078, '#e2a07a', 0.22)
  },

  saturn(ctx, w, h, rng) {
    ctx.fillStyle = '#e0c99b'
    ctx.fillRect(0, 0, w, h)
    paintBands(ctx, w, h, ['#f0e0b8', '#cba970', '#e8d3a4'], 14, 0.4)
    for (let i = 0; i < 40; i += 1) {
      paintBlob(ctx, w, rng() * w, rng() * h, w * (0.05 + rng() * 0.12), h * (0.006 + rng() * 0.016), '#fbf0d2', 0.08 + rng() * 0.1)
    }
    paintBlob(ctx, w, w * 0.5, h * 0.12, w * 0.05, h * 0.05, '#c2a26a', 0.22)
  },

  uranus(ctx, w, h, rng) {
    ctx.fillStyle = '#93d8e2'
    ctx.fillRect(0, 0, w, h)
    paintBands(ctx, w, h, ['#b7e9ef', '#7fc3d1', '#a5e0e8'], 8, 0.3)
    for (let i = 0; i < 18; i += 1) {
      paintBlob(ctx, w, rng() * w, rng() * h, w * (0.08 + rng() * 0.16), h * (0.01 + rng() * 0.02), '#d8f6f9', 0.08 + rng() * 0.08)
    }
  },

  neptune(ctx, w, h, rng) {
    ctx.fillStyle = '#2f55c4'
    ctx.fillRect(0, 0, w, h)
    paintBands(ctx, w, h, ['#3f6bdb', '#2748a8', '#527fef'], 10, 0.35)
    // 大暗斑与高空亮云
    paintBlob(ctx, w, w * 0.35, h * 0.62, w * 0.07, h * 0.05, '#1c2f78', 0.5)
    for (let i = 0; i < 12; i += 1) {
      paintBlob(ctx, w, rng() * w, h * (0.3 + rng() * 0.4), w * (0.03 + rng() * 0.06), h * (0.008 + rng() * 0.014), '#eaf2ff', 0.12 + rng() * 0.1)
    }
  }
}

/* ---------------- 默认浏览器贴图工厂 ---------------- */

/**
 * 程序化贴图工厂：所有纹理在首次构建时绘制一次，之后随 dispose 统一释放。
 * 返回的每个值都是 THREE.Texture，调用方无需关心 Canvas 细节。
 *
 * @param {object} options
 * @param {object} options.three three 模块命名空间
 * @param {number} [options.textureSize] 行星贴图宽度
 * @param {number} [options.seed] 贴图随机种子
 */
export function createCanvasTextureFactory(options = {}) {
  const THREE = options.three
  if (!THREE) throw new TypeError('createCanvasTextureFactory 需要传入 three 对象')
  const size = Math.max(128, options.textureSize || 512)
  const seed = (options.seed || 0x51ed270b) >>> 0

  const canvas2d = (w, h) => {
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    return { canvas, ctx: canvas.getContext('2d') }
  }

  const toTexture = (canvas, repeat = false) => {
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.wrapS = repeat ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping
    texture.wrapT = THREE.ClampToEdgeWrapping
    texture.anisotropy = 2
    return texture
  }

  return {
    // 行星表面：2:1 等距圆柱贴图，经度方向可无缝平铺
    planet(def) {
      const w = size
      const h = Math.round(size / 2)
      const { canvas, ctx } = canvas2d(w, h)
      const rng = createRandom(seed ^ hashString(def.key))
      ctx.fillStyle = '#000000'
      ctx.fillRect(0, 0, w, h)
      const painter = SURFACE_PAINTERS[def.key] || SURFACE_PAINTERS.mercury
      painter(ctx, w, h, rng)
      return toTexture(canvas, true)
    },

    // 太阳：暖白核心 + 米粒组织 + 少量暗斑
    sun() {
      const w = size
      const h = Math.round(size / 2)
      const { canvas, ctx } = canvas2d(w, h)
      const rng = createRandom(seed ^ 0x51f15e)
      const gradient = ctx.createLinearGradient(0, 0, 0, h)
      gradient.addColorStop(0, '#ff8c26')
      gradient.addColorStop(0.18, '#ffb347')
      gradient.addColorStop(0.5, '#ffe291')
      gradient.addColorStop(0.82, '#ffb347')
      gradient.addColorStop(1, '#ff8c26')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, w, h)
      for (let i = 0; i < 220; i += 1) {
        paintBlob(ctx, w, rng() * w, rng() * h, w * (0.01 + rng() * 0.045), h * (0.02 + rng() * 0.08), rng() < 0.5 ? '#fff6cf' : '#ffb63d', 0.08 + rng() * 0.16)
      }
      for (let i = 0; i < 8; i += 1) {
        paintBlob(ctx, w, rng() * w, rng() * h, w * 0.012, h * 0.02, '#c2550f', 0.35)
      }
      return toTexture(canvas, true)
    },

    // 柔和辉光：日冕与灯晕共用，白心暖边，Additive 叠加时没有硬边
    glow() {
      const s = 256
      const c = s / 2
      const { canvas, ctx } = canvas2d(s, s)
      for (let i = 0; i < 4; i += 1) {
        const radius = c * (0.3 + i * 0.17)
        const gradient = ctx.createRadialGradient(c, c, 0, c, c, radius)
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.62)')
        gradient.addColorStop(0.28, 'rgba(255, 246, 220, 0.3)')
        gradient.addColorStop(0.62, 'rgba(255, 214, 150, 0.09)')
        gradient.addColorStop(1, 'rgba(255, 200, 120, 0)')
        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, s, s)
      }
      return toTexture(canvas)
    },

    // 土星环：逐像素径向明暗 + 卡西尼缝。RingGeometry 的 UV 以“外半径”归一化，
    // 半径 rho 对应的纹理像素半径正好是 rho * (s / 2)，一条 1px 圆环即一档亮度。
    ring(def) {
      const s = 256
      const c = s / 2
      const innerRatio = def.ring.inner / def.ring.outer
      const innerPx = innerRatio * c
      const { canvas, ctx } = canvas2d(s, s)
      for (let r = Math.ceil(innerPx); r < c; r += 1) {
        const t = (r - innerPx) / (c - innerPx)
        let alpha = 0.42 + 0.3 * Math.sin(t * 42 + 0.7) * Math.sin(t * 11.3)
        alpha *= 1 - 0.9 * Math.exp(-Math.pow((t - 0.44) / 0.05, 2))
        alpha *= 1 - 0.55 * Math.exp(-Math.pow((t - 0.86) / 0.06, 2))
        alpha *= Math.min(1, t * 9, (1 - t) * 9)
        if (alpha <= 0.012) continue
        const warm = 0.5 + 0.5 * Math.sin(t * 7 + 1.3)
        ctx.strokeStyle = `rgba(${(240 - 36 * warm) | 0}, ${(226 - 44 * warm) | 0}, ${(198 - 58 * warm) | 0}, ${alpha.toFixed(3)})`
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.arc(c, c, r, 0, TAU)
        ctx.stroke()
      }
      return toTexture(canvas)
    },

    // 星点 sprite：亮核 + 快速衰减的柔边，点精灵缩小时仍然像星
    star() {
      const s = 64
      const c = s / 2
      const { canvas, ctx } = canvas2d(s, s)
      const gradient = ctx.createRadialGradient(c, c, 0, c, c, c)
      gradient.addColorStop(0, 'rgba(255, 255, 255, 1)')
      gradient.addColorStop(0.16, 'rgba(255, 255, 255, 0.85)')
      gradient.addColorStop(0.38, 'rgba(255, 255, 255, 0.25)')
      gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.05)')
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, s, s)
      const texture = toTexture(canvas)
      // 星点常被压到 1~3px：关闭 mipmap，避免缩小时把亮核平均成一圈近乎透明的灰
      texture.generateMipmaps = false
      texture.minFilter = THREE.LinearFilter
      return texture
    },

    // 星云 sprite：几团低亮度光雾 + 圆形羽化，避免方块边界
    nebula(rgb, variant = 0) {
      const s = 256
      const { canvas, ctx } = canvas2d(s, s)
      const rng = createRandom(seed ^ (0x9e3779b1 + variant * 977))
      for (let i = 0; i < 6; i += 1) {
        const cx = s * (0.2 + rng() * 0.6)
        const cy = s * (0.25 + rng() * 0.5)
        const radius = s * (0.16 + rng() * 0.26)
        const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius)
        gradient.addColorStop(0, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.3)`)
        gradient.addColorStop(0.4, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.12)`)
        gradient.addColorStop(1, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0)`)
        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, s, s)
      }
      ctx.globalCompositeOperation = 'destination-in'
      const fade = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
      fade.addColorStop(0, 'rgba(0, 0, 0, 1)')
      fade.addColorStop(0.55, 'rgba(0, 0, 0, 0.75)')
      fade.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.fillStyle = fade
      ctx.fillRect(0, 0, s, s)
      ctx.globalCompositeOperation = 'source-over'
      return toTexture(canvas)
    }
  }
}

/* ---------------- 星空 / 星云参数 ---------------- */

// size 为屏幕像素（PointsMaterial 内部会乘设备像素比）：
// 用固定像素尺寸，避免远处星点在世界坐标衰减下变成不到的亚像素而消失
const STAR_LAYERS = [
  { count: 18000, size: 1.3, inner: 780, outer: 2000, warm: 0.24, brightness: 0.9, seed: 0x1f3a5c7d },
  { count: 6000, size: 2.0, inner: 540, outer: 1400, warm: 0.32, brightness: 1.2, seed: 0x6a1b9c3e },
  { count: 600, size: 3.8, inner: 480, outer: 1100, warm: 0.5, brightness: 1.4, seed: 0x2d5e8f4a }
]

const COOL_STARS = ['#ffffff', '#dbe9ff', '#b9d4ff', '#9fc2ff', '#eaf2ff']
const WARM_STARS = ['#ffe9c4', '#ffd9a3', '#fff3dc']

const NEBULAE = [
  { rgb: [66, 78, 205], scale: 660, radius: 950, dir: [-0.55, 0.18, -0.82], opacity: 0.38 },
  { rgb: [116, 70, 198], scale: 520, radius: 1020, dir: [0.72, -0.24, -0.62], opacity: 0.32 },
  { rgb: [42, 100, 172], scale: 740, radius: 1100, dir: [0.2, 0.55, 0.8], opacity: 0.26 },
  { rgb: [136, 82, 196], scale: 460, radius: 880, dir: [-0.8, -0.4, 0.45], opacity: 0.22 }
]

/**
 * 构建太阳系场景。
 *
 * @param {object} options
 * @param {object} options.three three 模块命名空间（浏览器来自 CDN 加载器，Node 测试传 npm three）
 * @param {object} [options.textureFactory] 贴图工厂；缺省时浏览器用 CanvasTexture，
 *   非浏览器环境退化为纯色材质。Node 中可传 {} 直接验证轨道与释放。
 * @param {'high'|'low'} [options.detail] 细节档位（移动端用 low）
 * @param {number} [options.textureSize] 行星贴图宽度
 * @param {number} [options.seed] 贴图随机种子
 */
export function createSolarSystem(options = {}) {
  const THREE = options.three
  if (!THREE) throw new TypeError('createSolarSystem 需要传入 three 对象')
  const low = options.detail === 'low'
  const textureFactory = options.textureFactory
    || (typeof document !== 'undefined'
      ? createCanvasTextureFactory({ three: THREE, textureSize: options.textureSize || (low ? 384 : 512), seed: options.seed })
      : null)

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x000206)

  const geometries = []
  const materials = []
  const textures = []
  const planets = []
  const corona = []
  let disposed = false
  let elapsed = 0

  const ownGeometry = (geometry) => {
    geometries.push(geometry)
    return geometry
  }
  const ownMaterial = (material) => {
    materials.push(material)
    return material
  }

  // 贴图工厂是可选依赖：缺失、抛错或返回空值都退化为纯色材质
  const safeTexture = (kind, ...args) => {
    const create = textureFactory && textureFactory[kind]
    if (typeof create !== 'function') return null
    let texture = null
    try {
      texture = create(...args)
    } catch (error) {
      texture = null
    }
    if (!texture || texture.isTexture !== true) return null
    if ('colorSpace' in texture) texture.colorSpace = THREE.SRGBColorSpace
    textures.push(texture)
    return texture
  }

  /* ---------- 光照：太阳点光源是唯一主光，环境光只负责托底 ---------- */
  // 冷色环境光让背光面保留一点体积感；点光源 decay = 0 才能照到外行星
  scene.add(new THREE.AmbientLight(0x92a8cc, 1.3))
  scene.add(new THREE.PointLight(0xfff1d8, 2.6, 0, 0))

  /* ---------- 太阳与日冕 ---------- */
  const sunTexture = safeTexture('sun')
  const sun = new THREE.Mesh(
    ownGeometry(new THREE.SphereGeometry(SUN_RADIUS, 48, 32)),
    ownMaterial(new THREE.MeshBasicMaterial(sunTexture ? { map: sunTexture } : { color: 0xffc861 }))
  )
  const sunGroup = new THREE.Group()
  sunGroup.add(sun)

  const glowTexture = safeTexture('glow')
  const coronaSpecs = [
    { tint: 0xffd9a0, scale: SUN_RADIUS * 4.2, opacity: 0.7 },
    { tint: 0xffb469, scale: SUN_RADIUS * 7.4, opacity: 0.3 }
  ]
  if (glowTexture) {
    for (const spec of coronaSpecs) {
      const sprite = new THREE.Sprite(ownMaterial(new THREE.SpriteMaterial({
        map: glowTexture,
        color: spec.tint,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        opacity: spec.opacity
      })))
      sprite.scale.setScalar(spec.scale)
      sunGroup.add(sprite)
      corona.push({ sprite, baseScale: spec.scale })
    }
  }
  scene.add(sunGroup)

  /* ---------- 行星 + 倾斜光环 + 合并轨道线 ---------- */
  // 单位球共用一份几何体，各行星通过 scale 得到自己的大小，控制显存与 draw call
  const unitSphere = ownGeometry(new THREE.SphereGeometry(1, low ? 28 : 40, low ? 18 : 24))
  const orbitPositions = []
  const orbitColors = []
  const orbitSteps = low ? 120 : 160

  for (let index = 0; index < PLANET_DEFS.length; index += 1) {
    const def = PLANET_DEFS[index]
    const holder = new THREE.Group()
    holder.rotation.z = def.axialTilt

    const surface = safeTexture('planet', def)
    const material = ownMaterial(surface
      ? new THREE.MeshStandardMaterial({ map: surface, roughness: 0.88, metalness: 0.03 })
      : new THREE.MeshStandardMaterial({ color: def.color, roughness: 0.88 }))
    const mesh = new THREE.Mesh(unitSphere, material)
    mesh.scale.setScalar(def.radius)
    holder.add(mesh)

    if (def.ring) {
      const ringTexture = safeTexture('ring', def)
      const ringMaterial = ownMaterial(ringTexture
        ? new THREE.MeshBasicMaterial({
          map: ringTexture,
          side: THREE.DoubleSide,
          transparent: true,
          alphaTest: 0.02,
          depthWrite: false
        })
        : new THREE.MeshBasicMaterial({
          color: 0xd8c49a,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.5,
          depthWrite: false
        }))
      const ring = new THREE.Mesh(ownGeometry(new THREE.RingGeometry(def.ring.inner, def.ring.outer, 128, 1)), ringMaterial)
      ring.rotation.x = -Math.PI / 2
      holder.add(ring)
    }

    scene.add(holder)
    planets.push({
      key: def.key,
      label: def.label,
      holder,
      mesh,
      distance: def.distance,
      angle: def.startAngle,
      orbitSpeed: def.orbitSpeed,
      spinSpeed: def.spinSpeed,
      sinI: Math.sin(def.inclination),
      cosI: Math.cos(def.inclination)
    })

    // 轨道线与行星使用同一套倾斜公式，运行时位置严格落在线上
    const tint = new THREE.Color(0x8fb4e8).lerp(new THREE.Color(def.color), 0.3)
    for (let i = 0; i < orbitSteps; i += 1) {
      const angles = [(i / orbitSteps) * TAU, ((i + 1) / orbitSteps) * TAU]
      for (const angle of angles) {
        const x = Math.cos(angle) * def.distance
        const z0 = Math.sin(angle) * def.distance
        orbitPositions.push(x, z0 * Math.sin(def.inclination), z0 * Math.cos(def.inclination))
        orbitColors.push(tint.r, tint.g, tint.b)
      }
    }
  }

  const orbitGeometry = ownGeometry(new THREE.BufferGeometry())
  orbitGeometry.setAttribute('position', new THREE.Float32BufferAttribute(orbitPositions, 3))
  orbitGeometry.setAttribute('color', new THREE.Float32BufferAttribute(orbitColors, 3))
  scene.add(new THREE.LineSegments(orbitGeometry, ownMaterial(new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.16,
    depthWrite: false
  }))))

  /* ---------- 星空（三层 Points 合批）+ 星云 ---------- */
  const skyGroup = new THREE.Group()
  skyGroup.rotation.set(0.1, 0, 0.26)
  scene.add(skyGroup)

  const starTexture = safeTexture('star')
  let brightLayer = null
  let starCount = 0

  for (const layer of STAR_LAYERS) {
    const count = Math.max(80, Math.round(layer.count * (low ? 0.42 : 1)))
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const rng = createRandom(layer.seed)
    const color = new THREE.Color()

    for (let i = 0; i < count; i += 1) {
      const phi = rng() * TAU
      // 约四成星点压向一个平面，形成淡淡的银河带
      let y = rng() * 2 - 1
      if (rng() < 0.42) y *= 0.16
      const planar = Math.sqrt(Math.max(0, 1 - y * y))
      const radius = layer.inner + (layer.outer - layer.inner) * Math.cbrt(rng())
      positions[i * 3] = Math.cos(phi) * planar * radius
      positions[i * 3 + 1] = y * radius
      positions[i * 3 + 2] = Math.sin(phi) * planar * radius

      const palette = rng() < layer.warm ? WARM_STARS : COOL_STARS
      color.set(palette[(rng() * palette.length) | 0])
      const level = layer.brightness * (0.4 + 0.6 * Math.pow(rng(), 1.4))
      colors[i * 3] = color.r * level
      colors[i * 3 + 1] = color.g * level
      colors[i * 3 + 2] = color.b * level
    }

    const geometry = ownGeometry(new THREE.BufferGeometry())
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    const points = new THREE.Points(geometry, ownMaterial(new THREE.PointsMaterial({
      size: layer.size,
      sizeAttenuation: false,
      vertexColors: true,
      map: starTexture,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })))
    points.frustumCulled = false
    skyGroup.add(points)
    starCount += count
    brightLayer = points // 最后一层最亮，明暗呼吸只作用于它
  }

  for (let i = 0; i < NEBULAE.length; i += 1) {
    const def = NEBULAE[i]
    const texture = safeTexture('nebula', def.rgb, i)
    if (!texture) continue
    const sprite = new THREE.Sprite(ownMaterial(new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: def.opacity
    })))
    const dir = new THREE.Vector3(def.dir[0], def.dir[1], def.dir[2]).normalize()
    sprite.position.copy(dir.multiplyScalar(def.radius))
    sprite.scale.setScalar(def.scale)
    skyGroup.add(sprite)
  }

  /* ---------- 逐帧推进：只做数值计算，不创建对象 ---------- */
  function update(dt) {
    if (disposed) return
    const step = dt > 0 ? Math.min(dt, 0.1) : 0
    elapsed += step
    sun.rotation.y += step * 0.05

    for (let i = 0; i < planets.length; i += 1) {
      const planet = planets[i]
      planet.angle += step * planet.orbitSpeed
      const x = Math.cos(planet.angle) * planet.distance
      const z = Math.sin(planet.angle) * planet.distance
      planet.holder.position.set(x, z * planet.sinI, z * planet.cosI)
      planet.mesh.rotation.y += step * planet.spinSpeed
    }

    // 极轻的日冕呼吸与亮星明暗，避免画面像静态图
    if (corona.length) {
      const pulse = 1 + Math.sin(elapsed * 0.55) * 0.025
      for (let i = 0; i < corona.length; i += 1) {
        corona[i].sprite.scale.setScalar(corona[i].baseScale * pulse)
      }
    }
    if (brightLayer) {
      brightLayer.material.opacity = 0.9 + Math.sin(elapsed * 0.8) * 0.08
    }
  }

  function dispose() {
    if (disposed) return
    disposed = true
    for (let i = 0; i < geometries.length; i += 1) geometries[i].dispose()
    for (let i = 0; i < materials.length; i += 1) materials[i].dispose()
    for (let i = 0; i < textures.length; i += 1) textures[i].dispose()
    geometries.length = 0
    materials.length = 0
    textures.length = 0
    planets.length = 0
    corona.length = 0
    brightLayer = null
    scene.clear()
  }

  update(0)

  return {
    scene,
    sun,
    planets,
    update,
    dispose,
    /** 便于 Node 侧断言资源是否已释放 */
    stats() {
      return {
        planets: planets.length,
        geometries: geometries.length,
        materials: materials.length,
        textures: textures.length,
        stars: starCount,
        disposed
      }
    }
  }
}
