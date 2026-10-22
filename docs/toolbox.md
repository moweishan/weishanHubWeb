# 工具箱（Toolbox）

weishanHub 原生工具箱，与 `magicTools` 同级，入口 `/toolbox`。当前 5 个分类、63 个叶子工具全部完成，目录注册表与动态菜单字段一致。

## 分类

| key | 中文名 | 数量 |
| --- | --- | --- |
| `files` | 文件处理 | 5 |
| `convert` | 格式转换 | 20 |
| `web` | 网页工具 | 16 |
| `development` | 开发辅助 | 14 |
| `security` | 加密与安全 | 8 |

## 文件结构

| 路径 | 说明 |
| --- | --- |
| `src/data/toolbox/catalog.js` | 63 项 JSON 可序列化注册表、5 个分类、JSON 导出 |
| `src/data/toolbox/static.js` | MIME、HTTP、Git、Regex 静态速查 |
| `src/components/Toolbox/ToolPage.vue` | 统一标题、说明、移动端样式、短隐私提示、keep-alive 停用事件 |
| `src/components/Toolbox/ToolResult.vue` | 文本/结构化结果、复制/下载/清空、错误与警告 |
| `src/components/Toolbox/FileDrop.vue` | 单文件本地选择，不自动上传 |
| `src/components/Toolbox/MultiFileDrop.vue` | 多文件本地选择，不自动上传 |
| `src/components/Toolbox/tools/{files,convert,web,development,security}` | 63 个工具实现 |
| `src/views/toolbox/**/index.vue` | 63 个独立薄包装页面，component 与 catalog 一致 |
| `src/utils/toolbox/*.js` | 纯函数、WebCrypto、Worker、PDF/CSV/图片处理核心 |
| `scripts/copy-toolbox-pdf-assets.mjs` | 复制 pdfjs cmaps/standard_fonts/wasm 到本地 public |
| `tests/toolbox/*.test.js` | Node 测试（含目录/SQL 匹配、PDF/CSV/页范围、签名未签名/坏文件） |
| `THIRD_PARTY_NOTICES.md` | 依赖版本、许可证、功能参考 |

## 文件处理工具

### 图片格式转换

- 批量 JPG/PNG/WebP，输出 PNG/JPEG/WebP。
- 质量、目标宽高（作为边界，保持比例时不拉伸）、JPEG 透明背景色。
- 输出以 `canvas.toBlob` 的实际 `blob.type` 为准。浏览器不支持 WebP 编码时明确失败，绝不改扩展名冒充成功。
- 列表显示原尺寸、输出尺寸、输出大小、状态；逐项下载 + ZIP 批量下载。
- 限制：最多 20 个文件、单个 25 MB、源图 40 MP、单张输出 40 MP、批量输出 200 MP、单边 12000 px；超限报错，不静默裁切。
- 逐张解码/编码，释放 `ImageBitmap`、canvas、object URL；组件停用/卸载中止后续项并清理。

### 图片转 PDF

- 多个 JPG/PNG/WebP，`vuedraggable` 拖动排序、缩略图、删除。
- WebP 先本地转 PNG 再通过 `pdf-lib` 嵌入；PNG/JPEG 直接嵌入。
- A4/Letter/按图片、纵横方向、mm 边距；等比 contain 居中，不拉伸。
- 限制：最多 30 张、单个 25 MB、单张 40 MP、总源图 120 MP；超限报错。
- 中文文件名保留；输出多页 PDF 可下载；清理缩略图 URL。

### PDF 转图片

- `pdfjs-dist` 6 真实 Worker 解析与 canvas 渲染，不显示静态占位图。
- 显示总页数；支持全页或 `1,3-5`；页码越界/空项/倒序范围报错，重复页码去重并提示。
- PNG/JPEG、0.5-4 清晰度、逐页预览下载、ZIP 顺序下载。
- 限制：单 PDF 60 MB、最多 500 页、单页 30 MP、总输出 120 MP；超限报错。
- 加密/密码 PDF 提示不支持；取消/停用/卸载释放 renderTask、page、PDFDocument 和 object URL。
- PDF.js 使用本地资产：`public/toolbox-generated/pdfjs/{cmaps,standard_fonts,wasm}`，通过 `import.meta.env.BASE_URL` 拼接，不访问 CDN。`isEvalSupported: false`。

