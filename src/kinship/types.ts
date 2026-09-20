/** 原子亲缘边类型 */
export type Kind = 'F' | 'M' | 'B' | 'Z' | 'S' | 'D' | 'H' | 'W'
// F=父 M=母 B=兄弟 Z=姐妹 S=子 D=女 H=夫 W=妻

export interface Edge {
  k: Kind
  /** 兄/姐（true）还是弟/妹（false）；B/Z 上表示长幼。末位 S/D 上仅当长幼已由称谓词
   *  （表哥、堂妹……）明确时才携带——路径描述（姑姑的儿子）不带 → 引擎按「长幼未知」处理 */
  elder?: boolean
  /** 排行（老大=1、老二=2……）；仅在 B/Z/S/D 上有意义 */
  n?: number
}

/** 分支判定结果：tang=同宗堂系 biao=外支表系 kin=直系/姻亲 */
export type Relation = 'tang' | 'biao' | 'kin'

export interface DeriveResult {
  /** 规范化后的关系路径文本，如「妈妈的妈妈的三哥」 */
  pathText: string
  /** 推导出的称谓，如「三舅姥爷」 */
  title: string
  /** 分支判定 */
  relation: Relation
  relationLabel: string
  /** 递归推导链：从「我」出发逐层叠加称谓 */
  chain: string[]
  /** 原始边路径 */
  edges: Edge[]
}
