/** docker run 文本转 compose.yaml。只做文本解析，绝不执行命令。 */

import * as composerizeModule from 'composerize'

const convertDockerRun =
  typeof composerizeModule === 'function'
    ? composerizeModule
    : composerizeModule.default || composerizeModule.composerize

const BOOLEAN_LONG = new Set([
  'detach',
  'interactive',
  'tty',
  'publish-all',
  'privileged',
  'init',
  'read-only',
  'rm',
  'no-healthcheck',
  'oom-kill-disable',
  'disable-content-trust',
  'quiet',
  'sig-proxy'
])

const VALUE_LONG = new Set([
  'name',
  'hostname',
  'domainname',
  'user',
  'workdir',
  'entrypoint',
  'env',
  'env-file',
  'label',
  'label-file',
  'publish',
  'expose',
  'volume',
  'volumes-from',
  'mount',
  'tmpfs',
  'volume-driver',
  'network',
  'net',
  'network-alias',
  'add-host',
  'link',
  'link-local-ip',
  'ip',
  'ip6',
  'mac-address',
  'dns',
  'dns-search',
  'dns-option',
  'restart',
  'stop-signal',
  'stop-timeout',
  'health-cmd',
  'health-interval',
  'health-timeout',
  'health-retries',
  'health-start-period',
  'health-start-interval',
  'log-driver',
  'log-opt',
  'cpus',
  'cpu-shares',
  'cpuset-cpus',
  'cpuset-mems',
  'cpu-period',
  'cpu-quota',
  'cpu-rt-period',
  'cpu-rt-runtime',
  'memory',
  'memory-swap',
  'memory-reservation',
  'memory-swappiness',
  'kernel-memory',
  'shm-size',
  'device',
  'device-cgroup-rule',
  'gpus',
  'ulimit',
  'security-opt',
  'cap-add',
  'cap-drop',
  'group-add',
  'pid',
  'ipc',
  'uts',
  'userns',
  'cgroup-parent',
  'cgroupns',
  'runtime',
  'platform',
  'pull',
  'attach',
  'detach-keys',
  'storage-opt',
  'sysctl',
  'annotation',
  'cidfile',
  'pids-limit',
  'blkio-weight',
  'blkio-weight-device',
  'oom-score-adj',
  'isolation',
  'cgroup-parent'
])

const BOOLEAN_SHORT = new Set(['d', 'i', 't', 'P', 'q'])
const VALUE_SHORT = new Set(['e', 'p', 'v', 'u', 'w', 'h', 'l', 'c', 'm', 'a'])

/**
 * Shell 风格分词，只处理引号与反斜杠，不展开变量、不执行命令。
 * 返回 token 数组；引号内容会合并。
 */
export function tokenizeDockerCommand(input) {
  const text = String(input ?? '')
  const tokens = []
  let current = ''
  let quote = ''
  let hasToken = false
  for (let index = 0; index < text.length; index++) {
    const char = text[index]
    if (quote) {
      if (char === quote) {
        quote = ''
      } else if (char === '\\' && quote === '"' && index + 1 < text.length) {
        const next = text[index + 1]
        if (next === '"' || next === '\\') {
          current += next
          index++
        } else {
          current += char
        }
      } else {
        current += char
      }
      hasToken = true
      continue
    }
    if (char === '"' || char === "'") {
      quote = char
      hasToken = true
      continue
    }
    if (char === '\\' && index + 1 < text.length) {
      const next = text[index + 1]
      if (next === ' ' || next === '"' || next === "'" || next === '\\') {
        current += next
        index++
      } else {
        current += char
      }
      hasToken = true
      continue
    }
    if (/\s/.test(char)) {
      if (hasToken) {
        tokens.push(current)
        current = ''
        hasToken = false
      }
      continue
    }
    current += char
    hasToken = true
  }
  if (quote) throw new Error('命令中存在未闭合的引号')
  if (hasToken) tokens.push(current)
  return tokens
}

