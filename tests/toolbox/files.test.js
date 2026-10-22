import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { PDFDocument } from 'pdf-lib'
import { calculateOutputSize, createUniqueOutputName, detectImageFormat, outputFilename } from '../../src/utils/toolbox/image.js'
import { parsePageSelection, parseRangeGroups, parseRotationPages } from '../../src/utils/toolbox/pdfRanges.js'
import {
  extractPdfPages,
  getPdfPageCount,
  mergePdfDocuments,
  reorderPdfPages,
  rotatePdfPages,
  splitPdfGroups
} from '../../src/utils/toolbox/pdfPages.js'
import { extractSignatureEntries, inspectPdfSignatures } from '../../src/utils/toolbox/pdfSignatureCore.js'
import {
  normalizeHeaders,
  normalizeHeadersWithMeta,
  normalizeJsonTable,
  parseCsvText,
  rowsToObjects,
  serializeCsv,
  tableFromWorksheet
} from '../../src/utils/toolbox/spreadsheet.js'

test('页码范围支持列表、范围、去重、越界与倒序校验', () => {
  const selection = parsePageSelection('1,3-5', 10)
  assert.deepEqual(selection.pages, [1, 3, 4, 5])
  assert.equal(selection.warnings.length, 0)
  const duplicate = parsePageSelection('1,3,3,2', 5)
  assert.deepEqual(duplicate.pages, [1, 3, 2])
  assert.equal(duplicate.warnings.length, 1)
  assert.throws(() => parsePageSelection('5-3', 10), /起点不能大于终点/)
  assert.throws(() => parsePageSelection('0,2', 10), /从 1 开始|超出/)
  assert.throws(() => parsePageSelection('11', 10), /超出/)
  assert.throws(() => parsePageSelection('1,,2', 10), /空项/)
  assert.deepEqual(parsePageSelection('3,1-2', 3, { requireAll: true }).pages, [3, 1, 2])
  assert.throws(() => parsePageSelection('3,1', 3, { requireAll: true }), /缺少：2/)
  assert.deepEqual(parseRotationPages('', 3).pages, [1, 2, 3])
})

test('拆分区间组不允许跨组重复页', () => {
  const groups = parseRangeGroups('1-2;3-4', 4)
  assert.deepEqual(
    groups.map((group) => group.pages),
    [
      [1, 2],
      [3, 4]
    ]
  )
  assert.throws(() => parseRangeGroups('1-2;2-3', 4), /重复页/)
  assert.throws(() => parseRangeGroups('1-5;6', 4), /超出/)
})

test('图片尺寸按保持比例边界缩放，不静默裁切', () => {
  assert.deepEqual(calculateOutputSize(1000, 500, { width: 500, height: 500, keepRatio: true }), {
    width: 500,
    height: 250
  })
  assert.deepEqual(calculateOutputSize(1000, 500, { width: 250, keepRatio: true }), { width: 250, height: 125 })
  assert.deepEqual(calculateOutputSize(1000, 500, { width: 500, height: 500, keepRatio: false }), {
    width: 500,
    height: 500
  })
  assert.deepEqual(calculateOutputSize(1000, 500), { width: 1000, height: 500 })
  assert.throws(() => calculateOutputSize(20000, 20000), /超过/)
  assert.throws(() => calculateOutputSize(1000, 500, { width: 13000 }), /不能超过|输出尺寸/)
  assert.equal(outputFilename('测试.jpg', 'webp'), '测试.webp')
  assert.equal(detectImageFormat(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), 'png')
  assert.equal(detectImageFormat(new Uint8Array([0xff, 0xd8, 0xff, 0xe0])), 'jpeg')
  assert.equal(
    detectImageFormat(new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50])),
    'webp'
  )
  assert.equal(detectImageFormat(new Uint8Array([1, 2, 3])), '')
})

