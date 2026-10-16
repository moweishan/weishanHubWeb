若依原项目：[RuoYi-Vue3](https://github.com/yangzongzhuan/RuoYi-Vue3)

# weishanHub Web AI 开发规范

## 项目上下文

weishanHub 的独立管理前端，基于 RuoYi-Vue3，使用 Vue 3、Vite、Element Plus、Pinia 和 Vue Router。保留原有后台布局、登录、动态菜单、按钮权限及基础管理页面，不在无明确需求时新增业务模块。

技术版本以 `package.json` 和 `package-lock.json` 为准；安装、配置、启动及构建见 [README.md](README.md)。本仓库独立开发，真实接口由 [配套后端](https://github.com/moweishan/weishanHubServer) 提供，不依赖外层工作区文件。

## 关键目录

- `src/views/`：模块页面；`src/api/`：模块接口。
- `src/router/`：路由；`src/store/modules/`：Pinia 状态及动态菜单处理。
- `src/layout/`、`src/components/`、`src/directive/`：布局、公共组件及指令。
- `src/utils/request.js`：统一请求、Token、响应及下载处理。
- `.env.*`、`vite.config.js`：环境配置、开发代理及构建配置。
- `.env.local.example`：配置示例；`deploy/`：部署示例。

## 架构与开发规范

- 修改前阅读相关页面、API、路由和 Store，遵循现有命名与组织方式，控制影响范围。
- 页面按模块放入 views，接口集中到 api，通过统一请求器调用；不得在组件中硬编码后端域名。
- 优先复用 Element Plus、字典、分页、表单校验、上传下载、权限指令及现有布局。
- 动态菜单的 component 与页面路径一致，路由 name/path 不冲突；按钮权限标识与后端保持一致。
- 保留路由守卫、Token、登录过期处理及权限指令；前端按钮隐藏不能替代服务端鉴权。
- 接口、分页、文件传输或 API 前缀变化时同步核对后端；区分开发代理和生产反向代理。
- 不擅自替换或升级核心技术，不进行无关的大规模重构；调整依赖时同步锁文件。

## 协作与安全

- 沟通、文档及新增注释使用中文；重要配置、结构和开发约定变化同步相关文档。
- `VITE_` 变量对浏览器公开，禁止包含密码、密钥或私密令牌；前端不直接连接数据库或 Redis。
- 不覆盖用户文件，不提交本地环境配置、密钥、node_modules、dist 或日志。
- 保留配置示例、锁文件、[MIT License](LICENSE)、顶部若依地址及原作者信息。
- 完成后执行与改动相称的验证，如实报告结果、未验证范围及阻塞原因；构建成功不能替代功能验收。
