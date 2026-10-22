/**
 * 浏览器本地 PDF 签名结构与密码学校验核心。
 *
 * 只做 PKCS#7/CMS 的摘要与签名验证，不建立系统根证书信任，不访问 OCSP/CRL。
 * 因此结果只表示“签名字节与证书内公钥匹配、PDF 字节摘要一致”，
 * 不代表证书由受信 CA 签发，也不构成法律有效性结论。
 */

import { PDFDocument } from 'pdf-lib'
import { getSubtle } from './webcrypto.js'

const OIDS = {
  signedData: '1.2.840.113549.1.7.2',
  data: '1.2.840.113549.1.7.1',
  messageDigest: '1.2.840.113549.1.9.4',
  contentType: '1.2.840.113549.1.9.3',
  signingTime: '1.2.840.113549.1.9.5',
  sha1: '1.3.14.3.2.26',
  sha256: '2.16.840.1.101.3.4.2.1',
  sha384: '2.16.840.1.101.3.4.2.2',
  sha512: '2.16.840.1.101.3.4.2.3',
  rsaEncryption: '1.2.840.113549.1.1.1',
  sha1WithRsa: '1.2.840.113549.1.1.5',
  sha256WithRsa: '1.2.840.113549.1.1.11',
  sha384WithRsa: '1.2.840.113549.1.1.12',
  sha512WithRsa: '1.2.840.113549.1.1.13',
  sha224WithRsa: '1.2.840.113549.1.1.14',
  rsaPss: '1.2.840.113549.1.1.10',
  ecdsaSha1: '1.2.840.10045.4.1',
  ecdsaSha256: '1.2.840.10045.4.3.2',
  ecdsaSha384: '1.2.840.10045.4.3.3',
  ecdsaSha512: '1.2.840.10045.4.3.4'
}

const OID_NAMES = {
  '2.5.4.3': 'CN',
  '2.5.4.4': 'SN',
  '2.5.4.5': 'serialNumber',
  '2.5.4.6': 'C',
  '2.5.4.7': 'L',
  '2.5.4.8': 'ST',
  '2.5.4.9': 'street',
  '2.5.4.10': 'O',
  '2.5.4.11': 'OU',
  '2.5.4.12': 'title',
  '2.5.4.42': 'G',
  '1.2.840.113549.1.9.1': 'emailAddress'
}

const HASH_NAMES = {
  [OIDS.sha1]: 'SHA-1',
  [OIDS.sha256]: 'SHA-256',
  [OIDS.sha384]: 'SHA-384',
  [OIDS.sha512]: 'SHA-512'
}

const RSA_SIGNATURE_HASH = {
  [OIDS.rsaEncryption]: null,
  [OIDS.sha1WithRsa]: 'SHA-1',
  [OIDS.sha256WithRsa]: 'SHA-256',
  [OIDS.sha384WithRsa]: 'SHA-384',
  [OIDS.sha512WithRsa]: 'SHA-512'
}

export class PdfSignatureError extends Error {
  constructor(message, code = 'PDF_SIGNATURE_ERROR') {
    super(message)
    this.name = 'PdfSignatureError'
    this.code = code
  }
}

function toUint8(input) {
  if (input instanceof Uint8Array) return input
  if (input instanceof ArrayBuffer) return new Uint8Array(input)
  if (ArrayBuffer.isView(input)) return new Uint8Array(input.buffer, input.byteOffset, input.byteLength)
  throw new PdfSignatureError('PDF 数据格式无效', 'INVALID_INPUT')
}

function binaryString(bytes) {
  let result = ''
  const chunk = 0x8000
  for (let index = 0; index < bytes.length; index += chunk) {
    result += String.fromCharCode(...bytes.subarray(index, index + chunk))
  }
  return result
}

function bytesToHex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function hexToBytes(hex) {
  const text = String(hex).replace(/\s+/g, '')
  if (!text || text.length % 2 !== 0 || !/^[0-9a-fA-F]+$/.test(text)) {
    throw new PdfSignatureError('PDF 签名字节不是合法的十六进制数据', 'INVALID_SIGNATURE_HEX')
  }
  const bytes = new Uint8Array(text.length / 2)
  for (let index = 0; index < bytes.length; index++) {
    bytes[index] = Number.parseInt(text.slice(index * 2, index * 2 + 2), 16)
  }
  return bytes
}

function bytesEqual(left, right) {
  if (left.length !== right.length) return false
  for (let index = 0; index < left.length; index++) if (left[index] !== right[index]) return false
  return true
}

