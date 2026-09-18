/**
 * 方言层（模板级词根替换）：在标准称谓输出之上做表层替换。
 * 不改变递归推导逻辑——推导链仍用规范词，出口处按方言改写。
 *
 * 资料来源：
 * - 山东：外祖母口语「姥娘」，外祖母之姐妹「姨姥娘」（山东省志民俗库 / 威海市档案馆 / 青岛市情）
 * - 西南官话：妈妈的姐妹称「孃 / 孃孃」（四川、云南），排行冠序如「二孃」，姨父称「姨爹」
 */

export type Dialect = 'standard' | 'shandong' | 'southwest'

export const DIALECT_LABEL: Record<Dialect, string> = {
  standard: '标准',
  shandong: '山东话',
  southwest: '西南官话',
}

/** 有序替换规则：数组顺序即应用顺序（长词在前，如先「姨妈→孃孃」再「姨→孃」） */
const RULES: Record<Exclude<Dialect, 'standard'>, Array<[string, string]>> = {
  shandong: [['姥姥', '姥娘']],
  southwest: [
    ['姨妈', '孃孃'],
    ['姨父', '姨爹'],
    ['姨', '孃'],
  ],
}

/**
 * 按方言改写称谓；standard 原样返回。
 * 单遍扫描、最长匹配优先：替换产物不参与二次匹配
 * （如西南规则「姨父→姨爹」先生成，不会被「姨→孃」再改写成「孃爹」）。
 */
export function applyDialect(title: string, dialect: Dialect): string {
  if (dialect === 'standard') return title
  const rules = RULES[dialect]
  const re = new RegExp(rules.map(([from]) => from).join('|'), 'g')
  const map = new Map(rules)
  return title.replace(re, (m) => map.get(m) ?? m)
}
