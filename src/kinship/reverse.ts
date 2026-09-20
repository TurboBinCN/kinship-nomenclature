import { canonicalize, classify, deriveTitle, edgesToText } from './engine'
import type { Edge, Relation } from './types'

/**
 * 反向查询：「三舅姥爷」→ 哪些关系会被这么称呼。
 * 不手写反查表，而是枚举关系路径、逐条跑正向递归推导，建立倒排索引——
 * 与正向引擎永远自洽，正向怎么推，反向就怎么查。
 */

/** 枚举深度上限（4 层已覆盖 姑姥爷 / 堂伯 / 三舅姥爷 等常用称谓） */
const MAX_DEPTH = 4
const MAX_RANK = 10

/** 原子边形状（B/Z 分长幼；配偶边 F→W / M→H 会被 canonicalize 归并，故不接在 F/M 之后） */
const SHAPES: Edge[] = [
  { k: 'F' },
  { k: 'M' },
  { k: 'B', elder: true },
  { k: 'B', elder: false },
  { k: 'Z', elder: true },
  { k: 'Z', elder: false },
  { k: 'S' },
  { k: 'D' },
  { k: 'H' },
  { k: 'W' },
]

function* walk(cur: Edge[]): Generator<Edge[]> {
  if (cur.length) yield cur
  if (cur.length >= MAX_DEPTH) return
  const prev = cur[cur.length - 1]?.k
  for (const s of SHAPES) {
    // 直系长辈的配偶已含在称谓内（爷爷/奶奶/姥爷/姥姥），跳过垃圾路径
    if ((prev === 'F' || prev === 'M') && (s.k === 'H' || s.k === 'W')) continue
    yield* walk([...cur, s])
  }
}

interface Entry {
  title: string
  pathText: string
  edges: Edge[]
  relation: Relation
  relationLabel: string
}

function makeEntry(pathEdges: Edge[]): Entry {
  const edges = canonicalize(pathEdges)
  // 末段为「兄弟/姐妹 → 子女」时，给末位子女边补上与长辈边一致的长幼标记。
  // 枚举路径是明确陈述，应产出「表哥」「堂妹」等确定称谓进入索引
  // （正向解析中只有直接称谓词带明确长幼，「姑姑的儿子」则得到合并式「表哥(弟)」）
  if (edges.length >= 2) {
    const b = edges[edges.length - 2]
    const t = edges[edges.length - 1]
    if ((b.k === 'B' || b.k === 'Z') && (t.k === 'S' || t.k === 'D') && t.elder === undefined) {
      edges[edges.length - 1] = { ...t, elder: b.elder !== false }
    }
  }
  const { relation, label } = classify(edges)
  return {
    title: deriveTitle(edges),
    pathText: edgesToText(edges),
    edges,
    relation,
    relationLabel: label,
  }
}

let INDEX: Map<string, Entry[]> | null = null

/** 惰性构建倒排索引：称呼 → 关系路径列表 */
function buildIndex(): Map<string, Entry[]> {
  const idx = new Map<string, Entry[]>()
  const seen = new Set<string>()
  const put = (e: Entry) => {
    // 归约失败的兜底串（含「的」）不入库，保持索引干净
    if (e.title.includes('的')) return
    const key = `${e.title}|${e.pathText}`
    if (seen.has(key)) return
    seen.add(key)
    const arr = idx.get(e.title)
    if (arr) arr.push(e)
    else idx.set(e.title, [e])
  }

  for (const path of walk([])) {
    const c = canonicalize(path)
    put(makeEntry(c))
    // 排行变体：与解析器一致，排行落在末位可排行边（大孙子 / 二表哥 / 三舅姥爷）
    let i = -1
    for (let j = c.length - 1; j >= 0; j--) {
      const k = c[j].k
      if (k === 'B' || k === 'Z' || k === 'S' || k === 'D') {
        i = j
        break
      }
    }
    if (i < 0) continue
    for (let n = 1; n <= MAX_RANK; n++) {
      put(makeEntry(c.map((e, j) => (j === i ? { ...e, n } : e))))
    }
  }
  return idx
}

export interface ReverseResult {
  /** 关系路径描述，如「妈妈的妈妈的三哥」 */
  pathText: string
  /** 命中的称呼 */
  title: string
  relation: Relation
  relationLabel: string
}

/**
 * 反向查询：称呼 → 会被这么称呼的关系（按路径长度升序，最多 limit 条）。
 * 同一称呼可对应多种关系，如「表哥」既是姑姑家的也是舅舅家的儿子。
 */
export function reverseLookup(title: string, limit = 6): ReverseResult[] {
  if (!INDEX) INDEX = buildIndex()
  const key = title.trim()
  if (!key) return []
  return (INDEX.get(key) ?? [])
    .slice()
    .sort((a, b) => a.pathText.length - b.pathText.length)
    .slice(0, limit)
    .map(({ pathText, title, relation, relationLabel }) => ({
      pathText,
      title,
      relation,
      relationLabel,
    }))
}
