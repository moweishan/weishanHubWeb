// 执行：node scripts/check-solar-system.mjs
// 使用真实 three 对象检查模型，不依赖浏览器或 WebGL 环境。
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { createSolarSystem, PLANET_DEFS, computeFitDistance } from '../src/views/landing/solar-system.js'

const textures = new Set()
const makeTexture = () => {
  const texture = new THREE.Texture()
  textures.add(texture)
  return texture
}
const solar = createSolarSystem({
  three: THREE,
  textureFactory: Object.fromEntries(['sun', 'planet', 'ring', 'glow', 'star', 'nebula'].map(key => [key, makeTexture]))
})
assert.equal(solar.planets.length, 8, '太阳系应包含八大行星')
const initial = solar.planets.map(planet => ({ position: planet.holder.position.clone(), spin: planet.mesh.rotation.y }))
const originalStats = solar.stats()
for (let frame = 0; frame < 120; frame += 1) solar.update(1 / 60)
for (let i = 0; i < solar.planets.length; i += 1) {
  const planet = solar.planets[i]
  assert.ok(planet.holder.position.distanceTo(initial[i].position) > 0.1, `${planet.label}应持续公转`)
  assert.notEqual(planet.mesh.rotation.y, initial[i].spin, `${planet.label}应持续自转`)
  assert.ok(Math.abs(planet.holder.position.length() - PLANET_DEFS[i].distance) < 1e-8, `${planet.label}应保持轨道距离`)
}
assert.deepEqual(solar.stats(), originalStats, '逐帧推进不应持续分配几何体、材质或纹理')
const pausedPosition = solar.planets[0].holder.position.clone()
solar.update(0)
assert.ok(solar.planets[0].holder.position.equals(pausedPosition), '减少动效时应保持当前姿态')
assert.ok(solar.planets.find(planet => planet.key === 'saturn').holder.children.some(node => node.geometry?.type === 'RingGeometry'), '土星应包含环')

// 不同刷新率下，同样的模拟时间应产生相同的轨道与自转姿态。
const faster = createSolarSystem({ three: THREE, textureFactory: {} })
for (let frame = 0; frame < 240; frame += 1) faster.update(1 / 120)
for (let i = 0; i < 8; i += 1) {
  assert.ok(solar.planets[i].holder.position.distanceTo(faster.planets[i].holder.position) < 1e-8)
  assert.ok(Math.abs(solar.planets[i].mesh.rotation.y - faster.planets[i].mesh.rotation.y) < 1e-8)
}
faster.dispose()

// 验证桌面与竖屏的全景相机能容纳各条轨道上的位置。
for (const aspect of [1920 / 1080, 390 / 844]) {
  const camera = new THREE.PerspectiveCamera(50, aspect, 1, 4000)
  camera.position.setFromSphericalCoords(computeFitDistance(aspect), THREE.MathUtils.degToRad(62), THREE.MathUtils.degToRad(-42))
  camera.lookAt(0, 0, 0)
  camera.updateMatrixWorld()
  const point = new THREE.Vector3()
  for (const def of PLANET_DEFS) {
    for (let degrees = 0; degrees < 360; degrees += 5) {
      const angle = THREE.MathUtils.degToRad(degrees)
      const z = Math.sin(angle) * def.distance
      point.set(Math.cos(angle) * def.distance, z * Math.sin(def.inclination), z * Math.cos(def.inclination)).project(camera)
      assert.ok(Math.abs(point.x) < 1 && Math.abs(point.y) < 1, `${aspect}下${def.label}轨道应在视口内`)
    }
  }
}

const resources = new Set(textures)
let objects = 0
solar.scene.traverse(node => {
  if (node.isMesh || node.isPoints || node.isLineSegments || node.isSprite) objects += 1
  // Sprite 的内部几何体由 three 全局共享，不归单个场景所有。
  if (node.geometry && !node.isSprite) resources.add(node.geometry)
  if (node.material) resources.add(node.material)
})
assert.ok(objects < 40, '星空应使用批量粒子，避免为每颗星创建绘制对象')
let releases = 0
for (const resource of resources) resource.addEventListener('dispose', () => { releases += 1 })
solar.dispose()
assert.equal(releases, resources.size, '场景拥有的 GPU 资源应全部释放')
assert.equal(solar.scene.children.length, 0)
assert.equal(solar.stats().disposed, true)
solar.dispose()
assert.equal(releases, resources.size, '重复释放应安全')
console.log(`通过：八大行星公转/自转、刷新率独立、竖屏全景、${objects}个绘制对象及${releases}项资源释放`)
