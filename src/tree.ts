import { deriveTitle, edgesToText, encode } from './kinship/engine'
import type { Edge } from './kinship/types'

/**
 * 家族树可视化（零依赖 SVG）：
 * 三行结构——祖辈 / 父辈 / 平辈；父系分支居左，母系分支居右。
 * 每个节点持有从「我」出发的关系路径，称谓由引擎推导，与查询永远自洽。
 */

const COL_W = 60
const NODE_W = 54
const NODE_H = 34
const MARGIN = 34
const ROW_Y = [44, 168, 292]

/* 边构造器 */
const F: Edge = { k: 'F' }
const M: Edge = { k: 'M' }
const B = (elder: boolean): Edge => ({ k: 'B', elder })
const Z = (elder: boolean): Edge => ({ k: 'Z', elder })
const S: Edge = { k: 'S' }
const D: Edge = { k: 'D' }
const W: Edge = { k: 'W' }
const H: Edge = { k: 'H' }

interface TNode {
  col: number
  row: number
  path: Edge[]
}

const N = (col: number, row: number, ...path: Edge[]): TNode => ({ col, row, path })

/** 25 个节点：我 + 祖辈 4 + 父辈 10（含配偶）+ 平辈 10 */
const NODES: TNode[] = [
  // 祖辈
  N(1.5, 0, F, F), N(2.5, 0, F, M), // 爷爷 奶奶
  N(6.5, 0, M, F), N(7.5, 0, M, M), // 姥爷 姥姥
  // 父辈
  N(0, 1, F, B(true)), N(1, 1, F, B(true), W), // 伯父 伯母
  N(2, 1, F, Z(true)), N(3, 1, F, Z(true), H), // 姑姑 姑父
  N(4, 1, F), N(5, 1, M), // 爸爸 妈妈
  N(6, 1, M, B(true)), N(7, 1, M, B(true), W), // 舅舅 舅妈
  N(8, 1, M, Z(true)), N(9, 1, M, Z(true), H), // 姨妈 姨父
  // 平辈
  N(0, 2, F, B(true), S), N(1, 2, F, B(false), D), // 堂哥 堂妹（叔伯家）
  N(2, 2, F, Z(true), S), N(3, 2, F, Z(true), D), // 表哥 表妹（姑家）
  N(3.7, 2, B(true)), N(4.5, 2), N(5.3, 2, Z(false)), // 哥哥 我 妹妹
  N(6, 2, M, B(true), S), N(7, 2, M, B(true), D), // 表哥 表妹（舅家）
  N(8, 2, M, Z(true), D), N(9, 2, M, Z(false), D), // 表姐 表妹（姨家）
]

/** 夫妻连接（节点下标对） */
const SPOUSES: Array<[number, number]> = [
  [0, 1], [2, 3], [4, 5], [6, 7], [8, 9], [10, 11], [12, 13],
]

/** 亲子连接：夫妻对 → 子女下标列表 */
const FAMILIES: Array<{ couple: [number, number]; kids: number[] }> = [
  { couple: [0, 1], kids: [4, 6, 8] }, // 爷爷奶奶 → 伯父/姑姑/爸爸
  { couple: [2, 3], kids: [9, 10, 12] }, // 姥姥姥爷 → 妈妈/舅舅/姨妈
  { couple: [4, 5], kids: [14, 15] }, // 伯父伯母 → 堂哥堂妹
  { couple: [6, 7], kids: [16, 17] }, // 姑姑姑父 → 表哥表妹
  { couple: [8, 9], kids: [18, 19, 20] }, // 爸爸妈妈 → 哥哥/我/妹妹
  { couple: [10, 11], kids: [21, 22] }, // 舅舅舅妈 → 表哥表妹
  { couple: [12, 13], kids: [23, 24] }, // 姨妈姨父 → 表姐表妹
]

const cx = (n: TNode) => MARGIN + n.col * COL_W
const cy = (n: TNode) => ROW_Y[n.row]

const SVG_NS = 'http://www.w3.org/2000/svg'

function el(tag: string, attrs: Record<string, string | number>, parent?: SVGElement): SVGElement {
  const node = document.createElementNS(SVG_NS, tag)
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v))
  parent?.appendChild(node)
  return node
}

export interface TreeOptions {
  /** 高亮：当前查询的边序列编码（路径前缀上的节点都会点亮） */
  highlightEncode?: string
  onPick?: (text: string) => void
}

export function renderTree(container: HTMLElement, opts: TreeOptions = {}): void {
  const q = opts.highlightEncode

  const svg = el('svg', {
    viewBox: `0 0 640 360`,
    width: 640,
    height: 360,
    xmlns: SVG_NS,
  })

  /* 父系 / 母系分区 */
  const divider = MARGIN + 4.5 * COL_W
  el('text', {
    x: (MARGIN + divider) / 2,
    y: 20,
    'text-anchor': 'middle',
    class: 'tree-zone',
  }, svg).textContent = '父 系'
  el('text', {
    x: divider + (MARGIN + 9 * COL_W + MARGIN - divider) / 2,
    y: 20,
    'text-anchor': 'middle',
    class: 'tree-zone',
  }, svg).textContent = '母 系'
  el('line', {
    x1: divider, y1: 28, x2: divider, y2: 344,
    class: 'tree-divider',
  }, svg)

  /* 亲子连线 */
  for (const { couple, kids } of FAMILIES) {
    const [a, b] = couple
    const midX = (cx(NODES[a]) + cx(NODES[b])) / 2
    const bottom = cy(NODES[a]) + NODE_H / 2
    for (const kid of kids) {
      const kx = cx(NODES[kid])
      const top = cy(NODES[kid]) - NODE_H / 2
      const midY = (bottom + top) / 2
      el('polyline', {
        points: `${midX},${bottom} ${midX},${midY} ${kx},${midY} ${kx},${top}`,
        class: 'tree-line',
        fill: 'none',
      }, svg)
    }
  }

  /* 夫妻连线 */
  for (const [a, b] of SPOUSES) {
    el('line', {
      x1: cx(NODES[a]) + NODE_W / 2, y1: cy(NODES[a]),
      x2: cx(NODES[b]) - NODE_W / 2, y2: cy(NODES[b]),
      class: 'tree-spouse',
    }, svg)
  }

  /* 节点 */
  NODES.forEach((n, i) => {
    const ne = encode(n.path)
    const onPath = q != null && q.startsWith(ne)
    const g = el('g', {
      class: 'tree-node',
      'data-hot': n.path.length === 0 ? 'true' : 'false',
      transform: `translate(${cx(n)},${cy(n)})`,
    }, svg)
    if (onPath) g.classList.add('lit')
    if (n.path.length === 0) g.classList.add('self')
    el('rect', { x: -NODE_W / 2, y: -NODE_H / 2, width: NODE_W, height: NODE_H, rx: 9 }, g)
    el('text', { x: 0, y: 1, 'text-anchor': 'middle', 'dominant-baseline': 'middle' }, g)
      .textContent = deriveTitle(n.path)
    if (opts.onPick) {
      g.addEventListener('click', () => opts.onPick!(edgesToText(n.path)))
    }
    void i
  })

  container.innerHTML = ''
  container.appendChild(svg)
}
