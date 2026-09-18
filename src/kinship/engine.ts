import { COMBINE, DIRECT, EDGE_TEXT, RANK_CHARS, RANK_TPL, STRIP } from './data'
import { applyDialect, type Dialect } from './dialects'
import type { DeriveResult, Edge, Relation } from './types'

/* ---------- 基础工具 ---------- */

function elderOf(e: Edge): boolean {
  return e.elder !== false
}

/** 边 → 路径 token：F M OB YB OS YS S D H W */
function token(e: Edge): string {
  switch (e.k) {
    case 'F':
      return 'F'
    case 'M':
      return 'M'
    case 'B':
      return elderOf(e) ? 'OB' : 'YB'
    case 'Z':
      return elderOf(e) ? 'OS' : 'YS'
    case 'S':
      return 'S'
    case 'D':
      return 'D'
    case 'H':
      return 'H'
    case 'W':
      return 'W'
  }
}

export function encode(edges: Edge[]): string {
  return edges.map(token).join(',')
}

/** 边 → 中文文本，如 [M,M,OB(3)] → 妈妈的妈妈的三哥 */
export function edgesToText(edges: Edge[]): string {
  return edges
    .map((e) => {
      let t: string
      if (e.n != null && (e.k === 'B' || e.k === 'Z')) {
        // 带排行时用单字（三哥 / 二姐），不带排行用叠字（哥哥 / 姐姐）
        const single = e.k === 'B' ? (elderOf(e) ? '哥' : '弟') : elderOf(e) ? '姐' : '妹'
        t = rankChar(e.n) + single
      } else {
        t =
          e.k === 'B'
            ? elderOf(e)
              ? '哥哥'
              : '弟弟'
            : e.k === 'Z'
              ? elderOf(e)
                ? '姐姐'
                : '妹妹'
              : EDGE_TEXT[e.k]
        if (e.n != null) t = rankChar(e.n) + t
      }
      return t
    })
    .join('的')
}

function rankChar(n: number): string {
  return RANK_CHARS[n] ?? String(n)
}

/** 排行序字（用于冠序：三舅姥爷） */
function rankStr(n: number): string {
  return rankChar(n)
}

function canonical(edges: Edge[]): Edge[] {
  const out: Edge[] = []
  for (const e of edges) {
    const last = out[out.length - 1]
    if (last) {
      if (last.k === 'F' && e.k === 'W') {
        out.splice(-1, 1, { k: 'M' })
        continue
      }
      if (last.k === 'M' && e.k === 'H') {
        out.splice(-1, 1, { k: 'F' })
        continue
      }
    }
    out.push(e)
  }
  return out
}

/** 边序列规范化（合并配偶边）：导出供反向索引复用 */
export function canonicalize(edges: Edge[]): Edge[] {
  return canonical(edges)
}

/* ---------- 排行修饰 ---------- */

const RANK_KEY_MAP: Record<string, string> = { OB: 'B', YB: 'B', OS: 'Z', YS: 'Z' }

function rankEdge(edges: Edge[]): Edge | undefined {
  return edges.find((e) => e.n != null && (e.k === 'B' || e.k === 'Z'))
}

/** 带排行的兄弟/姐妹路径 → 冠序称谓（如 [M,M,OB3] → 三舅姥爷） */
function rankedTitle(edges: Edge[]): string | null {
  const re = rankEdge(edges)
  if (!re) return null
  const mk = encode(edges)
    .split(',')
    .map((t) => RANK_KEY_MAP[t] ?? t)
    .join(',')
  const tpl = RANK_TPL[mk]
  if (!tpl) return null
  if (mk === 'F,B') {
    // 伯/叔按长幼区分
    return elderOf(re) ? `${rankStr(re.n!)}伯` : `${rankStr(re.n!)}叔`
  }
  return tpl(rankStr(re.n!))
}

/** 直称 + 排行（三哥、大伯、二叔） */
function decorate(title: string, edges: Edge[]): string {
  const re = edges.find((e) => e.n != null && (e.k === 'S' || e.k === 'D'))
  if (!re) {
    // B/Z 排行未命中模板时，尝试去尾直称（三哥 / 大伯）
    const bz = edges.find((e) => e.n != null && (e.k === 'B' || e.k === 'Z'))
    if (!bz) return title
    const stripped = STRIP[title]
    return stripped ? rankStr(bz.n!) + stripped : title
  }
  return rankStr(re.n!) + title
}

/* ---------- 堂/表判定 ---------- */