function concatBytes(...parts) {
  const length = parts.reduce((total, part) => total + part.length, 0)
  const output = new Uint8Array(length)
  let offset = 0
  for (const part of parts) {
    output.set(part, offset)
    offset += part.length
  }
  return output
}

function base64(bytes) {
  let binary = ''
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000))
  }
  return btoa(binary)
}

function readTlv(bytes, offset, limit = bytes.length) {
  const start = offset
  if (start >= limit) throw new PdfSignatureError('ASN.1 数据提前结束', 'ASN1_TRUNCATED')
  const tag = bytes[offset++]
  if (offset >= limit) throw new PdfSignatureError('ASN.1 数据缺少长度', 'ASN1_TRUNCATED')
  const first = bytes[offset++]
  if (first === 0x80) throw new PdfSignatureError('不支持无界长度 ASN.1', 'ASN1_UNSUPPORTED')
  let length = first
  if (first & 0x80) {
    const count = first & 0x7f
    if (count === 0 || count > 4) throw new PdfSignatureError('ASN.1 长度字段不受支持', 'ASN1_UNSUPPORTED')
    length = 0
    for (let index = 0; index < count; index++) {
      if (offset >= limit) throw new PdfSignatureError('ASN.1 长度字段截断', 'ASN1_TRUNCATED')
      length = length * 256 + bytes[offset++]
    }
  }
  const valueStart = offset
  const valueEnd = valueStart + length
  if (valueEnd > limit) throw new PdfSignatureError('ASN.1 内容超出边界', 'ASN1_TRUNCATED')
  return { bytes, tag, start, valueStart, valueEnd, end: valueEnd }
}

function children(node) {
  const list = []
  let offset = node.valueStart
  while (offset < node.valueEnd) {
    const child = readTlv(node.bytes, offset, node.valueEnd)
    list.push(child)
    offset = child.end
  }
  if (offset !== node.valueEnd) throw new PdfSignatureError('ASN.1 子结构长度不一致', 'ASN1_INVALID')
  return list
}

function nodeRaw(node) {
  return node.bytes.subarray(node.start, node.valueEnd)
}

function nodeValue(node) {
  return node.bytes.subarray(node.valueStart, node.valueEnd)
}

function decodeOid(node) {
  const value = nodeValue(node)
  if (!value.length) throw new PdfSignatureError('ASN.1 OID 为空', 'ASN1_INVALID')
  const first = value[0]
  const arcs = first < 80 ? [Math.floor(first / 40), first % 40] : [2, first - 80]
  let current = 0
  for (let index = 1; index < value.length; index++) {
    const byte = value[index]
    current = current * 128 + (byte & 0x7f)
    if (!(byte & 0x80)) {
      arcs.push(current)
      current = 0
    }
  }
  return arcs.join('.')
}

function integerHex(node) {
  return bytesToHex(nodeValue(node)).replace(/^00+/, '') || '0'
}

function decodeString(node) {
  const value = nodeValue(node)
  if (node.tag === 0x1e) {
    let text = ''
    for (let index = 0; index + 1 < value.length; index += 2) {
      text += String.fromCharCode((value[index] << 8) | value[index + 1])
    }
    return text
  }
  if (node.tag === 0x0c) return new TextDecoder('utf-8', { fatal: false }).decode(value)
  return binaryString(value)
}

function parseTime(node) {
  const text = binaryString(nodeValue(node)).trim()
  let match = /^(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})Z$/.exec(text)
  if (match) {
    let year = Number(match[1])
    year += year >= 50 ? 1900 : 2000
    return new Date(
      Date.UTC(year, Number(match[2]) - 1, Number(match[3]), Number(match[4]), Number(match[5]), Number(match[6]))
    )
  }
  match = /^(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})Z$/.exec(text)
  if (match) {
    let year = Number(match[1])
    year += year >= 50 ? 1900 : 2000
    return new Date(Date.UTC(year, Number(match[2]) - 1, Number(match[3]), Number(match[4]), Number(match[5]), 0))
  }
  match = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})Z$/.exec(text)
  if (match) {
    return new Date(
      Date.UTC(
        Number(match[1]),
        Number(match[2]) - 1,
        Number(match[3]),
        Number(match[4]),
        Number(match[5]),
        Number(match[6])
      )
    )
  }
  throw new PdfSignatureError(`证书时间格式不受支持：${text}`, 'CERTIFICATE_TIME')
}

