import type { Edge, Kind } from './types'

/**
 * 自然语言解析：把「姥姥的三哥」这类关系描述解析为原子边序列。
 * 词表按最大匹配（长词优先）；称谓词（伯父、叔叔、堂哥……）也映射为边，
 * 因此「叔叔的儿子」同样可解。
 */

interface LexEdge {
  k: Kind
  /** B/Z 的长幼：兄/姐 true，弟/妹 false；缺省视为兄/姐（宁大勿小） */
  elder?: boolean
}

const LEX_RAW: Array<[string, LexEdge[]]> = [
  // ---- 祖辈四词 ----
  ['姥姥', [{ k: 'M' }, { k: 'M' }]],
  ['外婆', [{ k: 'M' }, { k: 'M' }]],
  ['外祖母', [{ k: 'M' }, { k: 'M' }]],
  ['姥爷', [{ k: 'M' }, { k: 'F' }]],
  ['外公', [{ k: 'M' }, { k: 'F' }]],
  ['外祖父', [{ k: 'M' }, { k: 'F' }]],
  ['爷爷', [{ k: 'F' }, { k: 'F' }]],
  ['祖父', [{ k: 'F' }, { k: 'F' }]],
  ['奶奶', [{ k: 'F' }, { k: 'M' }]],
  ['祖母', [{ k: 'F' }, { k: 'M' }]],
  // ---- 曾祖/高祖 ----
  ['外曾祖父', [{ k: 'M' }, { k: 'F' }, { k: 'F' }]],
  ['外曾祖母', [{ k: 'M' }, { k: 'F' }, { k: 'M' }]],
  ['曾祖父', [{ k: 'F' }, { k: 'F' }, { k: 'F' }]],
  ['太爷爷', [{ k: 'F' }, { k: 'F' }, { k: 'F' }]],
  ['曾祖母', [{ k: 'F' }, { k: 'F' }, { k: 'M' }]],
  ['太奶奶', [{ k: 'F' }, { k: 'F' }, { k: 'M' }]],
  ['高祖父', [{ k: 'F' }, { k: 'F' }, { k: 'F' }, { k: 'F' }]],
  ['高祖母', [{ k: 'F' }, { k: 'F' }, { k: 'F' }, { k: 'M' }]],
  // ---- 直系父母 ----
  ['爸爸', [{ k: 'F' }]],
  ['老爸', [{ k: 'F' }]],
  ['父亲', [{ k: 'F' }]],
  ['爹', [{ k: 'F' }]],
  ['爸', [{ k: 'F' }]],
  ['妈妈', [{ k: 'M' }]],
  ['老妈', [{ k: 'M' }]],
  ['母亲', [{ k: 'M' }]],
  ['娘', [{ k: 'M' }]],
  ['妈', [{ k: 'M' }]],
  // ---- 长辈称谓词（映射回边）----
  ['伯父', [{ k: 'F' }, { k: 'B', elder: true }]],
  ['伯伯', [{ k: 'F' }, { k: 'B', elder: true }]],
  ['伯', [{ k: 'F' }, { k: 'B', elder: true }]],
  ['叔叔', [{ k: 'F' }, { k: 'B', elder: false }]],
  ['叔', [{ k: 'F' }, { k: 'B', elder: false }]],
  ['姑姑', [{ k: 'F' }, { k: 'Z' }]],
  ['姑妈', [{ k: 'F' }, { k: 'Z' }]],
  ['姑母', [{ k: 'F' }, { k: 'Z' }]],
  ['姑', [{ k: 'F' }, { k: 'Z' }]],
  ['舅舅', [{ k: 'M' }, { k: 'B' }]],
  ['舅父', [{ k: 'M' }, { k: 'B' }]],
  ['舅', [{ k: 'M' }, { k: 'B' }]],
  ['姨妈', [{ k: 'M' }, { k: 'Z' }]],
  ['姨母', [{ k: 'M' }, { k: 'Z' }]],
  ['姨', [{ k: 'M' }, { k: 'Z' }]],
  ['兄弟', [{ k: 'B' }]],
  ['姐妹', [{ k: 'Z' }]],
  ['伯母', [{ k: 'F' }, { k: 'B', elder: true }, { k: 'W' }]],
  ['婶婶', [{ k: 'F' }, { k: 'B', elder: false }, { k: 'W' }]],
  ['婶子', [{ k: 'F' }, { k: 'B', elder: false }, { k: 'W' }]],
  ['姑父', [{ k: 'F' }, { k: 'Z' }, { k: 'H' }]],
  ['舅妈', [{ k: 'M' }, { k: 'B' }, { k: 'W' }]],
  ['姨父', [{ k: 'M' }, { k: 'Z' }, { k: 'H' }]],
  // ---- 平辈 ----
  ['哥哥', [{ k: 'B', elder: true }]],
  ['兄长', [{ k: 'B', elder: true }]],
  ['哥', [{ k: 'B', elder: true }]],
  ['弟弟', [{ k: 'B', elder: false }]],
  ['弟', [{ k: 'B', elder: false }]],
  ['姐姐', [{ k: 'Z', elder: true }]],
  ['姐', [{ k: 'Z', elder: true }]],
  ['妹妹', [{ k: 'Z', elder: false }]],
  ['妹', [{ k: 'Z', elder: false }]],
  ['堂哥', [{ k: 'F' }, { k: 'B', elder: true }, { k: 'S' }]],
  ['堂弟', [{ k: 'F' }, { k: 'B', elder: false }, { k: 'S' }]],
  ['堂姐', [{ k: 'F' }, { k: 'B', elder: true }, { k: 'D' }]],
  ['堂妹', [{ k: 'F' }, { k: 'B', elder: false }, { k: 'D' }]],
  ['表哥', [{ k: 'M' }, { k: 'B', elder: true }, { k: 'S' }]],
  ['表弟', [{ k: 'M' }, { k: 'B', elder: false }, { k: 'S' }]],
  ['表姐', [{ k: 'M' }, { k: 'B', elder: true }, { k: 'D' }]],
  ['表妹', [{ k: 'M' }, { k: 'B', elder: false }, { k: 'D' }]],
  ['嫂子', [{ k: 'B', elder: true }, { k: 'W' }]],
  ['弟妹', [{ k: 'B', elder: false }, { k: 'W' }]],
  ['姐夫', [{ k: 'Z', elder: true }, { k: 'H' }]],
  ['妹夫', [{ k: 'Z', elder: false }, { k: 'H' }]],
  // ---- 晚辈 ----
  ['儿子', [{ k: 'S' }]],
  ['儿', [{ k: 'S' }]],
  ['女儿', [{ k: 'D' }]],
  ['闺女', [{ k: 'D' }]],
  ['孙子', [{ k: 'S' }, { k: 'S' }]],
  ['孙儿', [{ k: 'S' }, { k: 'S' }]],
  ['孙女', [{ k: 'S' }, { k: 'D' }]],
  ['外孙', [{ k: 'D' }, { k: 'S' }]],
  ['外孙女', [{ k: 'D' }, { k: 'D' }]],
  ['侄子', [{ k: 'B', elder: true }, { k: 'S' }]],
  ['侄儿', [{ k: 'B', elder: true }, { k: 'S' }]],
  ['侄女', [{ k: 'B', elder: true }, { k: 'D' }]],
  ['外甥', [{ k: 'Z', elder: true }, { k: 'S' }]],
  ['外甥女', [{ k: 'Z', elder: true }, { k: 'D' }]],
  ['儿媳', [{ k: 'S' }, { k: 'W' }]],
  ['儿媳妇', [{ k: 'S' }, { k: 'W' }]],
  ['女婿', [{ k: 'D' }, { k: 'H' }]],
  // ---- 姻亲 ----
  ['老公', [{ k: 'H' }]],
  ['丈夫', [{ k: 'H' }]],
  ['先生', [{ k: 'H' }]],
  ['老婆', [{ k: 'W' }]],
  ['妻子', [{ k: 'W' }]],
  ['夫人', [{ k: 'W' }]],
  ['岳父', [{ k: 'W' }, { k: 'F' }]],
  ['老丈人', [{ k: 'W' }, { k: 'F' }]],
  ['岳母', [{ k: 'W' }, { k: 'M' }]],
  ['丈母娘', [{ k: 'W' }, { k: 'M' }]],
  ['公公', [{ k: 'H' }, { k: 'F' }]],
  ['婆婆', [{ k: 'H' }, { k: 'M' }]],
]

