/** BCrypt 哈希与校验。bcryptjs 的异步接口避免同步计算长期占用主线程。 */

import * as bcryptModule from 'bcryptjs'

const bcrypt = bcryptModule.default || bcryptModule

export const BCRYPT_MIN_COST = 4
export const BCRYPT_MAX_COST = 12

export function normalizeBcryptCost(value) {
  const cost = Number(value)
  if (!Number.isInteger(cost) || cost < BCRYPT_MIN_COST || cost > BCRYPT_MAX_COST) {
    throw new Error(`BCrypt cost 必须是 ${BCRYPT_MIN_COST} 至 ${BCRYPT_MAX_COST} 的整数`)
  }
  return cost
}

export async function bcryptHash(password, cost = 10) {
  const text = String(password ?? '')
  if (!text) throw new Error('请输入要哈希的密码')
  if (new TextEncoder().encode(text).length > 72) throw new Error('BCrypt 最多处理 72 字节密码，请缩短后重试')
  return bcrypt.hash(text, normalizeBcryptCost(cost))
}

export async function bcryptVerify(password, hash) {
  const text = String(password ?? '')
  const value = String(hash ?? '').trim()
  if (!text) throw new Error('请输入待校验的密码')
  if (!value) throw new Error('请输入 BCrypt 哈希值')
  if (!/^\$2[abxy]?\$\d{2}\$[./A-Za-z0-9]{53}$/.test(value)) throw new Error('BCrypt 哈希格式不合法')
  return bcrypt.compare(text, value)
}
