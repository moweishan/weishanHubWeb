import test from 'node:test'
import assert from 'node:assert/strict'
import {
  base32Decode,
  base32Encode,
  buildOtpAuthUri,
  generateBase32Secret,
  generateHotp,
  generateTotp,
  hotp,
  verifyHotp,
  verifyTotp
} from '../../src/utils/toolbox/otp.js'

const RFC_SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'

test('Base32 编解码使用 RFC 4648 字母表', () => {
  const bytes = new TextEncoder().encode('12345678901234567890')
  assert.equal(base32Encode(bytes), RFC_SECRET)
  assert.deepEqual(Array.from(base32Decode(RFC_SECRET)), Array.from(bytes))
  assert.throws(() => base32Decode('ABC1'), /Base32/)
  assert.match(generateBase32Secret(20), /^[A-Z2-7]{32}$/)
})

test('RFC 6238 SHA-1 8 位测试向量', async () => {
  const vectors = [
    [59, '94287082'],
    [1111111109, '07081804'],
    [1111111111, '14050471'],
    [1234567890, '89005924'],
    [2000000000, '69279037'],
    [20000000000, '65353130']
  ]
  for (const [time, expected] of vectors) {
    const counter = BigInt(Math.floor(time / 30))
    assert.equal(await hotp(RFC_SECRET, counter, { digits: 8 }), expected, `T=${time}`)
  }
})

test('RFC 4226 HOTP 计数器 0 向量与校验', async () => {
  assert.equal(await hotp(RFC_SECRET, 0n, { digits: 6 }), '755224')
  const generated = await generateHotp(RFC_SECRET, { counter: 0 })
  assert.equal(generated.code, '755224')
  assert.equal((await verifyHotp(RFC_SECRET, '755224', 0)).valid, true)
  assert.equal((await verifyHotp(RFC_SECRET, '000000', 0)).valid, false)
})

test('TOTP 生成、窗口校验与 otpauth URI', async () => {
  const result = await generateTotp(RFC_SECRET, { now: 59000, digits: 8, period: 30 })
  assert.equal(result.code, '94287082')
  assert.equal(result.remaining, 1)
  const verified = await verifyTotp(RFC_SECRET, '94287082', { now: 59000, digits: 8, period: 30, window: 0 })
  assert.equal(verified.valid, true)
  const wrong = await verifyTotp(RFC_SECRET, '00000000', { now: 59000, digits: 8, period: 30, window: 0 })
  assert.equal(wrong.valid, false)
  const uri = buildOtpAuthUri({ secret: RFC_SECRET, issuer: 'weishanHub', account: 'a@b.c', digits: 8, period: 30 })
  assert.match(uri, /^otpauth:\/\/totp\//)
  assert.match(uri, /secret=GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ/)
  assert.match(uri, /digits=8/)
})