// 长词优先
const LEX = [...LEX_RAW].sort((a, b) => b[0].length - a[0].length)

const CN_NUM: Record<string, number> = {
  大: 1,
  一: 1,
  '1': 1,
  二: 2,
  两: 2,
  '2': 2,
  三: 3,
  '3': 3,
  四: 4,
  '4': 4,
  五: 5,
  '5': 5,
  六: 6,
  '6': 6,
  七: 7,
  '7': 7,
  八: 8,
  '8': 8,
  九: 9,
  '9': 9,
  十: 10,
  '0': 0,
}

export class ParseError extends Error {
  position: number
  constructor(message: string, position: number) {
    super(message)
    this.position = position
  }
}

function lexToEdges(spec: LexEdge[], pendingRank: number | null): Edge[] {
  return spec.map((s, idx): Edge => {
    const e: Edge = { k: s.k }
    if (s.elder !== undefined) e.elder = s.elder
    const rankable = s.k === 'B' || s.k === 'Z' || s.k === 'S' || s.k === 'D'
    if (rankable && pendingRank != null && idx === spec.length - 1) e.n = pendingRank
    return e
  })
}

/** 解析关系描述 → 边序列；无法识别时抛 ParseError */
export function parse(input: string): Edge[] {
  // 去掉连接词与指代词
  const text = input.replace(/\s+/g, '').replace(/[的俺]/g, '').replace(/^(我|本人|自家)/, '')
  const edges: Edge[] = []
  let pendingRank: number | null = null
  let i = 0

  while (i < text.length) {
    // 阿拉伯数字串
    const digitMatch = /^\d+/.exec(text.slice(i))
    if (digitMatch) {
      pendingRank = parseInt(digitMatch[0], 10)
      i += digitMatch[0].length
      continue
    }
    // 中文数字
    const ch = text[i]
    if (ch in CN_NUM) {
      pendingRank = CN_NUM[ch]
      i += 1
      continue
    }
    // 词表最大匹配
    const hit = LEX.find(([w]) => text.startsWith(w, i))
    if (hit) {
      edges.push(...lexToEdges(hit[1], pendingRank))
      pendingRank = null
      i += hit[0].length
      continue
    }
    throw new ParseError(`无法识别的字词「${text[i]}」`, i)
  }

  if (!edges.length) throw new ParseError('请输入关系描述，如：姥姥的三哥', 0)
  return edges
}