test('图片输出名在批处理内确定唯一，避免同名不同扩展名覆盖', () => {
  const used = new Set()
  assert.equal(createUniqueOutputName('a.png', 'webp', used), 'a.webp')
  assert.equal(createUniqueOutputName('a.jpg', 'webp', used), 'a_2.webp')
  assert.equal(createUniqueOutputName('a.webp', 'webp', used), 'a_3.webp')
  assert.equal(createUniqueOutputName('a_2.png', 'webp', used), 'a_2_2.webp')
  assert.deepEqual([...used], ['a.webp', 'a_2.webp', 'a_3.webp', 'a_2_2.webp'])
})

test('CSV 保留 BOM、引号、逗号、换行、前导 0 与公式文本', () => {
  const csv = '\ufeff姓名,编号,备注\r\n张三,000123,"包含,逗号"\r\n李四,001,"多行\n内容"\r\n王五,002,"他说""你好"""\r\n'
  const table = parseCsvText(csv, { hasHeader: true })
  assert.deepEqual(table.headers, ['姓名', '编号', '备注'])
  assert.equal(table.rows[0][1], '000123')
  assert.equal(table.rows[1][2], '多行\n内容')
  assert.equal(table.rows[2][2], '他说"你好"')
  const formula = parseCsvText('name,value\nA,=SUM(B1:B2)\n', { hasHeader: true })
  assert.equal(formula.rows[0][1], '=SUM(B1:B2)')
  const output = serializeCsv(table.headers, table.rows)
  const roundtrip = parseCsvText(output, { hasHeader: true })
  assert.deepEqual(roundtrip.rows, table.rows)
})

test('重复与空表头确定性重命名，CSV/XLSX/二维 JSON 不丢列', () => {
  assert.deepEqual(normalizeHeaders(['name', 'name'], 2), ['name', 'name_2'])
  assert.deepEqual(normalizeHeadersWithMeta(['name', 'name', 'name_2', ''], 4).headers, [
    'name',
    'name_3',
    'name_2',
    '列4'
  ])
  assert.deepEqual(normalizeHeadersWithMeta(['', '列1'], 2).headers, ['列1', '列1_2'])
  assert.deepEqual(rowsToObjects(['', '列1'], [['first', 'second']]), [{ 列1: 'first', 列1_2: 'second' }])
  assert.deepEqual(rowsToObjects(['name', 'name'], [['first', 'second']]), [{ name: 'first', name_2: 'second' }])
  assert.equal(serializeCsv(['name', 'name'], [['first', 'second']]), 'name,name_2\r\nfirst,second')

  const csv = parseCsvText('name,name\nfirst,second', { hasHeader: true })
  assert.deepEqual(csv.headers, ['name', 'name_2'])
  assert.deepEqual(csv.rows, [['first', 'second']])
  assert.equal(csv.headerRenames.length, 1)
  assert.deepEqual(rowsToObjects(csv.headers, csv.rows), [{ name: 'first', name_2: 'second' }])

  const sheet = tableFromWorksheet(
    [
      ['name', 'name'],
      ['first', 'second']
    ],
    { hasHeader: true }
  )
  assert.deepEqual(sheet.headers, ['name', 'name_2'])
  assert.deepEqual(sheet.rows, [['first', 'second']])
  assert.equal(sheet.headers.length, 2)

  const json = normalizeJsonTable(
    [
      ['name', 'name'],
      ['first', 'second']
    ],
    { hasHeader: true }
  )
  assert.deepEqual(json.headers, ['name', 'name_2'])
  assert.deepEqual(json.rows, [['first', 'second']])
  assert.equal(json.headerRenames.length, 1)

  const noHeader = tableFromWorksheet(
    [
      ['first', 'second'],
      ['third', 'fourth']
    ],
    { hasHeader: false }
  )
  assert.deepEqual(noHeader.headers, ['列1', '列2'])
  assert.equal(noHeader.rows[0].length, 2)
  assert.deepEqual(noHeader.rows[0], ['first', 'second'])
})