### PDF 页面处理

- 合并：多 PDF 拖动排序，`pdf-lib.copyPages` 复制页面。
- 拆分：`1-2;3-4` 生成多个 PDF，可 ZIP；跨组重复页报错。
- 提取：`3,1-2` 按输入顺序生成一个 PDF。
- 旋转：90/180/270，可选页，留空全部。
- 重排：输入新顺序，必须覆盖全部页且不重复，实际复制生成新页面顺序。
- 所有模式 `ignoreEncryption` 保持默认拒绝；加密/损坏 PDF 明确报错，绝不绕过。
- 合并总页数限制 2000；单 PDF 60 MB；输出 PDF 可下载，拆分支持 ZIP。

### 表格文件转换

- 本地读取 `.xlsx`/`.xls`/`.csv`/`.json`。
- XLSX 显示工作表选择；切换工作表刷新预览与后续结果；XLSX 导出只导出当前选中工作表，UI 明确提示。
- 表头开关、CSV 分隔符、前 20 行预览（仅预览，转换输出全部行）。
- JSON 只接受对象数组或二维数组；拒绝对象/标量/混用。
- CSV 支持引号、逗号、换行、UTF-8 BOM；保留前导 0、手机号/长 ID 文本，不 Number 推断。
- XLSX 读取缓存显示值，不重新计算公式；`=...` 字符串作为文本输出；不保证公式、样式、宏、批注、合并单元格完整保留。
- 下载 CSV 时添加 UTF-8 BOM；XLSX 下载实际二进制文件。
- 限制：单个 20 MB、最多 50,000 行、500 列；解析期间 loading，超限报错。

## PDF 签名检查

页面选择本地 PDF，使用独立 Worker + `pdf-lib` + 自实现 ASN.1/CMS 解析 + WebCrypto 校验：

- 先通过 `pdf-lib` 区分：正常 PDF / 加密 PDF / 损坏 PDF；无 `/ByteRange` 时报告未发现签名。
- 提取 `/ByteRange` 与 `/Contents`，解析 CMS SignedData、SignerInfo、证书、signedAttrs 的 `messageDigest`。
- `ByteRange` 必须从 0 开始，间隔必须严格是单一 `/Contents` 十六进制区；隐藏前缀、夹带其他 PDF 对象、复杂范围明确 unsupported。
- 计算 PDF 被签字节摘要，比较 `messageDigest`；使用证书 SPKI 通过 WebCrypto 校验 RSA PKCS#1 v1.5 签名。
- 展示签名数、每个签名的 `coveredLength`/`documentLength`/`coversWholeDocument`、摘要一致性、签名公钥匹配、证书主体/签发者/有效期、自签名提示、失败原因。
- 只有至少一个签名覆盖到当前文件末尾且其密码学校验通过时，`currentDocumentVerified` 才为 true；尾部追加内容或历史增量签名会使该字段为 false。历史签名仍可单独显示数学验签通过，但不能据此宣称当前整份 PDF 已签。
- 明确区分“摘要与签名一致”和“证书受信/撤销未验证”；默认无系统根库、无 OCSP/CRL，不给出法律有效性结论。
- 支持 RSA SHA-1/256/384/512；ECDSA、RSASSA-PSS、特殊 SubFilter 明确 unsupported。
- 加密 PDF、缺 ByteRange、未填充签名字段、损坏 PDF 都不会显示成功。
- 资源限制：40 MB；Worker 20 s 硬超时并 terminate，避免异常阻塞主页面；换文件、清空、停用、卸载会提升请求代次并取消 Worker，晚到结果不会回填。

### PDF.js 资产准备

`scripts/copy-toolbox-pdf-assets.mjs` 只写自己的 `public/toolbox-generated/pdfjs` 目录，不删除其他文件；脚本复制 `cmaps`、`standard_fonts`、`wasm` 及各自 LICENSE。`package.json` 已合并：

