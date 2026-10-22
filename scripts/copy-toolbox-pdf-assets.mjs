/**
 * 把 pdfjs-dist 的 cMaps、standard_fonts 与 wasm 复制到 public/toolbox-generated/pdfjs。
 *
 * 只写入本脚本自己的生成目录，不删除其他目录或用户文件。
 * predev / prebuild:prod / prebuild:stage 会自动调用。
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const webRoot = dirname(scriptDir)
const pdfjsRoot = join(webRoot, 'node_modules', 'pdfjs-dist')
const targetRoot = join(webRoot, 'public', 'toolbox-generated', 'pdfjs')
const assets = ['cmaps', 'standard_fonts', 'wasm']

if (!existsSync(pdfjsRoot)) {
  console.error('[toolbox-pdf-assets] 未找到 pdfjs-dist，请先执行 npm install。')
  process.exit(1)
}

mkdirSync(targetRoot, { recursive: true })

function copyTree(source, target) {
  mkdirSync(target, { recursive: true })
  for (const entry of readdirSync(source, { withFileTypes: true })) {
    const sourcePath = join(source, entry.name)
    const targetPath = join(target, entry.name)
    if (entry.isDirectory()) copyTree(sourcePath, targetPath)
    else if (entry.isFile()) copyFileSync(sourcePath, targetPath)
  }
}

const copied = []
for (const name of assets) {
  const source = join(pdfjsRoot, name)
  if (!existsSync(source)) {
    console.error(`[toolbox-pdf-assets] pdfjs-dist 缺少 ${name} 目录。`)
    process.exit(1)
  }
  copyTree(source, join(targetRoot, name))
  copied.push(name)
}

writeFileSync(
  join(targetRoot, '.generated-by-copy-toolbox-pdf-assets.json'),
  JSON.stringify(
    {
      generatedBy: 'scripts/copy-toolbox-pdf-assets.mjs',
      source: 'node_modules/pdfjs-dist',
      assets: copied,
      note: '本目录由 predev/prebuild 自动生成，不提交。'
    },
    null,
    2
  )
)

console.log(`[toolbox-pdf-assets] 已准备 pdfjs 本地资产：${copied.join(', ')}`)