test('JSON 对象数组/二维数组归一化，拒绝未知形状', () => {
  const objects = normalizeJsonTable([{ name: '张三', id: '0001' }, { name: '李四', age: 20 }])
  assert.deepEqual(objects.headers, ['name', 'id', 'age'])
  assert.deepEqual(objects.rows[0], ['张三', '0001', ''])
  assert.deepEqual(rowsToObjects(objects.headers, objects.rows)[0], { name: '张三', id: '0001', age: '' })
  const matrix = normalizeJsonTable(
    [
      ['name', 'id'],
      ['张三', '0001']
    ],
    { hasHeader: true }
  )
  assert.deepEqual(matrix.headers, ['name', 'id'])
  assert.deepEqual(matrix.rows, [['张三', '0001']])
  assert.throws(() => normalizeJsonTable({ name: '张三' }), /对象数组或二维数组/)
  assert.throws(() => normalizeJsonTable([{ a: 1 }, ['b']]), /不能混用/)
  assert.throws(() => normalizeJsonTable(['a']), /不能混用|标量/)
})

test('pdf-lib 真实读取页数、提取、合并、拆分、旋转与重排', async () => {
  const source = await PDFDocument.create()
  source.addPage([200, 300])
  source.addPage([300, 200])
  source.addPage([400, 400])
  const sourceBytes = await source.save()
  assert.equal(await getPdfPageCount(sourceBytes), 3)

  const extracted = await PDFDocument.load(await extractPdfPages(sourceBytes, [3, 1]))
  assert.equal(extracted.getPageCount(), 2)
  assert.deepEqual(extracted.getPage(0).getSize(), { width: 400, height: 400 })
  assert.deepEqual(extracted.getPage(1).getSize(), { width: 200, height: 300 })

  const rotated = await PDFDocument.load(await rotatePdfPages(sourceBytes, [2], 90))
  assert.equal(rotated.getPage(1).getRotation().angle, 90)
  assert.equal(rotated.getPage(0).getRotation().angle, 0)

  const reordered = await PDFDocument.load(await reorderPdfPages(sourceBytes, [3, 1, 2]))
  assert.deepEqual(reordered.getPage(0).getSize(), { width: 400, height: 400 })
  assert.deepEqual(reordered.getPage(1).getSize(), { width: 200, height: 300 })

  const second = await PDFDocument.create()
  second.addPage([100, 100])
  const merged = await PDFDocument.load(await mergePdfDocuments([{ bytes: sourceBytes }, { bytes: await second.save() }]))
  assert.equal(merged.getPageCount(), 4)

  const groups = await splitPdfGroups(sourceBytes, [{ pages: [1, 2] }, { pages: [3] }])
  assert.equal(groups.length, 2)
  assert.equal((await PDFDocument.load(groups[0].bytes)).getPageCount(), 2)
  assert.equal((await PDFDocument.load(groups[1].bytes)).getPageCount(), 1)
})

function rangeSample({ start = 0, extraGap = '', contents = '3003020101', append = '', contentsKey = true } = {}) {
  const zeros = '0'.repeat(10)
  const placeholder = `[${zeros} ${zeros} ${zeros} ${zeros}]`
  const contentsToken = contentsKey ? `/Contents <${contents}>` : `<${contents}>`
  let body = `%PDF-1.4\n1 0 obj\n<< /Type /Sig\n/ByteRange ${placeholder}${extraGap}${contentsToken}\n>>\nendobj\n%%EOF`
  const b = body.indexOf(']') + 1
  const c = body.indexOf('>', body.indexOf('<', body.indexOf(']'))) + 1
  const d = body.length - c
  const range = `[${String(start).padStart(10, '0')} ${String(b).padStart(10, '0')} ${String(c).padStart(10, '0')} ${String(d).padStart(10, '0')}]`
  body = body.replace(placeholder, range)
  return new TextEncoder().encode(body + append)
}

