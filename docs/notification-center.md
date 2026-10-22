# 通知中心（前端）

前端提供三个后台管理页和一个独立公共详情页，全部使用现有 Vue 3 + Element Plus + 统一请求器，不新增技术栈。

## 1. 页面与路由

| 页面 | 组件 | 说明 |
| --- | --- | --- |
| 通知中心 / 通知渠道 | `views/notification/channel/index.vue` | 通用渠道表格、provider 中文标签/摘要、只读详情抽屉、分组编辑、统一详情页地址 |
| 通知中心 / 调用凭证 | `views/notification/credential/index.vue` | 创建/重置后一次性展示 API Key |
| 通知中心 / 通知记录 | `views/notification/record/index.vue` | 分页、每渠道结果、失败重试、撤销、删除 |
| 公共详情 | `views/notification/detail/index.vue` | 独立隐藏路由，手机/桌面适配，不进入后台 Layout |

公共详情路由精确配置在 `constantRoutes`：

```js
{
  path: '/notification/detail/:token',
  component: () => import('@/views/notification/detail/index.vue'),
  hidden: true,
  name: 'NotificationPublicDetail'
}
```

`permission.js` 在 `getToken()` 分支之前用精确正则 `^/notification/detail/[A-Za-z0-9_-]+$` 直接放行。这样：

- 无论是否持有系统 token，都不会为了公共详情拉取用户信息或动态菜单；
- 不会触发锁屏重定向；
- 其他路由守卫、登录、首页、锁屏逻辑保持不变；
- 是否真正可看仍由后端按票据/UA/时间/登录权限逐次判断。

## 2. 请求器最小改动

`utils/request.js` 新增最小兼容项：

```js
// 公共详情 API 传入 skipAuthHandler: true
if (res.config && res.config.skipAuthHandler === true) {
  return Promise.reject(res.data)
}
```

只对显式声明 `skipAuthHandler: true` 的请求跳过全局登录/错误提示，把业务码交给页面自行展示；其他请求的 Authorization 注入、401 重新登录、500/601 提示等行为全部保持不变。公共详情页据此区分 401（登录提示）、403（无权限）、404（失效）。接口确认 401 后，只有用户主动点击登录才清除失效的 Admin-Token 并进入 `/login`；正常微信免登录查看不会清理有效 token，403 仍返回首页。

通知相关 POST/PUT/DELETE 均显式 `repeatSubmit: false`，避免统一请求器的 POST session 防重复缓存保存通知正文或 API Key 相关请求；公共详情使用 GET，不写 `localStorage` / `sessionStorage`。

## 3. API 模块

`api/notification/`：

- `channel.js`：`listChannel`、`channelOptions`、`getChannel`、`addChannel`、`updateChannel`、`delChannel`、`getDetailUrl`、`updateDetailUrl`
- `credential.js`：`listCredential`、`getCredential`、`addCredential`、`updateCredential`、`resetCredential`、`delCredential`
- `record.js`：`listRecord`、`getRecord`、`retryRecord`、`revokeRecord`、`delRecord`
- `public.js`：`getNotificationDetail(token)`，使用统一请求器、自动携带现有系统 token、`skipAuthHandler: true`

所有 URL 都是 `VITE_APP_BASE_API` 相对路径，不在组件中硬编码域名。

## 4. Markdown 安全

`utils/notification/markdown-source.js` 负责 marked 渲染并丢弃原始 HTML（`renderer.html = () => ''`），`utils/notification/markdown.js` 再用现有 `DOMPurify` 二次净化：

- `renderer.html = () => ''`：禁用原始 HTML；
- 禁止 `script`、`iframe`、`object`、`embed`、`form`、`img`、`svg`、`video` 等标签，避免脚本和自动加载外部图片；
- `ALLOWED_URI_REGEXP` 只允许 `http` / `https` / `mailto` / `tel`，阻断 `javascript:` 等危险 URL；
- 渲染后给所有链接补 `target="_blank"`、`rel="noopener noreferrer"` 与 `referrerpolicy="no-referrer"`；
- `TEXT` 类型不走 Markdown，直接以 `<pre>` 文本展示（Vue 自动转义）；
- `CARD` 类型才使用过滤后的 `v-html`。

公共详情页在挂载时动态插入 `<meta name="referrer" content="no-referrer">`，卸载时移除；链接不会把含票据的页面地址带到外部站点。

## 5. 过期与内容清理

公共详情响应包含 `serverTime`、`sentAt`、`expiresAt`、`expired`、`accessMode`。页面：

