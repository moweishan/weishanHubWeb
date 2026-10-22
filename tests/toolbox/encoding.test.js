import test from 'node:test'
import assert from 'node:assert/strict'
import {
  base64ToUtf8,
  binaryToText,
  buildBasicAuth,
  convertBase,
  decodeHtmlEntities,
  decodeUrl,
  encodeHtmlEntities,
  encodeUrl,
  fromRoman,
  natoToText,
  parseBasicAuth,
  processList,
  textToBinary,
  textToNato,
  textToUnicode,
  toRoman,
  unicodeToText,
  utf8ToBase64,
  convertCase,
  slugify
} from '../../src/utils/toolbox/encoding.js'

test('UTF-8 Base64 对中文、emoji 与 NUL 正确往返', () => {
  const text = '你好，weishanHub 👋🏽\u0000end'
  const encoded = utf8ToBase64(text)
  assert.equal(base64ToUtf8(encoded), text)
  assert.throws(() => base64ToUtf8('%%%'), /Base64/)
  assert.throws(() => base64ToUtf8('/w=='), /UTF-8/)
})

test('BigInt 进制转换不丢失 2^53 以上整数', () => {
  assert.equal(convertBase('9007199254740993', 10, 16), '20000000000001')
  assert.equal(convertBase('-255', 10, 16), '-FF')
  const value = '1234567890123456789012345678901234567890'
  const base36 = convertBase(value, 10, 36)
  assert.equal(convertBase(base36, 36, 10), value)
  assert.equal(convertBase('0b1010', 2, 10), '10')
  assert.throws(() => convertBase('2', 2, 10), /不是 2 进制/)
  assert.throws(() => convertBase('10', 1, 10), /源进制/)
})

test('罗马数字范围与规范写法校验', () => {
  assert.equal(toRoman('2024'), 'MMXXIV')
  assert.equal(fromRoman('mmxxiv'), 2024)
  assert.equal(toRoman(3999), 'MMMCMXCIX')
  assert.throws(() => toRoman(0), /1 至 3999/)
  assert.throws(() => toRoman(4000), /1 至 3999/)
  assert.throws(() => fromRoman('IIII'), /规范|格式/)
  assert.throws(() => fromRoman('IC'), /规范|格式/)
})

test('文本与 UTF-8 二进制往返，并校验位数', () => {
  const text = 'A你👋'
  const binary = textToBinary(text, ' ')
  assert.equal(binaryToText(binary), text)
  assert.equal(binaryToText(binary.replace(/ /g, '')), text)
  assert.throws(() => binaryToText('101'), /8 的倍数/)
  assert.throws(() => binaryToText('11111111'), /UTF-8/)
})

test('Unicode 四种样式均可无分隔符往返', () => {
  const text = 'A😀你'
  for (const style of ['code-point', 'js', 'utf16', 'html']) {
    const encoded = textToUnicode(text, style)
    assert.equal(unicodeToText(encoded), text, `样式 ${style} 往返失败`)
  }
  assert.equal(unicodeToText('&#20320;&#x597D;'), '你好')
  assert.throws(() => unicodeToText('U+110000'), /无效/)
})

test('HTML 实体编解码覆盖特殊字符、非 ASCII 与数字实体', () => {
  const text = '<a href="x">你好 & 😀</a>'
  const encoded = encodeHtmlEntities(text, 'non-ascii')
  assert.ok(encoded.includes('&amp;'))
  assert.equal(decodeHtmlEntities(encoded), text)
  assert.equal(decodeHtmlEntities('&#x1F44B; &#20320; &unknown;'), '👋 你 &unknown;')
})

test('HTML 实体使用完整 he 表，支持命名、复合码点、大小写十六进制与非法码点', () => {
  assert.equal(decodeHtmlEntities('&eacute;'), 'é')
  assert.equal(decodeHtmlEntities('&CounterClockwiseContourIntegral;'), '\u2233')
  assert.equal(decodeHtmlEntities('&#X1F60A; &#x1F60A; &#128512;'), '😊 😊 😀')
  assert.equal(decodeHtmlEntities('&#x110000;'), '\uFFFD')
  assert.equal(decodeHtmlEntities('&lt;script&gt;alert(1)&lt;/script&gt;'), '<script>alert(1)</script>')
  const sample = 'café & 😊'
  for (const mode of ['basic', 'non-ascii', 'all']) {
    assert.equal(decodeHtmlEntities(encodeHtmlEntities(sample, mode)), sample, `模式 ${mode} 往返失败`)
  }
  assert.equal(encodeHtmlEntities('é', 'basic'), 'é')
  assert.notEqual(encodeHtmlEntities('é', 'non-ascii'), 'é')
})

test('URL 编码区分完整 URL 与参数值', () => {
  assert.equal(encodeUrl('a b&c', 'component'), 'a%20b%26c')
  assert.equal(encodeUrl('https://a.com/x y?q=1&z=2', 'full'), 'https://a.com/x%20y?q=1&z=2')
  assert.equal(decodeUrl('a%20b%26c'), 'a b&c')
  assert.throws(() => decodeUrl('%E0%A4%A'), /解码失败/)
})

test('NATO 音标词双向转换与 NATO 拼写', () => {
  assert.equal(textToNato('Hi 1'), 'Hotel India (space) One')
  assert.equal(natoToText('Hotel India (space) One'), 'HI 1')
  assert.equal(natoToText('Alfa'), 'A')
  assert.equal(natoToText('X-ray'), 'X')
  assert.throws(() => natoToText('NotAWord'), /无法识别/)
})

test('命名转换与 slug', () => {
  assert.equal(convertCase('user profile name', 'camel'), 'userProfileName')
  assert.equal(convertCase('userProfileName', 'snake'), 'user_profile_name')
  assert.equal(convertCase('HTTP server', 'kebab'), 'http-server')
  assert.equal(convertCase('user profile', 'constant'), 'USER_PROFILE')
  assert.equal(slugify('Hello World 你好！'), 'hello-world')
  assert.equal(slugify('Hello World 你好！', { keepUnicode: true }), 'hello-world-你好')
  assert.equal(slugify('A B', { separator: '_', lowercase: false }), 'A_B')
})

test('列表整理支持去重、排序、前后缀、编号与分隔符', () => {
  const result = processList(' b \na\na\nb\n', {
    sort: 'asc',
    dedupe: true,
    prefix: '[',
    suffix: ']',
    numbering: 'number',
    separator: ', '
  })
  assert.equal(result, '1. [a], 2. [b]')
  assert.equal(processList('a\nb', { sort: 'desc', numbering: 'dash' }), '- b\n- a')
})

test('Basic Auth 使用 UTF-8 并可还原', () => {
  const header = buildBasicAuth('用户', '密 码:123')
  assert.match(header, /^Basic /)
  const parsed = parseBasicAuth(header)
  assert.deepEqual(parsed, { username: '用户', password: '密 码:123' })
  assert.throws(() => parseBasicAuth('Basic bm9jb2xvbg=='), /冒号/)
})
