若依原项目：[RuoYi-Vue3](https://github.com/yangzongzhuan/RuoYi-Vue3)

# weishanHub Web

## 平台简介

weishanHub 的管理前端，基于 RuoYi-Vue3 3.9.2，采用 Vue 3、Vite、Element Plus、Pinia 和 Vue Router，保留若依原有后台布局、登录、动态菜单及按钮权限。

配套后端：[weishanHubServer](https://github.com/moweishan/weishanHubServer)。开发规范见 [AGENTS.md](AGENTS.md)。

## 内置功能

- 系统管理：用户、角色、菜单、部门、岗位、字典、参数及通知公告。
- 日志与监控：操作日志、登录日志、在线用户、服务及缓存监控。
- 开发工具：代码生成、接口文档及定时任务管理。

## 前端运行

使用 Node.js 20.19+（20.x）或 22+、npm 10+，以下操作均在本仓库根目录执行。

```powershell
# 克隆项目
git clone https://github.com/moweishan/weishanHubWeb.git
cd weishanHubWeb

# 安装依赖
npm install

# 启动服务
npm run dev
```

前端地址：[http://localhost/](http://localhost/)，默认端口 `80`。登录及管理功能需要配套后端运行。

开发环境默认将 `/dev-api` 请求代理至 `http://localhost:8080` 并去除前缀。如需修改，复制 `.env.local.example` 为 `.env.development.local`，调整 `API_TARGET` 后重启服务；已有本地文件不要覆盖。

## 打包部署

```powershell
# 构建生产环境
npm run build:prod

# 构建预发布环境
npm run build:stage
```

产物位于 `dist/`，生产 API 前缀为 `/prod-api`，预发布为 `/stage-api`。部署参考 [Nginx 配置示例](deploy/nginx.conf.example)，配置对应的后端代理及页面路由回退；Vite 开发代理不用于生产部署。

`VITE_` 环境变量会进入浏览器代码，不得填写密码或密钥。本地配置、node_modules 和 dist 不提交；保留 package-lock.json。

## 开源许可

遵循 [MIT License](LICENSE)，保留 Copyright (c) 2018 RuoYi 及源码作者信息。