- 用 `serverTime - 本地时间` 校正倒计时；
- 每秒检查 `server now < expiresAt`；
- 当 `accessMode=WECHAT` 且到达 `expiresAt`（等于即过期）时，立即清空已渲染标题/正文/HTML，停止计时器，展示登录提示；
- 登录且有 `notification:record:query` 的账号过期后由后端返回 `accessMode=LOGIN`，页面保留内容并显示「链接已超过免登录有效期」提示；
- 切换路由 token 时先清空再加载；`onBeforeUnmount` 清空正文、HTML、计时器与临时 meta；
- 全程不使用 `localStorage` / `sessionStorage` 持久化正文。

## 6. 后台页面行为

- 渠道表头固定为渠道名称、路径编码、通知方式、配置摘要、状态、更新时间、操作（详情 / 编辑 / 删除）；不再单列 CorpID、AgentID、UserID、Secret。
- `utils/notification/channel.js` 集中维护 provider 标签、摘要、只读详情字段和统一地址校验。企业微信显示为「企业微信应用」，摘要示例：`应用1000002 · 接收2人 · 密钥已配置`，`@all` 显示「接收全体成员」；未知 provider 显示「未知类型 / 暂不支持的渠道类型」。
- 详情使用现有 `getChannel` 打开右侧只读抽屉，展示公共信息与企业微信专属 CorpID / AgentID / 接收 UserID / Secret 状态；接口本身不返回 Secret 或 tokenCipher，页面也不拼接任何密钥。
- 编辑弹窗分「基本信息」（名称、路径编码、类型、状态、备注）与「渠道配置」（按 provider 渲染企业微信表单）。已有渠道类型选择禁用；Secret 为空表示保持原值；新增/启用校验保留。
- 详情页地址是页面顶部独立卡片，展示当前生效值、来源、输入框与保存按钮；`notification:channel:edit` 权限才可编辑，只有 `list` 权限时可查看。保存调用 `updateDetailUrl`，`repeatSubmit: false`，不使用 localStorage / sessionStorage。
- 保存成功后立即刷新生效值，无需重启；保存失败保留上一次生效值并展示明确错误。说明文案明确“仅影响后续新通知”，所有路径共用同一地址。
- 地址规则前后端一致：生产必须 `https`；本地联调可填 `http://localhost:8080`、`http://127.0.0.1:8080` 或 `http://[::1]:8080`，其他 `http` 地址会被拒绝。
- 移动端：小于 768px 时抽屉全宽、编辑弹窗 94% 宽、表单标签置顶；摘要固定最多两行。
- 凭证、记录页行为不变；所有按钮继续使用 `v-hasPermi`，服务端方法权限仍是最终边界。

## 7. 前端测试

新增 `tests/notification/notification.test.js`，使用 Node 原生测试：

```bash
npm run test:notification
```

覆盖：

- 票据格式、精确过期、倒计时、登录回跳防开放重定向；
- 通知 API 路径、`repeatSubmit: false`、公共详情 `skipAuthHandler`；
- provider 中文标签、摘要（含 `@all`）、只读详情字段不泄漏 Secret，未知 provider 兜底；
- 统一详情页地址前后端同规则校验：https、localhost http、子路径/端口、去末尾 `/`，拒绝 userinfo/query/fragment/空白/超长；
- 渠道页使用通用表头、只读抽屉与统一地址卡片，不使用 localStorage / sessionStorage；
- 详情路由精确放行、守卫发生在菜单初始化之前；
- SQL 幂等建表、菜单 component 与实际页面一致、图标来自现有 SVG；
- Markdown 安全配置、公共详情不持久化正文、卸载/切换/到期清理。

## 本地验收记录（2026-10-21）

- 通知与工具箱回归共 83 项 Node 测试通过，生产构建通过。
- 8 组 Chromium 流程通过：登录提示、403/404、Markdown 安全与移动布局、到期清空、旧凭证登录回跳、通知渠道/调用凭证/通知记录真实后台路由；接口均使用本地模拟响应。
- 未使用真实企业微信凭据发送消息，未代替真实微信/企业微信客户端联调。

## 本地验收记录（2026-10-22）

- 通知与工具箱共 86 项 Node 测试、生产构建通过。
- 9 组 Chromium 模拟接口流程通过，覆盖通用表格、只读详情抽屉、分组编辑、Secret 不回显、地址保存成功/失败、无 edit 权限只读与移动端布局；无页面脚本异常或意外外部请求。
- 后端 70 项通知测试通过；本地增量迁移重复执行通过，真实数据库快照往返验收通过且测试数据全部回滚，后端已重启成功。本次未发送真实企业微信通知。
