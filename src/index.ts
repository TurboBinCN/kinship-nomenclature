export type { DeriveResult, Edge, Kind, Relation } from './kinship/types'
export { derive, deriveTitle, edgesToText, encode } from './kinship/engine'
export { ParseError, parse } from './kinship/parser'
import { derive } from './kinship/engine'
import { parse } from './kinship/parser'
import type { DeriveResult } from './kinship/types'

/**
 * 一站式查询：「姥姥的三哥」→ 三舅姥爷（含推导链与堂/表判定）
 * @throws ParseError 无法识别的输入
 */
export function lookup(input: string): DeriveResult {
  return derive(parse(input))
}
