import test from 'node:test'
import assert from 'node:assert/strict'
import {
  createUuidV4,
  decryptText,
  encryptText,
  formatUuid,
  generateRsaKeyPair,
  generateUlids,
  generateUuids,
  hashText,
  randomInt,
  randomString
} from '../../src/utils/toolbox/crypto.js'
import { bcryptHash, bcryptVerify, normalizeBcryptCost } from '../../src/utils/toolbox/password.js'

test('SHA 族摘要与标准向量一致', async () => {
  assert.equal(await hashText('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
  assert.equal(
    (await hashText('abc', { algorithm: 'SHA-1', uppercase: true })).toLowerCase(),
    'a9993e364706816aba3e25717850c26c9cd0d89d'
  )
  await assert.rejects(() => hashText('abc', { algorithm: 'MD5' }), /仅支持/)
})

test('随机整数与随机字符串使用 crypto 且遵守字符集', () => {
  for (let index = 0; index < 50; index++) {
    const value = randomInt(10, 12)
    assert.ok(value >= 10 && value <= 12)
  }
  const value = randomString({ length: 64, symbols: false, excludeAmbiguous: true })
  assert.equal(value.length, 64)
  assert.match(value, /^[A-HJ-NP-Za-km-np-z2-9]+$/)
  assert.throws(() => randomInt(5, 1), /范围/)
  assert.throws(() => randomString({ length: 0 }), /长度/)
  assert.throws(() => randomString({ uppercase: false, lowercase: false, digits: false }), /字符集/)
})

test('UUID v4 格式与显示选项', () => {
  const value = createUuidV4()
  assert.match(value, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  const list = generateUuids(3, { uppercase: true, braces: true, hyphens: false })
  assert.equal(list.length, 3)
  for (const uuid of list) assert.match(uuid, /^\{[0-9A-F]{32}\}$/)
  assert.equal(formatUuid(value, { uppercase: true }), value.toUpperCase())
})

test('ULID 长度、Crockford Base32 字符集与同毫秒单调有序', () => {
  const list = generateUlids(5, 1700000000000)
  assert.equal(list.length, 5)
  for (const value of list) assert.match(value, /^[0-9A-HJKMNP-TV-Z]{26}$/)
  const sorted = [...list].sort()
  assert.deepEqual(list, sorted)
  assert.throws(() => generateUlids(1, 281474976710656), /时间戳/)
})

test('AES-GCM + PBKDF2 加密往返、随机 salt/iv 与错误密码', async () => {
  const plaintext = '你好 weishanHub 👋\n第二行'
  const first = await encryptText('correct horse battery staple', plaintext, { iterations: 10000 })
  const second = await encryptText('correct horse battery staple', plaintext, { iterations: 10000 })
  assert.notEqual(first, second)
  const envelope = JSON.parse(first)
  assert.equal(envelope.format, 'weishanhub-aes-gcm')
  assert.equal(envelope.version, 1)
  assert.equal(envelope.kdf, 'PBKDF2')
  assert.equal(envelope.iterations, 10000)
  assert.equal(await decryptText('correct horse battery staple', first), plaintext)
  await assert.rejects(() => decryptText('wrong password', first), /密码错误|损坏/)

  const tampered = { ...envelope }
  const bytes = atob(envelope.ciphertext)
  const last = String.fromCharCode(bytes.charCodeAt(bytes.length - 1) ^ 1)
  tampered.ciphertext = btoa(bytes.slice(0, -1) + last)
  await assert.rejects(() => decryptText('correct horse battery staple', JSON.stringify(tampered)), /密码错误|损坏/)
  await assert.rejects(() => decryptText('x', '{"format":"nope"}'), /格式标识|版本|算法/)
})

test('RSA-OAEP 生成并导出 PKCS#8/SPKI PEM', async () => {
  const pair = await generateRsaKeyPair({ modulusLength: 2048, hash: 'SHA-256' })
  assert.match(pair.privateKeyPem, /^-----BEGIN PRIVATE KEY-----/)
  assert.match(pair.privateKeyPem, /-----END PRIVATE KEY-----$/)
  assert.match(pair.publicKeyPem, /^-----BEGIN PUBLIC KEY-----/)
  assert.equal(pair.modulusLength, 2048)
  assert.equal(pair.publicExponent, 65537)
  await assert.rejects(() => generateRsaKeyPair({ modulusLength: 1024 }), /2048/)
})

test('BCrypt 使用 bcryptjs 真实生成与校验，并限制 cost/72 字节', async () => {
  const hash = await bcryptHash('密码123', 4)
  assert.match(hash, /^\$2[abxy]?\$04\$[./A-Za-z0-9]{53}$/)
  assert.equal(await bcryptVerify('密码123', hash), true)
  assert.equal(await bcryptVerify('错误密码', hash), false)
  assert.throws(() => normalizeBcryptCost(3), /4 至 12/)
  await assert.rejects(() => bcryptHash('a'.repeat(73), 4), /72 字节/)
})