function consumeOption(tokens, index, imageFound) {
  const token = tokens[index]
  if (token === '--') return { next: index + 1, imageFound }
  if (token.startsWith('--')) {
    const equalIndex = token.indexOf('=')
    const name = equalIndex >= 0 ? token.slice(2, equalIndex) : token.slice(2)
    if (!name) throw new Error('存在空的 docker run 选项')
    const hasInlineValue = equalIndex >= 0
    if (BOOLEAN_LONG.has(name)) return { next: index + 1, imageFound }
    if (!VALUE_LONG.has(name)) throw new Error(`不支持的 docker run 选项：--${name}`)
    if (hasInlineValue) return { next: index + 1, imageFound }
    if (index + 1 >= tokens.length) throw new Error(`选项 --${name} 缺少参数`)
    return { next: index + 2, imageFound }
  }
  if (token.startsWith('-') && token.length > 1) {
    for (let offset = 1; offset < token.length; offset++) {
      const flag = token[offset]
      if (BOOLEAN_SHORT.has(flag)) continue
      if (!VALUE_SHORT.has(flag)) throw new Error(`不支持的 docker run 选项：-${flag}`)
      if (offset + 1 < token.length) return { next: index + 1, imageFound }
      if (index + 1 >= tokens.length) throw new Error(`选项 -${flag} 缺少参数`)
      return { next: index + 2, imageFound }
    }
    return { next: index + 1, imageFound }
  }
  if (!imageFound) return { next: index + 1, imageFound: true }
  return { next: index + 1, imageFound }
}

function validateCommand(tokens) {
  if (!tokens.length) throw new Error('请输入 docker run 命令')
  const shellOperators = new Set(['&&', '||', ';', '|', '>', '<', '>>', '2>', '&'])
  if (tokens.some((token) => shellOperators.has(token))) {
    throw new Error('只接受单条 docker run 命令，不支持管道、重定向或命令连接符')
  }
  let index = 0
  if (tokens[0] === 'docker' && tokens[1] === 'run') index = 2
  else if (tokens[0] === 'docker' && tokens[1] === 'container' && tokens[2] === 'run') index = 3
  else throw new Error('命令必须以 docker run 或 docker container run 开头')
  let imageFound = false
  while (index < tokens.length) {
    if (imageFound) break
    if (tokens[index] === '--') {
      if (index + 1 >= tokens.length) throw new Error('未找到镜像名称，例如 nginx:latest')
      imageFound = true
      break
    }
    const result = consumeOption(tokens, index, imageFound)
    imageFound = result.imageFound
    index = result.next
  }
  if (!imageFound) throw new Error('未找到镜像名称，例如 nginx:latest')
}

export function dockerRunToCompose(command) {
  const text = String(command ?? '').trim()
  if (!text) throw new Error('请输入 docker run 命令')
  if (text.includes('\n')) throw new Error('一次只支持一条 docker run 命令，请不要包含换行')
  const tokens = tokenizeDockerCommand(text)
  validateCommand(tokens)
  let yaml
  try {
    if (typeof convertDockerRun !== 'function') throw new Error('composerize 依赖未正确加载')
    yaml = convertDockerRun(text, null, 'latest', 2)
  } catch (error) {
    throw new Error(`composerize 转换失败：${error.message}`)
  }
  if (typeof yaml !== 'string' || !yaml.trim()) throw new Error('composerize 未返回有效内容')
  if (!/services\s*:/.test(yaml)) throw new Error('composerize 输出中没有 services，请检查命令是否完整')
  const warnings = []
  if (/--privileged(?:=|\s|$)/.test(text)) warnings.push('--privileged 会显著扩大容器权限，请确认必要性。')
  if (/docker\.sock/.test(text)) warnings.push('挂载 docker.sock 等同于把宿主机 Docker 控制权交给容器。')
  if (/--(?:pid|ipc|network|net)(?:=|\s)host\b/.test(text)) {
    warnings.push('使用 host 命名空间会削弱容器隔离，请确认必要性。')
  }
  if (/(?:^|\s)(?:-e|--env)[ =]\S*(?:PASSWORD|TOKEN|SECRET|KEY)=/i.test(text)) {
    warnings.push('命令中可能包含明文环境变量密钥，生成的 Compose 文本也会包含它。')
  }
  return { yaml, warnings, tokens }
}