function parseName(node) {
  const parts = []
  for (const set of children(node)) {
    for (const item of children(set)) {
      const values = children(item)
      if (values.length < 2) continue
      const oid = decodeOid(values[0])
      const name = OID_NAMES[oid] || oid
      parts.push(`${name}=${decodeString(values[1])}`)
    }
  }
  return {
    text: parts.join(', '),
    parts,
    raw: nodeRaw(node)
  }
}

function parseAlgorithm(node) {
  const values = children(node)
  if (!values.length) throw new PdfSignatureError('算法标识为空', 'ASN1_INVALID')
  return {
    oid: decodeOid(values[0]),
    parameters: values[1] || null
  }
}

function parseCertificate(node) {
  try {
    const root = children(node)
    if (root.length < 3) throw new PdfSignatureError('证书结构不完整', 'CERTIFICATE_INVALID')
    const tbs = children(root[0])
    let index = 0
    if (tbs[index]?.tag === 0xa0) index++
    const serialNode = tbs[index++]
    const signatureAlgorithmNode = tbs[index++]
    const issuerNode = tbs[index++]
    const validityNode = tbs[index++]
    const subjectNode = tbs[index++]
    const spkiNode = tbs[index++]
    if (!serialNode || !issuerNode || !validityNode || !subjectNode || !spkiNode) {
      throw new PdfSignatureError('证书字段缺失', 'CERTIFICATE_INVALID')
    }
    const validity = children(validityNode)
    const notBefore = parseTime(validity[0])
    const notAfter = parseTime(validity[1])
    const issuer = parseName(issuerNode)
    const subject = parseName(subjectNode)
    const spkiChildren = children(spkiNode)
    const publicKeyAlgorithm = parseAlgorithm(spkiChildren[0])
    const certificateBytes = nodeRaw(node)
    return {
      serialNumber: integerHex(serialNode),
      signatureAlgorithm: parseAlgorithm(signatureAlgorithmNode).oid,
      issuer,
      subject,
      notBefore,
      notAfter,
      spki: nodeRaw(spkiNode),
      publicKeyAlgorithm: publicKeyAlgorithm.oid,
      pem: `-----BEGIN CERTIFICATE-----\n${base64(certificateBytes).match(/.{1,64}/g).join('\n')}\n-----END CERTIFICATE-----`,
      selfSigned: bytesEqual(issuer.raw, subject.raw)
    }
  } catch (error) {
    if (error instanceof PdfSignatureError) throw error
    throw new PdfSignatureError(`证书解析失败：${error.message}`, 'CERTIFICATE_INVALID')
  }
}

function parseAttributes(node) {
  const map = new Map()
  for (const attribute of children(node)) {
    const values = children(attribute)
    if (values.length < 2) continue
    const oid = decodeOid(values[0])
    const setValues = children(values[1])
    map.set(oid, setValues)
  }
  return map
}

function parseCms(cmsBytes) {
  const contentInfo = readTlv(cmsBytes, 0, cmsBytes.length)
  const contentInfoChildren = children(contentInfo)
  if (contentInfoChildren.length < 2) throw new PdfSignatureError('CMS ContentInfo 结构不完整', 'CMS_INVALID')
  if (decodeOid(contentInfoChildren[0]) !== OIDS.signedData) {
    throw new PdfSignatureError('CMS 不是 SignedData 类型', 'CMS_UNSUPPORTED')
  }
  const signedData = readTlv(cmsBytes, contentInfoChildren[1].valueStart, contentInfoChildren[1].valueEnd)
  const signedChildren = children(signedData)
  const certificatesNode = signedChildren.find((node) => node.tag === 0xa0)
  const signerInfosNode = [...signedChildren].reverse().find((node) => node.tag === 0x31)
  if (!signerInfosNode) throw new PdfSignatureError('CMS 缺少 SignerInfo', 'CMS_INVALID')
  const certificates = certificatesNode
    ? children(certificatesNode)
        .filter((node) => node.tag === 0x30)
        .map((node) => parseCertificate(node))
    : []
  const signers = children(signerInfosNode)
    .filter((node) => node.tag === 0x30)
    .map((node) => parseSigner(node))
  if (!signers.length) throw new PdfSignatureError('CMS 中没有签名者', 'CMS_INVALID')
  return { certificates, signers }
}

