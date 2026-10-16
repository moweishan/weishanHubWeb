若依原项目：[RuoYi-Vue3](https://github.com/yangzongzhuan/RuoYi-Vue3)

# weishanHub Web AI 开发规范

## 1. 项目概述

本仓库是独立 Vue3 前端，基于 RuoYi-Vue3 3.9.2，当前定位为可扩展后台管理系统的基础框架。保留登录、动态菜单、用户、角色、字典、日志、代码生成等原有页面；无需求不增加业务。中文沟通、文档及新增注释。本文件与 README 在独立克隆后即可使用，不依赖外层目录。

## 2. 技术栈

Vue 3.5.26、Vite 6.4.1、Element Plus 2.13.1、Pinia 3.0.4、Vue Router 4.6.4、Axios 1.13.2。版本以 package.json / package-lock.json 为准。项目声明 Node >=20.19.0、npm >=10；已验证 Node 24.20.0 / npm 11.19.0。结合 Vite engines 使用 Node 20 或 >=22，优先使用已验证的 24.20.0，不选择 21。

前端不直接连接 MySQL 或 Redis。真实登录需要兼容后端：https://github.com/moweishan/weishanHubServer。上游导入提交：838965c5a18d2c61b73ec30c6e288057aaa08b63。

## 3. 目录与仓库

远程：https://github.com/moweishan/weishanHubWeb.git，当前 master 跟踪 origin/master；仓库根目录即 package.json 所在位置，与后端独立管理，不创建嵌套仓库。

- src/views：页面；src/api：按模块组织接口。
- src/router：常量与动态路由；src/store/modules：Pinia 用户、权限、布局状态。
- src/layout、components、directive：现有后台布局、公共组件、权限指令。
- src/utils/request.js：Token、响应、异常与下载；src/settings.js：布局/标题等。
- .env.development、.env.production、.env.staging：公开环境配置。
- .env.local.example：开发覆盖示例；实际 .env.development.local 被忽略。
- vite.config.js、vite/：开发代理与打包插件；deploy/nginx.conf.example：部署示例。
- README.md：完整独立运行说明；LICENSE：MIT 版权。

## 4. 架构与接口

浏览器 → Vite /dev-api（生产 Nginx /prod-api）→ 去除 API 前缀 → 后端。统一请求器附加 Authorization: Bearer token。POST /login 返回 token；/getInfo 返回 user/roles/permissions；/getRouters 返回动态菜单；POST /logout 使会话失效。

动态菜单由 src/store/modules/permission.js 将 component 映射到 src/views，并挂载路由。复用 v-hasPermi/v-hasRole 和统一登录过期处理；按钮隐藏不替代后端鉴权。常规响应 code/msg/data，分页 code/msg/rows/total，请求 pageNum/pageSize；文件上传 multipart、下载二进制，沿用现有组件和封装。

## 5. 环境与配置

独立克隆后按 README 安装依赖；本仓库不含 node_modules、dist 或开发者本地环境文件。默认 Vite 80、后端 localhost:8080，无后端时仅可编译页面，真实登录等操作不可用。

首次可复制 .env.local.example 为 .env.development.local，已有本地文件先检查，禁止覆盖。API_TARGET 控制 Vite 目标，默认 http://localhost:8080；VITE_APP_BASE_API 开发 /dev-api，生产 /prod-api，预发布 /stage-api；VITE_APP_TITLE=weishanHub。修改环境文件后重启 Vite。

API_TARGET 不配置生产代理；生产静态资源需 Nginx 对应前缀。VITE_ 变量对浏览器公开，禁止含数据库/Redis 凭据、JWT 密钥或其他私密内容。端口 strictPort=true，占用应查明再调整并记录，不能静默换端口。

## 6. 启动与构建

在本仓库根目录执行：

```powershell
node --version
npm --version
npm install --no-audit --no-fund
npm run dev
```

```powershell
npm run build:prod
```

生产产物 dist，API 前缀 /prod-api。package.json 还提供 build:stage（/stage-api）和 preview；预发布及实际生产部署未单独验收，preview 不等于生产代理。当前无 test/lint 脚本，不编造命令。基础验证按 README 检查构建、页面以及连接后端后的真实登录与相关操作。

## 7. 开发规范

- 修改前先读相关页面、API、路由和 Store，保持现有 Vue3/Element Plus/Pinia 组织。
- 页面位于 src/views/<明确模块>，API 位于 src/api/<模块>；请求通过 utils/request，禁止在组件写死后端域名。
- 复用字典、表格分页、表单校验、上传下载、权限指令及后台布局，遵循邻近文件命名和样式约定。
- 菜单 component 与实际页面路径一致，路由 name/path 不冲突；权限标识沿用 模块:资源:动作，并与后端校验一致。
- 不关闭路由守卫、验证码、Token 或按钮权限以通过验证；不擅自替换/升级核心框架、不大规模重构、不新增无需求业务。
- 前端接口变更同步检查配套后端；涉及数据库的需求由后端提供迁移，不从前端连接数据库。
- 依赖调整同步 package-lock.json；node_modules、dist、日志、本地 .env 和密钥禁止提交。示例环境文件、锁文件和 LICENSE 保留。

## 8. AI 协作规范

开发前阅读本文件和相关实现。控制范围、复用现有技术，完成后执行与改动相称的验证并说明未验证范围。长期配置、技术版本、结构或开发约定变化同步本仓库 README 与 AGENTS；区分已完成、进行中、计划和已知问题。不依赖外层工作区脚本，不输出或记录本地秘密。

用户以 @deepseek 开头并给出可执行任务时，读取可用 deepseek 技能（优先 .codex/skills/deepseek/SKILL.md，缺失时查找已安装技能），执行本地 DeepSeek Harness CLI 委派流程；讨论别名本身时不运行 CLI。

## 9. 当前状态

已完成：完整官方 Vue3 源码、weishanHub 标题、环境 API 前缀、可配置开发代理、生产 Nginx 示例、依赖锁、独立仓库及自包含文档。初始化阶段安装、开发启动、生产构建和配套后端核心 HTTP 联调通过。

未完成：所有管理页面逐项浏览、完整普通角色权限矩阵、生产 Nginx/HTTPS 和预发布验收。无额外业务模块。文档修改不代表重新执行历史全部测试；新环境需自行准备兼容后端。

## 10. 最近重要变更

2026-10-16：初始化官方 Vue3 3.9.2、品牌与 API 配置，创建并推送独立前端仓库；补齐 README、AGENTS，使单独克隆后无需外层说明即可开发。

## 11. 后续注意事项

保留原管理功能、动态权限与布局，遵守 [MIT License](LICENSE)，保留 Copyright (c) 2018 RuoYi、顶部上游地址和作者信息。后续业务需求明确后按现有模块边界扩展，接口及权限变化与后端协同。生产与开发代理分别配置，不把本地运行成功写成生产验收通过。
