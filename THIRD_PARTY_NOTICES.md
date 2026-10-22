# 第三方组件与功能参考声明

本文件补充说明 weishanHub 工具箱使用的第三方依赖、功能参考来源与许可证注意事项。项目主体继续遵循仓库根目录 [MIT License](LICENSE)，保留 RuoYi 原版权与作者信息。

**状态说明**：以下版本来自当前 `web/package.json` 与 `node_modules` 元数据。许可证标识依据上游包元数据整理；Codex 在最终分发前仍应执行完整的 LICENSE/NOTICE 扫描。

## 实际使用的前端依赖

| 包 | 实际版本 | 用途 | 许可证 |
| --- | --- | --- | --- |
| `yaml` | 2.9.1 | YAML 解析/生成 | ISC |
| `smol-toml` | 1.9.1 | TOML 解析/生成 | BSD-3-Clause |
| `fast-xml-parser` | 5.11.2 | XML 解析/构建/校验 | MIT |
| `marked` | 18.1.1 | Markdown → HTML | MIT |
| `dompurify` | 3.4.17 | HTML 净化 | MPL-2.0 OR Apache-2.0 |
| `bcryptjs` | 3.0.3 | BCrypt 哈希/校验 | **BSD-3-Clause** |
| `ulid` | 3.0.2 | ULID | MIT |
| `he` | 1.2.0 | 完整 HTML 实体编解码 | MIT |
| `sql-formatter` | 15.9.0 | SQL 格式化 | MIT |
| `ua-parser-js` | 1.0.41 | User-Agent 解析 | MIT |
| `composerize` | 1.7.6 | docker run → Compose | MIT |
| `pdf-lib` | 1.17.1 | PDF 页面复制/生成/旋转 | MIT |
| `pdfjs-dist` | 6.4.299 | PDF.js 解析与 canvas 渲染 | Apache-2.0 |
| `jszip` | 3.10.2 | 浏览器 ZIP 下载 | MIT（本项目按 MIT 选项使用） |
| `xlsx` | 0.20.3 | SheetJS 表格读取/写出 | Apache-2.0 |
| `@playwright/test` | 1.64.1 | Codex 浏览器验收开发依赖 | Apache-2.0 |

完整许可证文本索引：[third-party-licenses/toolbox/index.json](third-party-licenses/toolbox/index.json)；许可证目录：[third-party-licenses/toolbox/](third-party-licenses/toolbox/)。

## 许可证重点

- **bcryptjs 3.0.3 的许可证是 BSD-3-Clause，不是 MIT。**
- `he` 1.2.0 为 MIT；HTML 实体解码使用其完整命名实体表，解码结果仍作为纯文本展示。
- `ua-parser-js` 必须锁定 v1（1.0.41，MIT）；不要无意升级到 v2，升级前必须重新评估 API 与许可证。
- `dompurify` 为 MPL-2.0 或 Apache-2.0 双许可，分发时按实际版本附带的 LICENSE/NOTICE 处理。
- `jszip` 为 MIT 或 GPL-3.0-or-later 双许可；本项目选择 MIT 选项，需在发行物中保留 MIT 声明。
- `xlsx` 0.20.3 来自 SheetJS 官方 tarball（非 npm 旧版），许可证为 Apache-2.0。
- `pdfjs-dist` 的 `cmaps`、`standard_fonts`、`wasm` 目录内含各自的 LICENSE 文件；`scripts/copy-toolbox-pdf-assets.mjs` 会一并复制到生成目录，发行时不得删除。
- 其他解析库的具体版本可能带有额外 NOTICE，需随发行物保留。
- 本项目未修改以上库的源代码；均以 npm 依赖方式调用。仓库内独立实现部分为 MIT 项目代码。

## 现有项目依赖

工具箱复用现有 Vue 3、Vite 6、Element Plus、Pinia、Vue Router 等依赖，其许可证沿用原项目声明。未引入 NaiveUI、UnoCSS 或另一套 router/store。

## 功能参考（非代码来源）

- it-tools：https://github.com/CorentinTh/it-tools （GPL-3.0）
  - 仅参考工具分类、使用场景与交互思路；未复制其 GPL 源代码、样式或组件。
  - 本工具箱的页面、Vue 组件、纯函数、错误处理、PDF 验签与文件处理均为独立实现。
- 其他公开规范与文档：RFC 4226（HOTP）、RFC 6238（TOTP）、RFC 4648（Base32）、RFC 7519（JWT 结构）、RFC 5280（X.509）、RFC 5652（CMS）、HTTP 状态码注册表、Cron 5 字段语义、Docker CLI 文档、WebCrypto、PDF.js 文档。规范仅作为实现依据，不构成代码复制。

## 浏览器原生能力

- `TextEncoder` / `TextDecoder`
- `BigInt`
- `crypto.getRandomValues` / `crypto.randomUUID` / `crypto.subtle`（SHA、HMAC、AES-GCM、PBKDF2、RSA、ECDSA 验签入口）
- `createImageBitmap` / `Image` / `canvas.toBlob`
- `URL` / `URLSearchParams` / `Blob` / `FileReader`
- `Worker`
- iframe `sandbox` + CSP

这些能力属于浏览器标准 API，无额外许可证义务。

## 维护要求

1. 依赖版本以 `package-lock.json` 为准；本项目不手工改锁文件。
2. 发行前运行 `npm run build:prod`、`node --test tests/toolbox/*.test.js`，并执行许可证扫描。
3. `public/toolbox-generated/` 为构建生成资产，不提交；其中 PDF.js 的 LICENSE 文件随构建复制。
4. 替换 PDF 验签、表格或 UA 解析库时，同步更新本文件、`web/docs/toolbox.md` 与测试。