```json
"predev": "node scripts/copy-toolbox-pdf-assets.mjs",
"prebuild:prod": "node scripts/copy-toolbox-pdf-assets.mjs",
"prebuild:stage": "node scripts/copy-toolbox-pdf-assets.mjs"
```

`npm run dev`、`npm run build:prod`、`npm run build:stage` 会自动准备。`public/toolbox-generated/` 已加入 `.gitignore`。

## 菜单安装

新增 `server/sql/20261021_add_toolbox.sql`：

- 根目录 `toolbox`（与 `magicTools` 同级）。
- 5 个分类（M / `ParentView`）与 63 个叶子（C），共 69 条 `sys_menu`。
- 叶子 `component`、`route_name`、`perms` 与 catalog 精确匹配；`is_frame=1`、`is_cache=1`。
- 基于 `parent_id + path` 的 `NOT EXISTS`，可重复执行；不删除/覆盖已有菜单；事务提交。
- 只给启用、未删除的 `admin` 角色授予新增菜单；其他角色后续在角色管理授权。
- 图标全部来自 `web/src/assets/icons/svg` 的小写 SVG 名。

安装细节与只读核对 SQL 见 [`server/docs/toolbox.md`](../../server/docs/toolbox.md)。

## 依赖与 API（实际安装版本）

| 包 | 版本 | 用途/API | 许可证 |
| --- | --- | --- | --- |
| `yaml` | 2.9.1 | `parse`、`stringify` | ISC |
| `smol-toml` | 1.9.1 | `parse`、`stringify` | BSD-3-Clause |
| `fast-xml-parser` | 5.11.2 | `XMLParser`、`XMLBuilder`、`XMLValidator` | MIT |
| `marked` | 18.1.1 | `marked.parse` | MIT |
| `dompurify` | 3.4.17 | `sanitize` | MPL-2.0 OR Apache-2.0 |
| `bcryptjs` | 3.0.3 | `hash`、`compare` | BSD-3-Clause |
| `ulid` | 3.0.2 | `monotonicFactory` | MIT |
| `he` | 1.2.0 | 完整 HTML 命名/数字实体解码与编码 | MIT |
| `sql-formatter` | 15.9.0 | `format` | MIT |
| `ua-parser-js` | 1.0.41 | `UAParser`；必须保持 v1 | MIT |
| `composerize` | 1.7.6 | docker run → compose | MIT |
| `pdf-lib` | 1.17.1 | PDF 创建/复制/旋转/保存；不忽略加密 | MIT |
| `pdfjs-dist` | 6.4.299 | PDF 解析/Worker/canvas 渲染 | Apache-2.0 |
| `jszip` | 3.10.2 | 浏览器 ZIP | MIT（本项目选择） |
| `xlsx` | 0.20.3 | SheetJS 官方 tarball 读取/写出 | Apache-2.0 |
| `@playwright/test` | 1.64.1 | Codex 浏览器验收（devDependency） | Apache-2.0 |

HTML 实体编解码使用 `he@1.2.0`（MIT），不再维护有限命名实体静态表；解码结果仍只作为文本展示。Cron 5 字段与 MIME 静态表为本地实现，未引入额外库。

## 测试与验证

已新增/更新 Node 测试：

- `catalog.test.js`：5 分类、63 项、63 implemented、63 页面存在、route/permission 唯一。
- `menu-sql.test.js`：SQL 69 条菜单、63 叶子与 catalog 精确匹配、SVG 图标存在、权限唯一。
- `files.test.js`：页范围/越界/重复/重排、图片尺寸与输出名唯一化、CSV 引号/逗号/换行/BOM/前导 0、重复/空表头重命名、JSON 形状、`pdf-lib` 页数/提取/合并/拆分/旋转/重排、无签名 PDF 不成功、坏 PDF 失败、ByteRange 覆盖边界。
- 原有编码、结构化、OTP、加密、JWT、Web、Docker、正则超时测试继续保留；已修正 Unix 秒 ISO 与列表编号空格预期，并补充 Unicode 零宽匹配、完整 HTML 实体与表格重复表头测试。

