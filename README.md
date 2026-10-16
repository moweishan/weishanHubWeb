若依原项目：[RuoYi-Vue3](https://github.com/yangzongzhuan/RuoYi-Vue3)

# weishanHub Web

weishanHub 的 Vue3 管理前端，保留若依登录、动态菜单、角色/按钮权限、字典、基础管理页面、监控和代码生成页面。当前为基础框架阶段，不包含额外业务模块。

本仓库可以独立克隆、安装、启动和构建。真实登录和管理功能需要可访问的 [weishanHubServer](https://github.com/moweishan/weishanHubServer)，也可连接团队提供的兼容后端；无需将后端放在本仓库内部。本文所有命令和相对路径均从本仓库根目录执行，不依赖外层工作区。

## 技术与环境

| 项目 | 实际配置 |
| --- | --- |
| RuoYi-Vue3 | 3.9.2 |
| Vue / Vite | 3.5.26 / 6.4.1 |
| Element Plus / Pinia | 2.13.1 / 3.0.4 |
| Vue Router / Axios | 4.6.4 / 1.13.2 |
| Node / npm | package.json 要求 Node >=20.19.0、npm >=10；已验证 Node 24.20.0 / npm 11.19.0 |

优先使用已验证的 Node 24.20.0；Vite 6 的 engines 为 ^18、^20 或 >=22，不要因本项目宽泛的最低版本声明而选择 Node 21。版本以 [package.json](package.json) 和 [package-lock.json](package-lock.json) 为准，未擅自升级上游核心依赖。上游导入提交为 `838965c5a18d2c61b73ec30c6e288057aaa08b63`。

前端本身不直接连接 MySQL 或 Redis；后端运行环境、数据库初始化和凭据配置见配套后端 README。不要把数据库账号、Redis 密码或 JWT 密钥放进前端。

## 克隆与安装

```powershell
git clone https://github.com/moweishan/weishanHubWeb.git
cd weishanHubWeb
node --version
npm --version
npm install --no-audit --no-fund
```

提交并保留 package-lock.json，使依赖版本可追溯；依赖调整需说明原因，不为消除弃用提示擅自升级核心框架。全新克隆不含 node_modules 或 dist，需要自行安装和构建。

```text
.
├── src/
│   ├── api/                     # 模块接口，统一调用 request
│   ├── views/                   # 业务及基础管理页面
│   ├── router/                  # 常量及动态路由
│   ├── store/modules/           # Pinia 用户、权限、布局状态
│   ├── layout/                  # 管理后台布局
│   ├── components/              # 公共组件
│   ├── directive/               # 权限等指令
│   ├── utils/request.js         # Token、响应、异常和下载处理
│   └── settings.js
├── public/
├── vite/                        # Vite 插件配置
├── deploy/nginx.conf.example
├── .env.development / .env.production / .env.staging
├── .env.local.example
├── package.json / package-lock.json
├── vite.config.js
├── LICENSE
├── README.md
└── AGENTS.md
```

## API 与本地配置

默认开发环境访问链路：浏览器 `/dev-api/*` → Vite 代理 → `http://localhost:8080/*`，代理会去除 `/dev-api` 前缀。先启动兼容后端，确认 `http://localhost:8080/` 可访问。

需要覆盖本机代理时，首次复制示例（已有文件时先检查，避免覆盖）：

```powershell
Copy-Item .env.local.example .env.development.local
```

Linux/macOS 可使用 `cp -n .env.local.example .env.development.local`。示例默认内容为：

```dotenv
API_TARGET=http://localhost:8080
VITE_APP_BASE_API=/dev-api
```

将 API_TARGET 改为可达的后端地址；不要附加 `/dev-api`，除非目标服务器本身要求该路径。修改环境文件后重启开发服务。

| 配置 | 开发 | 生产 | 预发布 |
| --- | --- | --- | --- |
| 文件 | .env.development | .env.production | .env.staging |
| VITE_APP_TITLE | weishanHub | weishanHub | weishanHub |
| VITE_APP_BASE_API | /dev-api | /prod-api | /stage-api |
| API_TARGET | 默认 http://localhost:8080，仅控制开发代理 | 不控制生产静态站点代理 | 生产部署需另外配置代理 |

`API_TARGET` 只由 Vite 配置读取；`VITE_` 变量会进入浏览器代码，都是公开配置。禁止存放密码、密钥或私密令牌。`.env.development.local` 等本地文件不提交；`.env.local.example` 和三个公开环境文件保留提交。

## 启动与构建

```powershell
npm run dev
```

默认地址 `http://localhost/`，端口 `80`，`strictPort=true`。端口占用时明确失败，不会自动换端口。部分系统绑定 80 需要额外权限；先检查占用和权限，如确需换端口，在 `vite.config.js` 明确修改并记录，不要无故调整默认端口。页面可以在后端未启动时编译，但验证码、登录和管理功能需要后端连通。

```powershell
npm run build:prod
npm run build:stage
```

两种构建均输出到 `dist/`，后一次会替换相同输出目录。`build:prod` 使用 `/prod-api`；`build:stage` 使用 `/stage-api`。初始化阶段已验证 install、dev 和 build:prod；build:stage 命令来自实际 package.json，尚未单独进行预发布环境验收。

`npm run preview` 用于预览构建文件，不替代生产 Nginx 或后端部署；若需要真实 API，仍须让当前构建的 API 前缀可访问。

## 生产部署

1. 执行 `npm run build:prod`，将 dist 内容部署到 Nginx 静态目录。
2. 参考 [Nginx 示例](deploy/nginx.conf.example)，默认静态根目录为 `/var/www/weishanhub`，按服务器实际路径修改。
3. `/prod-api/` 使用带尾斜杠的 `proxy_pass http://127.0.0.1:8080/;` 去除前缀；后端不需要把 Controller 路径改为 `/prod-api` 开头。
4. 保留 SPA `try_files` 回退到 index.html，避免刷新动态路由出现 404。上传大小、超时、Host 和转发头按示例及实际部署调整。
5. 生产入口配置 HTTPS；预发布构建需对应配置 `/stage-api/`。Vite 开发代理不会进入 dist，不能靠 API_TARGET 配置生产反向代理。

真实生产 Nginx、HTTPS 和预发布环境尚未在初始化阶段部署验收。后端 Swagger 请求前缀生产设置 API_PREFIX=/prod-api；接口页保留 `/swagger-ui/index.html`。

## 接口与权限约定

登录 `POST /login` 使用 username/password/code/uuid，成功返回 token；`src/utils/request.js` 附加 Bearer Token。`/getInfo` 返回 user/roles/permissions，`/getRouters` 返回 data 动态路由，`/logout` 删除会话。分页请求 pageNum/pageSize，响应 code/msg/rows/total；普通响应 code/msg/data。

动态组件由 `src/store/modules/permission.js` 映射 `src/views`。按钮使用现有 v-hasPermi/v-hasRole；后端 Security 和方法权限才是授权边界。文件沿用上传组件、fileName + API 前缀、统一下载封装，禁止把接口域名硬编码在页面中。

## 开发规范

- 页面放在 `src/views/<模块>`，接口集中在 `src/api/<模块>`；公共组件、状态和样式沿用现有组织方式。
- 优先复用 Element Plus、字典、表格分页、表单校验、权限指令、下载和上传组件，保持后台布局。
- 新增菜单同步确认后端 component 路径、路由 name/path 和 `模块:资源:动作` 权限标识；新增接口检查后端适配。
- 中文沟通、文档及新增注释；遵循邻近文件命名风格；不自行增加业务模块，不擅自替换 Vue、Vite、Pinia 或重构权限架构。
- 修改依赖同步锁文件；本地环境配置、密钥、依赖、日志和 dist 不提交。保留 LICENSE 与原作者信息。
- AI 开发前阅读 [AGENTS.md](AGENTS.md)，完成后报告实际验证与未验证范围。

## 验证与常见问题

独立克隆后的基础验收：依赖安装成功、build:prod 成功、dev 页面显示 weishanHub；连接兼容后端后，检查验证码、登录、用户信息、动态菜单、按钮权限、字典、分页、文件传输与退出。初始化阶段上述核心 HTTP 链路已验证，但未逐页验收所有管理页面或完整角色权限矩阵；本次文档调整不等于重新执行全部测试。

- 代理连接拒绝：检查 API_TARGET、后端 8080 和防火墙，再重启 Vite。
- 401：检查 Token 与后端 Redis 会话，禁止通过移除权限代码解决。
- 生产 API 404：检查构建模式、/prod-api 前缀和 Nginx 去前缀规则。
- 直接刷新页面 404：检查 Nginx 的 SPA 回退。
- npm 弃用或本机全局 python 配置提示：先区分提示和构建失败，不为消除提示随意升级框架。
- 本仓库没有 test/lint 脚本；不要编造已运行的命令或把构建成功当作完整功能验收。

## 来源与许可证

Copyright (c) 2018 RuoYi，遵循 [MIT License](LICENSE)，保留原项目地址、许可证和源码作者信息。后端官方来源为 [RuoYi-Vue-fast](https://github.com/yangzongzhuan/RuoYi-Vue-fast)。weishanHub 为系统显示名称，原框架名称可保留于版权、内部工具和上游历史中。