test('ByteRange 必须从 0 开始、间隔仅 Contents，并报告是否覆盖当前文件末尾', () => {
  const normal = extractSignatureEntries(rangeSample())[0]
  assert.equal(normal.byteRange[0], 0)
  assert.equal(normal.coveredLength, normal.byteRange[2] + normal.byteRange[3])
  assert.equal(normal.documentLength, normal.coveredLength)
  assert.equal(normal.coversWholeDocument, true)
  assert.equal(extractSignatureEntries(rangeSample({ contentsKey: false }))[0].coversWholeDocument, true)

  const appended = extractSignatureEntries(rangeSample({ append: '\n% unsigned appended content\n' }))[0]
  assert.equal(appended.coversWholeDocument, false)
  assert.equal(appended.coverageStatus, 'partial-or-historical')
  assert.ok(appended.uncoveredBytes > 0)
  assert.ok(appended.coveredLength < appended.documentLength)

  assert.throws(() => extractSignatureEntries(rangeSample({ start: 1 })), /从 0 开始|隐藏前缀/)
  assert.throws(() => extractSignatureEntries(rangeSample({ extraGap: ' /Foo 1 0 R ' })), /间隔|复杂范围/)
  assert.throws(() => extractSignatureEntries(rangeSample({ extraGap: ' /Foo <00> ' })), /间隔|复杂范围/)
})

test('无签名 PDF 不会显示成功，坏 PDF 明确失败', async () => {
  const document = await PDFDocument.create()
  document.addPage([100, 100])
  const bytes = await document.save()
  const result = await inspectPdfSignatures(bytes)
  assert.equal(result.isPdf, true)
  assert.equal(result.hasSignature, false)
  assert.equal(result.unsigned, true)
  assert.equal(result.signatureCount, 0)
  assert.equal(result.pageCount, 1)
  assert.equal(result.signatures.length, 0)
  assert.equal(result.verified, undefined)
  await assert.rejects(() => inspectPdfSignatures(new Uint8Array([1, 2, 3, 4, 5])), /PDF 结构损坏|无法解析/)
})

const signedFixture = new URL('./fixtures/signed.pdf', import.meta.url)
const tamperedFixture = new URL('./fixtures/tampered.pdf', import.meta.url)

test('Codex 真实签名 fixture：摘要/公钥签名通过但证书信任未验证', async () => {
  const bytes = new Uint8Array(readFileSync(signedFixture))
  const result = await inspectPdfSignatures(bytes)
  assert.equal(result.hasSignature, true)
  assert.ok(result.signatureCount >= 1)
  const first = result.signatures[0]
  assert.equal(first.supported, true)
  assert.equal(first.integrity, true)
  assert.equal(first.signatureValid, true)
  assert.equal(first.certificateTrust, 'not-verified')
  assert.ok(first.certificate?.subject)
  assert.ok(first.certificate?.issuer)
  assert.equal(first.coversWholeDocument, true)
  assert.equal(result.currentDocumentVerified, true)
  assert.equal(result.currentDocumentIntegrity, true)
  assert.equal(result.hasUncoveredContent, false)
  assert.equal(result.verified, true)
  assert.equal(result.integrity, true)
})

test('Codex 真实签名 fixture 尾部追加内容：签名数学上仍有效但当前全文未完整覆盖', async () => {
  const original = readFileSync(signedFixture)
  const appended = Buffer.concat([original, Buffer.from('\n% unsigned appended content\n')])
  const result = await inspectPdfSignatures(appended)
  assert.equal(result.hasSignature, true)
  const first = result.signatures[0]
  assert.equal(first.verified, true)
  assert.equal(first.integrity, true)
  assert.equal(first.coversWholeDocument, false)
  assert.ok(first.uncoveredBytes > 0)
  assert.equal(result.currentDocumentVerified, false)
  assert.equal(result.verified, false)
  assert.equal(result.integrity, false)
  assert.equal(result.hasUncoveredContent, true)
  assert.ok(result.warnings.some((warning) => /未覆盖当前文件末尾|未覆盖内容/.test(warning)))
})

test('Codex 真实篡改 fixture：不得报告摘要一致', async () => {
  const bytes = new Uint8Array(readFileSync(tamperedFixture))
  const result = await inspectPdfSignatures(bytes)
  assert.equal(result.hasSignature, true)
  assert.equal(result.integrity, false)
  assert.equal(result.verified, false)
  assert.equal(result.currentDocumentVerified, false)
})