function parseSigner(node) {
  const values = children(node)
  let index = 0
  index++ // version
  const sid = values[index++]
  const digestAlgorithm = parseAlgorithm(values[index++])
  let signedAttributes = null
  if (values[index]?.tag === 0xa0) signedAttributes = values[index++]
  const signatureAlgorithm = parseAlgorithm(values[index++])
  const signatureNode = values[index++]
  if (!signatureNode || signatureNode.tag !== 0x04) {
    throw new PdfSignatureError('CMS 签名值缺失', 'CMS_INVALID')
  }
  const attrs = signedAttributes ? parseAttributes(signedAttributes) : null
  const messageDigestNode = attrs?.get(OIDS.messageDigest)?.[0] || null
  const messageDigest = messageDigestNode ? nodeValue(messageDigestNode) : null
  const signedAttributesSet = signedAttributes ? new Uint8Array(nodeRaw(signedAttributes)) : null
  if (signedAttributesSet) signedAttributesSet[0] = 0x31
  return {
    sid,
    digestAlgorithmOid: digestAlgorithm.oid,
    signatureAlgorithmOid: signatureAlgorithm.oid,
    signature: nodeValue(signatureNode),
    messageDigest,
    signedAttributesSet,
    attributes: attrs
  }
}

function findCertificate(signer, certificates) {
  if (signer.sid?.tag === 0x30) {
    const sidValues = children(signer.sid)
    if (sidValues.length >= 2) {
      const issuer = parseName(sidValues[0])
      const serial = integerHex(sidValues[1])
      const found = certificates.find(
        (certificate) => certificate.serialNumber === serial && bytesEqual(certificate.issuer.raw, issuer.raw)
      )
      if (found) return found
    }
  }
  return certificates[0] || null
}

function hashFromOid(oid) {
  const name = HASH_NAMES[oid]
  if (!name) throw new PdfSignatureError(`不支持的摘要算法：${oid}`, 'UNSUPPORTED_DIGEST')
  return name
}

function signatureHash(oid, digestHash) {
  if (oid in RSA_SIGNATURE_HASH) return { kind: 'RSA', hash: RSA_SIGNATURE_HASH[oid] || digestHash }
  if (oid === OIDS.rsaPss) throw new PdfSignatureError('暂不支持 RSASSA-PSS 签名算法', 'UNSUPPORTED_SIGNATURE')
  if ([OIDS.ecdsaSha1, OIDS.ecdsaSha256, OIDS.ecdsaSha384, OIDS.ecdsaSha512].includes(oid)) {
    throw new PdfSignatureError('暂不支持 ECDSA 签名算法', 'UNSUPPORTED_SIGNATURE')
  }
  throw new PdfSignatureError(`不支持的签名算法：${oid}`, 'UNSUPPORTED_SIGNATURE')
}

function formatCertificate(certificate) {
  if (!certificate) return null
  return {
    subject: certificate.subject.text,
    issuer: certificate.issuer.text,
    serialNumber: certificate.serialNumber,
    notBefore: certificate.notBefore.toISOString(),
    notAfter: certificate.notAfter.toISOString(),
    expired: Date.now() < certificate.notBefore.getTime() || Date.now() > certificate.notAfter.getTime(),
    selfSigned: certificate.selfSigned,
    pem: certificate.pem
  }
}

async function verifySigner(entry, signer, certificates) {
  const certificate = findCertificate(signer, certificates)
  if (!certificate) throw new PdfSignatureError('未找到签名证书', 'CERTIFICATE_MISSING')
  const digestHash = hashFromOid(signer.digestAlgorithmOid)
  const signature = signatureHash(signer.signatureAlgorithmOid, digestHash)
  if (signature.kind !== 'RSA') throw new PdfSignatureError('暂不支持该签名算法', 'UNSUPPORTED_SIGNATURE')
  const hash = signature.hash
  const subtle = getSubtle()
  let integrity = null
  if (signer.messageDigest) {
    const digest = new Uint8Array(await subtle.digest(hash, entry.signedBytes))
    integrity = bytesEqual(digest, signer.messageDigest)
  }
  let signatureValid = false
  try {
    const key = await subtle.importKey(
      'spki',
      certificate.spki,
      { name: 'RSASSA-PKCS1-v1_5', hash },
      false,
      ['verify']
    )
    const signed = signer.signedAttributesSet || entry.signedBytes
    signatureValid = await subtle.verify(
      { name: 'RSASSA-PKCS1-v1_5' },
      key,
      signer.signature,
      signed
    )
  } catch (error) {
    throw new PdfSignatureError(`签名校验失败：${error.message}`, 'SIGNATURE_VERIFY_FAILED')
  }
  const certificateInfo = formatCertificate(certificate)
  return {
    supported: true,
    verified: integrity === true && signatureValid,
    integrity,
    signatureValid,
    digestAlgorithm: hash,
    signatureAlgorithm: 'RSA PKCS#1 v1.5',
    certificate: certificateInfo,
    certificateTrust: 'not-verified',
    certificateExpired: certificateInfo.expired,
    coveredLength: entry.coveredLength,
    documentLength: entry.documentLength,
    coversWholeDocument: entry.coversWholeDocument,
    uncoveredBytes: entry.uncoveredBytes,
    coverageStatus: entry.coverageStatus,
    coverageWarning: entry.coversWholeDocument
      ? ''
      : `仅覆盖前 ${entry.coveredLength} 字节，签名后还有 ${entry.uncoveredBytes} 字节未被该签名覆盖`,
    error: ''
  }
}

