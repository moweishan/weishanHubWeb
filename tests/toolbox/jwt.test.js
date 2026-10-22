import test from 'node:test'
import assert from 'node:assert/strict'
import { base64UrlToBytes, decodeJwt } from '../../src/utils/toolbox/jwt.js'

const SAMPLE =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'

function base64url(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url')
}

test('解码已知 JWT 的 Header/Payload，且不修改签名段', () => {
  const result = decodeJwt(SAMPLE)
  assert.equal(result.header.alg, 'HS256')
  assert.equal(result.payload.sub, '1234567890')
  assert.equal(result.payload.name, 'John Doe')
  assert.equal(result.signature, 'SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c')
  assert.equal(result.status.expired, null)
  assert.match(result.note, /未验证签名/)
  assert.equal(result.times.iat.iso, '2018-01-18T01:30:22.000Z')
})

test('exp/nbf 状态按时间判断，但仍不验证签名', () => {
  const now = 1_700_000_000_000
  const token = `${base64url({ alg: 'HS256', typ: 'JWT' })}.${base64url({
    exp: Math.floor(now / 1000) + 60,
    nbf: Math.floor(now / 1000) - 60,
    iat: Math.floor(now / 1000)
  })}.signature`
  const result = decodeJwt(token, now)
  assert.equal(result.status.expired, false)
  assert.equal(result.status.notBefore, false)
  assert.equal(result.status.issuedInFuture, false)
  assert.equal(decodeJwt(token, now + 120_000).status.expired, true)
})

test('base64url 解码与格式错误', () => {
  assert.equal(new TextDecoder().decode(base64UrlToBytes('5L2g5aW9')), '你好')
  assert.throws(() => decodeJwt('a.b'), /三段/)
  assert.throws(() => decodeJwt('a.b.c'), /Header/)
  assert.throws(() => decodeJwt('..'), /Header|Payload/)
  assert.throws(() => base64UrlToBytes('a$b'), /非法/)
})
