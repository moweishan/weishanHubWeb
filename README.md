若依原项目：[RuoYi-Vue3](https://github.com/yangzongzhuan/RuoYi-Vue3)

# weishanHub Web

## 平台简介

weishanHub 的管理前端，基于 RuoYi-Vue3 3.9.2，采用 Vue 3、Vite、Element Plus、Pinia 和 Vue Router，保留若依原有后台布局、登录、动态菜单及按钮权限。

配套后端：[weishanHubServer](https://github.com/moweishan/weishanHubServer)。开发规范见 [AGENTS.md](AGENTS.md)。

## 内置功能

- 系统管理：用户、角色、菜单、部门、岗位、字典、参数及通知公告。
- 日志与监控：操作日志、登录日志、在线用户、服务及缓存监控。
- 开发工具：代码生成、接口文档及定时任务管理。

## 公开首页与后台入口

- `/`：公开门面单页 `src/views/landing/index.vue`，独立于后台 Layout，不加载用户信息、动态菜单或任何业务数据，也不发起任何业务请求（仅按需加载固定版本的 three.js CDN 运行时）。
- 使用 three.js（`THREE.WebGLRenderer` + `PerspectiveCamera` + `Scene` + `OrbitControls`）实时渲染太阳系：温暖发光的太阳与柔和日冕、八大行星、土星倾斜光环、合并绘制的主轨道线、三层合批星点与少量蓝紫星云。全部贴图由 `CanvasTexture` 在初始化时程序化生成，不请求任何外部图片或字体。
- three.js 运行时从固定版本的 jsDelivr CDN 加载：根目录 `index.html` 的 importmap 仅把裸导入 `three` 映射到 `https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js`，`src/views/landing/three-runtime.js` 再以原生动态 import 按需加载该核心模块与同版本 `OrbitControls`，两者复用同一份 CDN 模块实例。访问首页需要能访问该 CDN；CDN 加载失败时自动降级为静态星空，不影响 `/login` 等后台路由。
- npm 的 `three` 仅作为开发时 Node 回归验证依赖（devDependency），不参与生产打包；生产浏览器产物不包含 three。
- 尺度说明：太阳与行星半径、轨道距离、公转/自转速度均为展示比例，**不是天文等比例**；这样才能整屏看到完整太阳系，而不是真实尺度下的几个像素。
- 交互：行星按不同速度公转并自转，镜头默认极缓慢自动环绕。鼠标左键拖动或触屏单指拖动旋转视角，滚轮/双指缩放；拖动期间自动环绕暂停，松手约 1.5 秒后恢复。`OrbitControls` 开启阻尼（`enableDamping`），每帧调用 `update(deltaSeconds)` 让自动环绕与帧率无关；禁用平移并限制最近/最远距离，避免钻入太阳或丢失目标。
- 适配与性能：初始镜头按视口宽高比计算全景距离，手机竖屏同样能看全整个太阳系；`ResizeObserver` 只更新相机比例与渲染尺寸，不重建纹理和行星。几何体/材质/纹理数量受控，星空用 3 层 `Points` + `BufferGeometry` 合批，轨道线合并为一次绘制，不使用 bloom、阴影贴图或后处理；设备像素比在移动端按 1.25、桌面按 1.5 封顶，并带像素预算。
- 可访问性与降级：支持 `prefers-reduced-motion: reduce`（停止自动环绕与行星运动，仍可手动观察）；WebGL 不可用、上下文丢失或 three.js CDN 加载失败时显示纯 CSS 静态星空和同一句中性说明，后台入口始终可用。页面隐藏时暂停帧循环，离开页面时释放动画帧、事件、计时器、几何体、材质、纹理与渲染器；CDN 加载途中离开页面不会在返回后继续创建场景。
- 模型构建、逐帧推进与资源释放集中在 `src/views/landing/solar-system.js`，不监听浏览器事件、不引用 Vue，也不静态 import three：`THREE` 由调用方通过 `options.three` 注入（浏览器传 CDN 加载的模块，Node 测试传 npm three）。贴图工厂可注入，因此可在 Node 中用真实 three 对象验证轨道更新与 `dispose`。
- 执行 `node scripts/check-solar-system.mjs` 可验证八大行星公转、自转、不同刷新率下的运动一致性、竖屏全景构图与资源释放。
- 执行 `node scripts/check-three-runtime.mjs` 可验证 CDN 加载缓存、失败重试、加载期间卸载取消、静态降级与 importmap 顺序。
- 右下角有一个低调的六边形图标入口，具备可访问名称、键盘聚焦与聚焦反馈，指向 `/login?redirect=/index`。
- `/login`：后台登录页；已持有 Token 访问时会直接跳转 `/index`。
- `/index`：后台首页，仍位于后台 Layout 内，保留 `Index` 路由名与首页固定标签（affix），并继续受登录与权限保护。

除 `/`、`/login`、`/register` 等公开路由外，其余后台页面仍需要 Token 与动态菜单权限。

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

前端地址：[http://localhost/](http://localhost/)，默认端口 `80`。根地址展示可拖动、自动环绕的太阳系公开门面单页，后台登录入口为其右下角图标（或直接访问 `/login`）。登录及管理功能需要配套后端运行。

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
