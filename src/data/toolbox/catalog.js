/**
 * 工具箱目录注册表。
 *
 * 本文件只包含可 JSON 序列化的数据，不引用 Vue 组件、函数或浏览器对象。
 * 动态菜单中的 component 字段与 src/views 下的页面路径保持一致。
 */

export const toolboxModule = Object.freeze({
  path: '/toolbox',
  title: '工具箱',
  routeName: 'Toolbox',
  permission: 'toolbox:view'
})

export const toolboxCategories = Object.freeze([
  {
    key: 'files',
    title: '文件处理',
    description: '图片、PDF 与表格文件的本地转换与页面处理。',
    icon: 'Folder',
    order: 10,
    routeName: 'ToolboxFiles',
    permission: 'toolbox:files:view'
  },
  {
    key: 'convert',
    title: '格式转换',
    description: '日期、进制、编码、颜色与结构化数据格式转换。',
    icon: 'Switch',
    order: 20,
    routeName: 'ToolboxConvert',
    permission: 'toolbox:convert:view'
  },
  {
    key: 'web',
    title: '网页工具',
    description: 'URL、HTML、JWT、UA、OTP 与 HTTP 状态等 Web 开发常用工具。',
    icon: 'Monitor',
    order: 30,
    routeName: 'ToolboxWeb',
    permission: 'toolbox:web:view'
  },
  {
    key: 'development',
    title: '开发辅助',
    description: 'Git、Cron、JSON、SQL、chmod、Docker 与正则等开发辅助工具。',
    icon: 'Tools',
    order: 40,
    routeName: 'ToolboxDevelopment',
    permission: 'toolbox:development:view'
  },
  {
    key: 'security',
    title: '加密与安全',
    description: '随机数、哈希、密码、UUID/ULID、对称加密与 RSA 密钥。',
    icon: 'Lock',
    order: 50,
    routeName: 'ToolboxSecurity',
    permission: 'toolbox:security:view'
  }
])

/**
 * 63 个工具箱叶子项。
 * component 不含 .vue 后缀；routeName 与 permission 全局唯一。
 */