export function extractSignatureEntries(pdfBytes) {
  const text = binaryString(pdfBytes)
  if (/\/ByteRange\s*\[[^\]]*\*{5}/.test(text)) {
    throw new PdfSignatureError('检测到尚未填充的 PDF 签名字段，无法验签', 'UNSIGNED_SIGNATURE_FIELD')
  }
  const regex = /\/ByteRange\s*\[\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*\]/g
  const matches = [...text.matchAll(regex)]
  if (!matches.length) {
    if (/\/SubFilter\s*\/|\/Type\s*\/Sig\b/.test(text)) {
      throw new PdfSignatureError('检测到签名结构，但缺少完整 ByteRange，无法验签', 'BYTERANGE_MISSING')
    }
    return []
  }
  return matches.map((match, index) => {
    const [a, b, c, d] = match.slice(1).map(Number)
    if (![a, b, c, d].every(Number.isSafeInteger) || a < 0 || b < 0 || c < 0 || d < 0) {
      throw new PdfSignatureError(`第 ${index + 1} 个签名的 ByteRange 数值无效`, 'BYTERANGE_INVALID')
    }
    if (a !== 0) {
      throw new PdfSignatureError(
        `第 ${index + 1} 个签名的 ByteRange 不是从 0 开始，可能包含隐藏前缀，暂不支持`,
        'BYTERANGE_UNSUPPORTED'
      )
    }
    if (a + b > c || c + d > pdfBytes.length) {
      throw new PdfSignatureError(`第 ${index + 1} 个签名的 ByteRange 超出 PDF 范围`, 'BYTERANGE_INVALID')
    }
    const gap = text.slice(a + b, c)
    const contentsHex = extractContentsHexFromGap(gap, index)
    if (!contentsHex || contentsHex.length % 2 !== 0) {
      throw new PdfSignatureError(`第 ${index + 1} 个签名的 Contents 十六进制长度无效`, 'CONTENTS_INVALID')
    }
    let cmsBytes
    try {
      cmsBytes = hexToBytes(contentsHex)
    } catch {
      throw new PdfSignatureError(`第 ${index + 1} 个签名的 Contents 不是合法十六进制`, 'CONTENTS_INVALID')
    }
    const coveredLength = c + d
    const documentLength = pdfBytes.length
    const coversWholeDocument = coveredLength === documentLength
    const signedBytes = concatBytes(pdfBytes.subarray(a, a + b), pdfBytes.subarray(c, c + d))
    return {
      index,
      byteRange: [a, b, c, d],
      cmsBytes,
      signedBytes,
      coveredLength,
      documentLength,
      coversWholeDocument,
      uncoveredBytes: Math.max(0, documentLength - coveredLength),
      coverageStatus: coversWholeDocument ? 'whole-document' : 'partial-or-historical'
    }
  })
}

async function loadAndValidatePdf(pdfBytes) {
  try {
    return await PDFDocument.load(pdfBytes, { ignoreEncryption: false, updateMetadata: false })
  } catch (error) {
    const message = String(error?.message || error)
    if (/encrypt|password|EncryptedPDFError/i.test(message)) {
      throw new PdfSignatureError('PDF 已加密或受密码保护，本工具不绕过密码，无法验签', 'PDF_ENCRYPTED')
    }
    throw new PdfSignatureError(`PDF 结构损坏或无法解析：${message}`, 'PDF_INVALID')
  }
}

/**
 * ByteRange 间隔可能只含十六进制值、`<hex>` 或 `/Contents <hex>`。
 * 去除这些唯一允许的包装后必须全部是十六进制，不能藏其他 PDF 对象。
 */