依赖安装后建议执行：

```powershell
cd web
npm run build:prod
node --test tests/toolbox/*.test.js
```

浏览器验收重点：PDF.js 中文/非嵌入字体、逐页渲染、取消与内存、图片 WebP 实际编码、ZIP 同名文件、PDF 签名 signed/tampered 与尾部追加 fixture、表格同名表头、移动端宽度。

## 接口导出（便于 Codex fixtures）

- `pdfRanges.js`：`parsePageSelection(input,total,{allowReorder,requireAll})`、`parseRangeGroups`、`parseRotationPages`。
- `pdfPages.js`：`getPdfPageCount`、`extractPdfPages`、`mergePdfDocuments`、`reorderPdfPages`、`rotatePdfPages`、`splitPdfGroups`。
- `pdfSignatureCore.js`：`inspectPdfSignatures(bytes)`、`extractSignatureEntries(bytes)`；签名条目含 `coveredLength`、`documentLength`、`coversWholeDocument`、`coverageStatus`，整体含 `currentDocumentVerified`、`currentDocumentIntegrity`、`hasUncoveredContent`；`pdfSignatureWorkerClient.verifyPdfInWorker(arrayBuffer, timeoutMs)`。
- `spreadsheet.js`：`parseCsvText`、`serializeCsv`、`normalizeHeadersWithMeta`、`normalizeHeaders`、`normalizeJsonTable`、`rowsToObjects`、`tableFromWorksheet`；表结果含 `headerRenames`。
- `image.js`：`IMAGE_LIMITS`、`calculateOutputSize`、`outputFilename`、`createUniqueOutputName`。
- `webcrypto.js`：`getSubtle`、`getRandomValues`；非安全上下文返回中文“需要 HTTPS 或 localhost 安全环境”提示。

## 安全边界与限制

- 所有文件仅通过浏览器本地 API 读取，不上传，不写 localStorage/sessionStorage/URL/日志。
- HTML 预览为无脚本 sandbox + DOMPurify + CSP；HTML 可视编辑仅插入纯文本；不使用 `v-html` 渲染用户输入。
- PDF 签名只验证签名覆盖字节的摘要与证书公钥匹配；不建立信任链、不查询 OCSP/CRL，不输出法律有效性结论。签名后追加内容、非 0 起点、隐藏间隔或复杂 ByteRange 不会被当作当前全文已验证。
- PDF 页面处理不忽略加密；签名检查不支持密码输入。
- 表格转换不保留公式、样式、宏、批注、合并单元格等复杂结构；XLSX 公式读取缓存显示值。重复或空表头按确定性后缀重命名，并在界面提示，不会静默丢列。
- 图片批量转换按批次生成唯一输出名（同名追加 `_2`、`_3`），单文件下载与 ZIP 使用同一名称；改变参数或选择新文件会作废旧处理任务。
- 非 HTTPS 且非 localhost 时，Hash、AES、RSA、OTP 的 WebCrypto 功能显示明确安全环境提示，不提供降级实现。
- 文件/页数/像素/时间限制均为公开限制，超限报错，不静默截断或伪造成功。

本项目主体继续遵循根目录 MIT License，保留 RuoYi 原版权；第三方许可详见 [`../THIRD_PARTY_NOTICES.md`](../THIRD_PARTY_NOTICES.md)。

## 本地验收记录（2026-10-21）

- 使用 Node.js 24.20.0；PDF.js 依赖要求 Node.js 22.13+，已同步项目 engines 与安装说明。
- 75 项 Node 测试通过，无跳过；包含公开自签名 PDF、篡改和末尾追加样本。
- 63 个页面完成浏览器加载与默认操作检查，无页面异常或外部请求；抽查移动布局无横向溢出。
- 实际下载检查通过：图片尺寸/透明背景/同名 ZIP、图片转 PDF、PDF 转图片、页面合并/重排、中文多工作表转换与前导零、签名检测与清空任务。
- 本地菜单迁移执行两次：首次新增 69 条，第二次新增 0 条，原有菜单内容未改变。