export const toolboxTools = Object.freeze([
  // ---------- files ----------
  {
    category: 'files',
    slug: 'image-convert',
    title: '图片格式转换',
    description: '在浏览器本地把常见图片转换为 PNG、JPEG 或 WebP。',
    component: 'toolbox/files/image-convert/index',
    routeName: 'ToolboxImageConvert',
    permission: 'toolbox:imageConvert:view',
    implemented: true
  },
  {
    category: 'files',
    slug: 'image-to-pdf',
    title: '图片转 PDF',
    description: '把多张图片按顺序合成 PDF，不上传文件。',
    component: 'toolbox/files/image-to-pdf/index',
    routeName: 'ToolboxImageToPdf',
    permission: 'toolbox:imageToPdf:view',
    implemented: true
  },
  {
    category: 'files',
    slug: 'pdf-to-images',
    title: 'PDF 转图片',
    description: '把 PDF 页面渲染为图片并逐页下载。',
    component: 'toolbox/files/pdf-to-images/index',
    routeName: 'ToolboxPdfToImages',
    permission: 'toolbox:pdfToImages:view',
    implemented: true
  },
  {
    category: 'files',
    slug: 'pdf-pages',
    title: 'PDF 页面处理',
    description: '合并、拆分、提取、旋转或重排 PDF 页面，使用页面复制而非截图。',
    component: 'toolbox/files/pdf-pages/index',
    routeName: 'ToolboxPdfPages',
    permission: 'toolbox:pdfPages:view',
    implemented: true
  },
  {
    category: 'files',
    slug: 'spreadsheet-convert',
    title: '表格文件转换',
    description: '在 XLSX、CSV 等表格格式之间转换。',
    component: 'toolbox/files/spreadsheet-convert/index',
    routeName: 'ToolboxSpreadsheetConvert',
    permission: 'toolbox:spreadsheetConvert:view',
    implemented: true
  },

  // ---------- convert（20） ----------
  {
    category: 'convert',
    slug: 'date-time',
    title: '日期时间转换',
    description: '在 Unix 秒/毫秒、ISO、本地时间与 UTC 之间转换，并显示时区与星期。',
    component: 'toolbox/convert/date-time/index',
    routeName: 'ToolboxDateTime',
    permission: 'toolbox:dateTime:view',
    implemented: true
  },
  {
    category: 'convert',
    slug: 'base-convert',
    title: '整数进制转换',
    description: '使用 BigInt 在 2 至 36 进制之间转换任意大小整数，不经过 Number。',
    component: 'toolbox/convert/base-convert/index',
    routeName: 'ToolboxBaseConvert',
    permission: 'toolbox:baseConvert:view',
    implemented: true
  },
  {
    category: 'convert',
    slug: 'roman-numeral',
    title: '罗马数字转换',
    description: '在 1 至 3999 的整数与罗马数字之间双向转换，越界明确报错。',
    component: 'toolbox/convert/roman-numeral/index',
    routeName: 'ToolboxRomanNumeral',
    permission: 'toolbox:romanNumeral:view',
    implemented: true
  },
  {
    category: 'convert',
    slug: 'base64-text',
    title: 'Base64 文本编解码',
    description: '按 UTF-8 对文本做 Base64 编码与解码，支持 emoji 往返。',
    component: 'toolbox/convert/base64-text/index',
    routeName: 'ToolboxBase64Text',
    permission: 'toolbox:base64Text:view',
    implemented: true
  },
  {
    category: 'convert',
    slug: 'base64-file',
    title: 'Base64 文件转换',
    description: '本地读取文件转 Base64，或把 Base64 还原为文件下载。',
    component: 'toolbox/convert/base64-file/index',
    routeName: 'ToolboxBase64File',
    permission: 'toolbox:base64File:view',
    implemented: true
  },
  {
    category: 'convert',
    slug: 'color-convert',
    title: '颜色格式转换',
    description: '在 HEX、RGB(A) 与 HSL(A) 之间转换，并提供颜色预览与对比度参考。',
    component: 'toolbox/convert/color-convert/index',
    routeName: 'ToolboxColorConvert',
    permission: 'toolbox:colorConvert:view',
    implemented: true
  },
  {
    category: 'convert',
    slug: 'case-convert',
    title: '大小写与命名转换',
    description: '在大小写、camelCase、PascalCase、snake_case、kebab-case 等命名之间转换。',
    component: 'toolbox/convert/case-convert/index',
    routeName: 'ToolboxCaseConvert',
    permission: 'toolbox:caseConvert:view',
    implemented: true
  },
  {
    category: 'convert',
    slug: 'nato-alphabet',
    title: '北约音标字母转换',
    description: '把字母和数字转换为 NATO 音标词，或从音标词还原文本。',
    component: 'toolbox/convert/nato-alphabet/index',
    routeName: 'ToolboxNatoAlphabet',
    permission: 'toolbox:natoAlphabet:view',
    implemented: true
  },
  {
    category: 'convert',
    slug: 'text-binary',
    title: '文本与二进制转换',
    description: '按 UTF-8 字节在文本与 8 位二进制之间转换，可自定义分隔符。',
    component: 'toolbox/convert/text-binary/index',
    routeName: 'ToolboxTextBinary',
    permission: 'toolbox:textBinary:view',
    implemented: true
  },
  {
    category: 'convert',
    slug: 'text-unicode',
    title: '文本与 Unicode 转换',
    description: '在文本与码点转义、UTF-16 转义或 HTML 数字实体之间转换。',
    component: 'toolbox/convert/text-unicode/index',
    routeName: 'ToolboxTextUnicode',
    permission: 'toolbox:textUnicode:view',
    implemented: true
  },
  {
    category: 'convert',
    slug: 'yaml-to-json',
    title: 'YAML 转 JSON',
    description: '使用 yaml 库解析 YAML 并输出标准 JSON，保留键顺序。',
    component: 'toolbox/convert/yaml-to-json/index',
    routeName: 'ToolboxYamlToJson',
    permission: 'toolbox:yamlToJson:view',
    implemented: true
  },
  {
    category: 'convert',
    slug: 'yaml-to-toml',
    title: 'YAML 转 TOML',
    description: '解析 YAML 后使用 smol-toml 输出 TOML，无法表达的根结构会明确报错。',
    component: 'toolbox/convert/yaml-to-toml/index',
    routeName: 'ToolboxYamlToToml',
    permission: 'toolbox:yamlToToml:view',
    implemented: true
  },
  {
    category: 'convert',
    slug: 'json-to-yaml',
    title: 'JSON 转 YAML',
    description: '校验 JSON 后输出 YAML，可选择缩进与行宽。',
    component: 'toolbox/convert/json-to-yaml/index',
    routeName: 'ToolboxJsonToYaml',
    permission: 'toolbox:jsonToYaml:view',
    implemented: true
  },
  {
    category: 'convert',
    slug: 'json-to-toml',
    title: 'JSON 转 TOML',
    description: '校验 JSON 后使用 smol-toml 输出 TOML，数组嵌套等不兼容结构会报错。',
    component: 'toolbox/convert/json-to-toml/index',
    routeName: 'ToolboxJsonToToml',
    permission: 'toolbox:jsonToToml:view',
    implemented: true
  },
  {
    category: 'convert',
    slug: 'list-tools',
    title: '列表整理',
    description: '按行整理列表，支持排序、去重、去空行、前后缀、分隔符与编号。',
    component: 'toolbox/convert/list-tools/index',
    routeName: 'ToolboxListTools',
    permission: 'toolbox:listTools:view',
    implemented: true
  },
  {
    category: 'convert',
    slug: 'toml-to-json',
    title: 'TOML 转 JSON',
    description: '使用 smol-toml 解析 TOML 并输出 JSON。',
    component: 'toolbox/convert/toml-to-json/index',
    routeName: 'ToolboxTomlToJson',
    permission: 'toolbox:tomlToJson:view',
    implemented: true
  },
  {
    category: 'convert',
    slug: 'toml-to-yaml',
    title: 'TOML 转 YAML',
    description: '解析 TOML 后输出 YAML，日期等类型会按 TOML 语义转换。',
    component: 'toolbox/convert/toml-to-yaml/index',
    routeName: 'ToolboxTomlToYaml',
    permission: 'toolbox:tomlToYaml:view',
    implemented: true
  },
  {
    category: 'convert',
    slug: 'xml-to-json',
    title: 'XML 转 JSON',
    description: '使用 fast-xml-parser 把 XML 转为 JSON，可配置属性前缀与文本节点名，并提示无损性限制。',
    component: 'toolbox/convert/xml-to-json/index',
    routeName: 'ToolboxXmlToJson',
    permission: 'toolbox:xmlToJson:view',
    implemented: true
  },
  {
    category: 'convert',
    slug: 'json-to-xml',
    title: 'JSON 转 XML',
    description: '把 JSON 对象构建为 XML，可设置根元素、声明与缩进，并明确提示属性映射限制。',
    component: 'toolbox/convert/json-to-xml/index',
    routeName: 'ToolboxJsonToXml',
    permission: 'toolbox:jsonToXml:view',
    implemented: true
  },
  {
    category: 'convert',
    slug: 'markdown-to-html',
    title: 'Markdown 转 HTML',
    description: '使用 marked 渲染 Markdown，经 DOMPurify 过滤后在无脚本 sandbox 中预览。',
    component: 'toolbox/convert/markdown-to-html/index',
    routeName: 'ToolboxMarkdownToHtml',
    permission: 'toolbox:markdownToHtml:view',
    implemented: true
  },

  // ---------- web（16） ----------
  {
    category: 'web',
    slug: 'url-codec',
    title: 'URL 编解码',
    description: '区分完整 URL 与查询参数值，正确使用 encodeURI/encodeURIComponent 进行编解码。',
    component: 'toolbox/web/url-codec/index',
    routeName: 'ToolboxUrlCodec',
    permission: 'toolbox:urlCodec:view',
    implemented: true
  },
  {
    category: 'web',
    slug: 'html-entities',
    title: 'HTML 实体编解码',
    description: '编码或解码 HTML 命名实体与数字实体，解码结果只作为文本展示。',
    component: 'toolbox/web/html-entities/index',
    routeName: 'ToolboxHtmlEntities',
    permission: 'toolbox:htmlEntities:view',
    implemented: true
  },
  {
    category: 'web',
    slug: 'url-parser',
    title: 'URL 解析',
    description: '解析协议、主机、端口、路径、查询参数与片段，并以 JSON 展示。',
    component: 'toolbox/web/url-parser/index',
    routeName: 'ToolboxUrlParser',
    permission: 'toolbox:urlParser:view',
    implemented: true
  },
  {
    category: 'web',
    slug: 'device-info',
    title: '设备与浏览器信息',
    description: '读取当前浏览器的 UA、屏幕、语言、时区与硬件并发等本地信息。',
    component: 'toolbox/web/device-info/index',
    routeName: 'ToolboxDeviceInfo',
    permission: 'toolbox:deviceInfo:view',
    implemented: true
  },
  {
    category: 'web',
    slug: 'basic-auth',
    title: 'Basic Auth 生成',
    description: '按 UTF-8 生成或解析 HTTP Basic Authorization 请求头。',
    component: 'toolbox/web/basic-auth/index',
    routeName: 'ToolboxBasicAuth',
    permission: 'toolbox:basicAuth:view',
    implemented: true
  },
  {
    category: 'web',
    slug: 'meta-tags',
    title: 'Meta 标签生成',
    description: '生成 title、description、Open Graph、Twitter Card 与 canonical 等常用标签。',
    component: 'toolbox/web/meta-tags/index',
    routeName: 'ToolboxMetaTags',
    permission: 'toolbox:metaTags:view',
    implemented: true
  },
  {
    category: 'web',
    slug: 'otp',
    title: 'OTP 口令生成与校验',
    description: '本地生成和校验 TOTP/HOTP 认证器口令，支持 Base32、时间步长、位数与窗口。',
    component: 'toolbox/web/otp/index',
    routeName: 'ToolboxOtp',
    permission: 'toolbox:otp:view',
    implemented: true
  },
  {
    category: 'web',
    slug: 'mime-types',
    title: 'MIME 类型查询',
    description: '按扩展名或 MIME 类型查询常见文件类型，未知类型会明确提示。',
    component: 'toolbox/web/mime-types/index',
    routeName: 'ToolboxMimeTypes',
    permission: 'toolbox:mimeTypes:view',
    implemented: true
  },
  {
    category: 'web',
    slug: 'jwt-parser',
    title: 'JWT 解析',
    description: '仅解码 JWT 的 Header 与 Payload，展示时间声明，不验证签名。',
    component: 'toolbox/web/jwt-parser/index',
    routeName: 'ToolboxJwtParser',
    permission: 'toolbox:jwtParser:view',
    implemented: true
  },
  {
    category: 'web',
    slug: 'keyboard-events',
    title: '键盘按键查询',
    description: '捕获按键并显示 key、code、keyCode、位置与修饰键状态。',
    component: 'toolbox/web/keyboard-events/index',
    routeName: 'ToolboxKeyboardEvents',
    permission: 'toolbox:keyboardEvents:view',
    implemented: true
  },
  {
    category: 'web',
    slug: 'slug-generator',
    title: 'URL Slug 生成',
    description: '把标题转换为 URL 友好的 slug，支持分隔符、大小写与 Unicode 选项。',
    component: 'toolbox/web/slug-generator/index',
    routeName: 'ToolboxSlugGenerator',
    permission: 'toolbox:slugGenerator:view',
    implemented: true
  },
  {
    category: 'web',
    slug: 'html-editor',
    title: 'HTML 可视化编辑',
    description: '代码与受控可视编辑组合，预览使用 DOMPurify 过滤与无脚本 sandbox iframe。',
    component: 'toolbox/web/html-editor/index',
    routeName: 'ToolboxHtmlEditor',
    permission: 'toolbox:htmlEditor:view',
    implemented: true
  },
  {
    category: 'web',
    slug: 'ua-parser',
    title: 'User-Agent 解析',
    description: '使用 ua-parser-js v1 解析浏览器、操作系统、设备与引擎信息。',
    component: 'toolbox/web/ua-parser/index',
    routeName: 'ToolboxUaParser',
    permission: 'toolbox:uaParser:view',
    implemented: true
  },
  {
    category: 'web',
    slug: 'http-status',
    title: 'HTTP 状态码查询',
    description: '按状态码或关键字查询常用 HTTP 状态码的含义与说明。',
    component: 'toolbox/web/http-status/index',
    routeName: 'ToolboxHttpStatus',
    permission: 'toolbox:httpStatus:view',
    implemented: true
  },
  {
    category: 'web',
    slug: 'json-diff',
    title: 'JSON 差异对比',
    description: '比较两段 JSON 的新增、删除与修改，忽略对象键顺序。',
    component: 'toolbox/web/json-diff/index',
    routeName: 'ToolboxJsonDiff',
    permission: 'toolbox:jsonDiff:view',
    implemented: true
  },
  {
    category: 'web',
    slug: 'safe-links',
    title: 'Safe Links 解码',
    description: '只解析 Safe Links 的受支持 url 查询参数并展示结果，不访问第三方网址。',
    component: 'toolbox/web/safe-links/index',
    routeName: 'ToolboxSafeLinks',
    permission: 'toolbox:safeLinks:view',
    implemented: true
  },

  // ---------- development（14） ----------
  {
    category: 'development',
    slug: 'git-cheatsheet',
    title: 'Git 命令速查',
    description: '搜索常用 Git 命令与说明，一键复制命令文本。',
    component: 'toolbox/development/git-cheatsheet/index',
    routeName: 'ToolboxGitCheatsheet',
    permission: 'toolbox:gitCheatsheet:view',
    implemented: true
  },
  {
    category: 'development',
    slug: 'random-port',
    title: '随机端口号生成',
    description: '使用 crypto 生成指定范围内的端口号，明确不检测端口占用。',
    component: 'toolbox/development/random-port/index',
    routeName: 'ToolboxRandomPort',
    permission: 'toolbox:randomPort:view',
    implemented: true
  },
  {
    category: 'development',
    slug: 'cron-generator',
    title: 'Crontab 表达式生成',
    description: '标准 5 字段 Cron 生成器、校验、中文说明与后续执行时间预览。',
    component: 'toolbox/development/cron-generator/index',
    routeName: 'ToolboxCronGenerator',
    permission: 'toolbox:cronGenerator:view',
    implemented: true
  },
  {
    category: 'development',
    slug: 'json-viewer',
    title: 'JSON 查看与格式化',
    description: '校验并美化 JSON，可调整缩进并查看结构。',
    component: 'toolbox/development/json-viewer/index',
    routeName: 'ToolboxJsonViewer',
    permission: 'toolbox:jsonViewer:view',
    implemented: true
  },
  {
    category: 'development',
    slug: 'json-minify',
    title: 'JSON 压缩',
    description: '校验 JSON 后移除多余空白，可选按键排序，不改变值。',
    component: 'toolbox/development/json-minify/index',
    routeName: 'ToolboxJsonMinify',
    permission: 'toolbox:jsonMinify:view',
    implemented: true
  },
  {
    category: 'development',
    slug: 'json-to-csv',
    title: 'JSON 转 CSV',
    description: '把对象数组转换为 CSV，正确处理逗号、双引号与换行。',
    component: 'toolbox/development/json-to-csv/index',
    routeName: 'ToolboxJsonToCsv',
    permission: 'toolbox:jsonToCsv:view',
    implemented: true
  },
  {
    category: 'development',
    slug: 'sql-formatter',
    title: 'SQL 格式化',
    description: '使用 sql-formatter 按方言、缩进与关键字大小写格式化 SQL 文本。',
    component: 'toolbox/development/sql-formatter/index',
    routeName: 'ToolboxSqlFormatter',
    permission: 'toolbox:sqlFormatter:view',
    implemented: true
  },
  {
    category: 'development',
    slug: 'chmod-calc',
    title: 'chmod 权限计算',
    description: '在 rwx 复选、符号权限与八进制之间计算，支持 setuid/setgid/sticky。',
    component: 'toolbox/development/chmod-calc/index',
    routeName: 'ToolboxChmodCalc',
    permission: 'toolbox:chmodCalc:view',
    implemented: true
  },
  {
    category: 'development',
    slug: 'docker-compose',
    title: 'Docker 命令转 Compose',
    description: '把 docker run 转为 compose.yaml，未知选项明确报错，不执行任何命令。',
    component: 'toolbox/development/docker-compose/index',
    routeName: 'ToolboxDockerCompose',
    permission: 'toolbox:dockerCompose:view',
    implemented: true
  },
  {
    category: 'development',
    slug: 'xml-formatter',
    title: 'XML 格式化',
    description: '校验并格式化 XML，明确提示注释、CDATA 与命名空间可能被结构重写。',
    component: 'toolbox/development/xml-formatter/index',
    routeName: 'ToolboxXmlFormatter',
    permission: 'toolbox:xmlFormatter:view',
    implemented: true
  },
  {
    category: 'development',
    slug: 'yaml-viewer',
    title: 'YAML 查看与格式化',
    description: '解析并格式化 YAML，可选择缩进与行宽，错误会定位到行列。',
    component: 'toolbox/development/yaml-viewer/index',
    routeName: 'ToolboxYamlViewer',
    permission: 'toolbox:yamlViewer:view',
    implemented: true
  },
  {
    category: 'development',
    slug: 'email-normalize',
    title: '邮箱地址规范化',
    description: '校验并规范化邮箱大小写、加号标签与 Gmail 点号，规则可独立开关。',
    component: 'toolbox/development/email-normalize/index',
    routeName: 'ToolboxEmailNormalize',
    permission: 'toolbox:emailNormalize:view',
    implemented: true
  },
  {
    category: 'development',
    slug: 'regex-tester',
    title: '正则表达式测试',
    description: '在 Worker 中执行匹配并设置硬超时，避免灾难性回溯卡住页面。',
    component: 'toolbox/development/regex-tester/index',
    routeName: 'ToolboxRegexTester',
    permission: 'toolbox:regexTester:view',
    implemented: true
  },
  {
    category: 'development',
    slug: 'regex-cheatsheet',
    title: '正则语法速查',
    description: '可搜索的正则元字符、量词、分组、断言与常用模式速查。',
    component: 'toolbox/development/regex-cheatsheet/index',
    routeName: 'ToolboxRegexCheatsheet',
    permission: 'toolbox:regexCheatsheet:view',
    implemented: true
  },

  // ---------- security（8） ----------
  {
    category: 'security',
    slug: 'random-string',
    title: '随机字符串生成',
    description: '使用 crypto 安全随机生成指定长度与字符集的随机字符串。',
    component: 'toolbox/security/random-string/index',
    routeName: 'ToolboxRandomString',
    permission: 'toolbox:randomString:view',
    implemented: true
  },
  {
    category: 'security',
    slug: 'text-hash',
    title: '文本哈希计算',
    description: '使用 WebCrypto 计算 SHA-1/SHA-256/SHA-384/SHA-512 摘要。',
    component: 'toolbox/security/text-hash/index',
    routeName: 'ToolboxTextHash',
    permission: 'toolbox:textHash:view',
    implemented: true
  },
  {
    category: 'security',
    slug: 'bcrypt',
    title: 'BCrypt 生成与校验',
    description: '使用 bcryptjs 生成与校验 BCrypt 哈希，异步执行并限制 cost。',
    component: 'toolbox/security/bcrypt/index',
    routeName: 'ToolboxBcrypt',
    permission: 'toolbox:bcrypt:view',
    implemented: true
  },
  {
    category: 'security',
    slug: 'uuid',
    title: 'UUID 生成',
    description: '使用 crypto.randomUUID 生成 UUID v4，可批量并调整显示格式。',
    component: 'toolbox/security/uuid/index',
    routeName: 'ToolboxUuid',
    permission: 'toolbox:uuid:view',
    implemented: true
  },
  {
    category: 'security',
    slug: 'ulid',
    title: 'ULID 生成',
    description: '使用 crypto 随机生成可按时间排序的 ULID，支持指定时间戳。',
    component: 'toolbox/security/ulid/index',
    routeName: 'ToolboxUlid',
    permission: 'toolbox:ulid:view',
    implemented: true
  },
  {
    category: 'security',
    slug: 'text-encrypt',
    title: '文本加密与解密',
    description: 'AES-GCM + PBKDF2 随机 salt/iv 的带版本文本加解密，密码错误明确提示。',
    component: 'toolbox/security/text-encrypt/index',
    routeName: 'ToolboxTextEncrypt',
    permission: 'toolbox:textEncrypt:view',
    implemented: true
  },
  {
    category: 'security',
    slug: 'rsa-keypair',
    title: 'RSA 密钥对生成',
    description: '使用 WebCrypto 生成 RSA-OAEP 密钥对并导出 PKCS#8/SPKI PEM。',
    component: 'toolbox/security/rsa-keypair/index',
    routeName: 'ToolboxRsaKeypair',
    permission: 'toolbox:rsaKeypair:view',
    implemented: true
  },
  {
    category: 'security',
    slug: 'pdf-signature',
    title: 'PDF 签名检查',
    description: '本地解析 PDF 签名结构与 PKCS#7/CMS RSA 摘要/签名，展示证书主体、签发者与有效期；不验证证书受信或撤销。',
    component: 'toolbox/security/pdf-signature/index',
    routeName: 'ToolboxPdfSignature',
    permission: 'toolbox:pdfSignature:view',
    implemented: true
  }
])

export const toolboxCatalog = Object.freeze({
  module: toolboxModule,
  categories: toolboxCategories,
  tools: toolboxTools
})

export function getToolboxTool(slug) {
  return toolboxTools.find((tool) => tool.slug === slug) || null
}

export function getToolboxToolsByCategory(category) {
  return toolboxTools.filter((tool) => tool.category === category)
}

export function getToolboxCategory(category) {
  return toolboxCategories.find((item) => item.key === category) || null
}

export function getToolboxPath(tool) {
  return `/toolbox/${tool.category}/${tool.slug}`
}

/** 导出为可持久化到菜单表/JSON 文件的纯数据。 */
export function serializeToolboxCatalog() {
  return JSON.stringify(toolboxCatalog, null, 2)
}

export default toolboxCatalog