function extractContentsHexFromGap(gap, index) {
  let value = String(gap).replace(/\s+/g, '')
  if (value.startsWith('/Contents')) value = value.slice('/Contents'.length)
  if (value.startsWith('<')) value = value.slice(1)
  if (value.endsWith('>')) value = value.slice(0, -1)
  if (!value || !/^[0-9a-fA-F]+$/.test(value)) {
    throw new PdfSignatureError(
      `第 ${index + 1} 个签名的 ByteRange 间隔不是单一 Contents 十六进制区，复杂范围暂不支持`,
      'BYTERANGE_UNSUPPORTED'
    )
  }
  return value
}

export async function inspectPdfSignatures(input) {
  const pdfBytes = toUint8(input)
  const document = await loadAndValidatePdf(pdfBytes)
  const pageCount = document.getPageCount()
  const entries = extractSignatureEntries(pdfBytes)
  if (!entries.length) {
    return {
      isPdf: true,
      pageCount,
      hasSignature: false,
      unsigned: true,
      signatureCount: 0,
      signatures: [],
      warnings: ['未发现 PDF 数字签名字段；这不等同于“签名有效”。']
    }
  }
  const signatures = []
  for (const entry of entries) {
    try {
      const cms = parseCms(entry.cmsBytes)
      if (cms.signers.length !== 1) {
        throw new PdfSignatureError(`第 ${entry.index + 1} 个签名包含多个 SignerInfo，暂不支持`, 'MULTIPLE_SIGNERS')
      }
      const result = await verifySigner(entry, cms.signers[0], cms.certificates)
      signatures.push({ index: entry.index, ...result })
    } catch (error) {
      signatures.push({
        index: entry.index,
        supported: false,
        verified: false,
        integrity: null,
        signatureValid: false,
        digestAlgorithm: '',
        signatureAlgorithm: '',
        certificate: null,
        certificateTrust: 'not-verified',
        certificateExpired: null,
        coveredLength: entry.coveredLength,
        documentLength: entry.documentLength,
        coversWholeDocument: entry.coversWholeDocument,
        uncoveredBytes: entry.uncoveredBytes,
        coverageStatus: entry.coverageStatus,
        coverageWarning: entry.coversWholeDocument
          ? ''
          : `仅覆盖前 ${entry.coveredLength} 字节，签名后还有 ${entry.uncoveredBytes} 字节未被该签名覆盖`,
        error: error instanceof PdfSignatureError ? error.message : `验签失败：${error.message}`
      })
    }
  }
  const warnings = []
  const coveringSignatures = signatures.filter((signature) => signature.coversWholeDocument === true)
  const currentDocumentVerified = coveringSignatures.some((signature) => signature.verified === true)
  const currentDocumentIntegrity = coveringSignatures.some(
    (signature) => signature.integrity === true && signature.signatureValid === true
  )
  if (signatures.some((signature) => signature.certificate?.selfSigned)) {
    warnings.push('检测到自签名证书；自签名证书不能证明由受信 CA 签发。')
  }
  const uncoveredSignatures = signatures.filter((signature) => signature.coversWholeDocument !== true)
  if (uncoveredSignatures.length) {
    const labels = uncoveredSignatures.map((signature) => `#${signature.index + 1}`).join('、')
    warnings.push(
      `签名 ${labels} 未覆盖当前文件末尾；这可能是历史增量签名，也可能表示签名后追加了未覆盖内容。历史签名的密码学校验可单独成立，但不能据此宣称当前整份 PDF 已签。`
    )
  }
  if (!coveringSignatures.length) {
    warnings.push('当前整份 PDF 没有被任何签名覆盖到文件末尾，不能显示全文完整性通过。')
  }
  warnings.push('未配置系统根证书信任库、OCSP 或 CRL：证书是否受信、是否撤销未验证。')
  warnings.push('“摘要与签名一致”只代表该签名覆盖的字节未被篡改，不构成法律有效性结论。')
  return {
    isPdf: true,
    pageCount,
    hasSignature: true,
    unsigned: false,
    signatureCount: signatures.length,
    signatures,
    verified: currentDocumentVerified,
    integrity: currentDocumentIntegrity,
    allSignatureValid: signatures.every((signature) => signature.signatureValid === true),
    currentDocumentVerified,
    currentDocumentIntegrity,
    hasUncoveredContent: coveringSignatures.length === 0,
    coveredSignatureCount: coveringSignatures.length,
    documentLength: pdfBytes.length,
    maxCoveredLength: Math.max(...signatures.map((signature) => signature.coveredLength || 0)),
    warnings
  }
}

export { binaryString, readTlv, children, decodeOid, parseCertificate }