/** 判定来源分支（导出供反向索引复用） */
export function classify(edges: Edge[]): { relation: Relation; label: string } {
  // 路径中出现姻亲边（且未被 canonical 归并）→ 姻亲
  if (edges.some((e) => e.k === 'H' || e.k === 'W')) {
    return { relation: 'kin', label: '姻亲 · 配偶一方' }
  }

  let i = 0
  while (i < edges.length && 'FM BZ'.includes(edges[i].k)) i++
  const up = edges.slice(0, i)

  if (!up.length) {
    const first = edges[0]
    if (first.k === 'B') return { relation: 'tang', label: '同宗 · 宗亲（同姓）' }
    if (first.k === 'Z') return { relation: 'biao', label: '外支 · 表系' }
    return { relation: 'kin', label: '直系血亲' }
  }

  let paternal = true // 从「我」出发，父系男性血脉
  let isTang = true
  let vertical = true // 纯 F/M 直系链
  for (const e of up) {
    if (e.k === 'F') {
      paternal = true
    } else if (e.k === 'M') {
      paternal = false
      isTang = false
      vertical = false
    } else if (e.k === 'Z') {
      paternal = false
      isTang = false
      vertical = false
    } else {
      // B：兄弟边，脱离纯直系
      vertical = false
      if (!paternal) isTang = false
    }
  }

  if (vertical) return { relation: 'kin', label: '直系血亲' }
  return isTang
    ? { relation: 'tang', label: '同宗 · 堂系（同姓本家）' }
    : { relation: 'biao', label: '外支 · 表系' }
}

/* ---------- 递归推导 ---------- */

/**
 * 核心递归：
 *   title(path) = combine( 长辈称谓, title(剩余路径) )
 * 即「你父母对TA的称呼」+「辈分偏移标记」——祖先传下来的口头递归函数。
 */
function titleStd(input: Edge[]): string {
  const edges = canonical(input)
  if (!edges.length) return '自己'

  const ranked = rankedTitle(edges)
  if (ranked) return ranked

  const direct = DIRECT[encode(edges)]
  if (direct) return decorate(direct, edges)

  const first = edges[0]

  if (first.k === 'F' || first.k === 'M') {
    let i = 1
    while (i < edges.length && (edges[i].k === 'F' || edges[i].k === 'M')) i++
    const up = edges.slice(0, i)
    const rest = edges.slice(i)
    const base = DIRECT[encode(up)] ?? edgesToText(up)
    const sub = titleStd(rest)
    return COMBINE[base]?.[sub] ?? `${base}的${sub}`
  }

  if (first.k === 'B' || first.k === 'Z' || first.k === 'H' || first.k === 'W') {
    const base = edgesToText([first])
    const sub = titleStd(edges.slice(1))
    return COMBINE[base]?.[sub] ?? `${base}的${sub}`
  }

  // 晚辈链 S/D*
  let i = 0
  while (i < edges.length && (edges[i].k === 'S' || edges[i].k === 'D')) i++
  const down = edges.slice(0, i)
  const rest = edges.slice(i)
  if (!rest.length) return DIRECT[encode(down)] ?? edgesToText(down)
  const base = DIRECT[encode(down)] ?? edgesToText(down)
  const sub = titleStd(rest)
  return COMBINE[base]?.[sub] ?? `${base}的${sub}`
}

/** 关系路径 → 称谓（dialect 为输出方言，仅做出口词根替换） */
export function deriveTitle(input: Edge[], dialect: Dialect = 'standard'): string {
  return applyDialect(titleStd(canonical(input)), dialect)
}

/** 递归推导链：逐层前缀的称谓（妈妈 → 姥娘 → 舅姥爷 → 三舅姥爷） */
function buildChain(edges: Edge[], dialect: Dialect): string[] {
  const titles: string[] = []
  for (let i = 1; i <= edges.length; i++) {
    const t = deriveTitle(edges.slice(0, i), dialect)
    if (titles[titles.length - 1] !== t) titles.push(t)
  }
  return titles
}

/* ---------- 对外 API ---------- */

export function derive(input: Edge[], dialect: Dialect = 'standard'): DeriveResult {
  const edges = canonical(input)
  const title = deriveTitle(edges, dialect)
  const { relation, label } = classify(edges)
  const chain = buildChain(edges, dialect)

  const steps: string[] = []
  if (chain.length > 1) {
    steps.push(`逐层推导：${chain.join(' → ')}`)
    steps.push(
      `递归公式：你的称呼 = 父母对TA的称呼 + 辈分标记${edges.some((e) => e.n != null) ? ' + 排行' : ''}`,
    )
  }
  if (edges.some((e) => e.n != null && (e.k === 'B' || e.k === 'Z' || e.k === 'S' || e.k === 'D'))) {
    const n = edges.find((e) => e.n != null)!.n!
    steps.push(`排行标记：${rankChar(n)}（同辈冠序，大、二、三……）`)
  }
  steps.push(`分支判定：${label}`)

  return {
    pathText: edgesToText(edges),
    title,
    relation,
    relationLabel: label,
    chain: steps,
    edges,
  }
}
