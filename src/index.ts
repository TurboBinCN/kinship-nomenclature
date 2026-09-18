export type { DeriveResult, Edge, Kind, Relation } from './kinship/types'
export type { Dialect } from './kinship/dialects'
export { DIALECT_LABEL } from './kinship/dialects'
export { derive, deriveTitle, edgesToText, encode } from './kinship/engine'
export { ParseError, parse } from './kinship/parser'
export { reverseLookup, type ReverseResult } from './kinship/reverse'
import { derive } from './kinship/engine'
import { ParseError, parse } from './kinship/parser'
import { reverseLookup } from './kinship/reverse'
import type { Dialect } from './kinship/dialects'
import type { DeriveResult } from './kinship/types'

export interface LookupOptions {
  /** 输出方言：standard（默认）/ shandong / southwest */
  dialect?: Dialect
}

/**
 * 一站式查询：「姥姥的三哥」→ 三舅姥爷（含推导链与堂/表判定）
 * 可指定输出方言，如 lookup('姥姥的三哥', { dialect: 'shandong' })
 *
 * 兼容两种输入：
 * - 关系链「姥姥的三哥」→ 正向推导
 * - 成熟称谓「三舅姥爷」「姨姥姥」→ 正向拆不动时自动走反向索引，返回规范路径
 * @throws ParseError 无法识别的输入
 */
export function lookup(input: string, opts: LookupOptions = {}): DeriveResult {
  const dialect = opts.dialect ?? 'standard'
  let r: DeriveResult
  try {
    r = derive(parse(input), dialect)
  } catch (e) {
    if (e instanceof ParseError) {
      // 分词失败也可能是成熟称谓（如「表舅」），反向索引兜底
      const hits = reverseLookup(input)
      if (hits.length) return derive(parse(hits[0].pathText), dialect)
    }
    throw e
  }
  // 称谓里不会出现「的」；出现即说明正向归约失败（如「三舅姥爷」被硬拆成碎片链）
  if (r.title.includes('的')) {
    const hits = reverseLookup(input)
    if (hits.length) {
      // 反向索引按输入称呼登记，命中即 derive 到同一个称呼
      return derive(parse(hits[0].pathText), dialect)
    }
    throw new ParseError(`无法识别的称谓「${input.trim()}」`, 0)
  }
  return r
}
