import test from 'node:test'
import assert from 'node:assert/strict'
import { dockerRunToCompose, tokenizeDockerCommand } from '../../src/utils/toolbox/docker.js'

test('docker run 转 compose.yaml 保留镜像、端口与卷', () => {
  const result = dockerRunToCompose(
    'docker run -d --name web -p 8080:80 -v nginx-html:/usr/share/nginx/html:ro --restart unless-stopped nginx:latest'
  )
  assert.match(result.yaml, /services:/)
  assert.match(result.yaml, /image: nginx:latest/)
  assert.match(result.yaml, /8080:80/)
  assert.match(result.yaml, /nginx-html/)
  assert.ok(Array.isArray(result.warnings))
})

test('未知选项、缺失参数与 shell 连接符明确报错', () => {
  assert.throws(
    () => dockerRunToCompose('docker run --definitely-unknown nginx:latest'),
    /不支持的 docker run 选项：--definitely-unknown/
  )
  assert.throws(() => dockerRunToCompose('docker run --name'), /缺少参数/)
  assert.throws(() => dockerRunToCompose('docker run nginx:latest && rm -rf /'), /单条 docker run/)
  assert.throws(() => dockerRunToCompose('docker create nginx:latest'), /docker run/)
  assert.throws(() => dockerRunToCompose('docker run --privileged "unclosed'), /未闭合/)
})

test('分词保留引号内空格，短选项组合可识别', () => {
  const tokens = tokenizeDockerCommand('docker run -dit --name "my app" -p8080:80 nginx:latest sh -c "echo hi"')
  assert.deepEqual(tokens.slice(0, 6), ['docker', 'run', '-dit', '--name', 'my app', '-p8080:80'])
  assert.equal(dockerRunToCompose('docker run -dit --name "my app" nginx:latest').yaml.includes('my app'), true)
})

test('敏感选项会附带警告，但不阻止转换', () => {
  const result = dockerRunToCompose(
    'docker run --privileged -e DB_PASSWORD=secret -v /var/run/docker.sock:/var/run/docker.sock nginx'
  )
  assert.ok(result.warnings.some((item) => item.includes('privileged')))
  assert.ok(result.warnings.some((item) => item.includes('docker.sock')))
  assert.ok(result.warnings.some((item) => item.includes('密钥')))
})
