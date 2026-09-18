import { lookup } from '../src/index'
import { reverseLookup } from '../src/kinship/reverse'
import { ParseError } from '../src/kinship/parser'
import type { Dialect } from '../src/index'

interface Case {
  input: string
  expect: string
  relation?: string
}

const CASES: Case[] = [
  // 对话中的核心链路
  { input: '姥姥的三哥', expect: '三舅姥爷', relation: 'biao' },
  { input: '妈妈的妈妈的三哥', expect: '三舅姥爷' },
  { input: '三舅', expect: '三舅' },
  // 长辈层
  { input: '爸爸的哥哥', expect: '伯父' },
  { input: '爸爸的弟弟', expect: '叔叔' },
  { input: '爸爸的姐姐', expect: '姑姑' },
  { input: '妈妈的哥哥', expect: '舅舅' },
  { input: '妈妈的姨妈', expect: '姨姥姥' },
  { input: '妈妈的姑姑', expect: '姑姥姥' },
  { input: '妈妈的舅舅', expect: '舅姥爷' },
  { input: '爸爸的舅舅', expect: '舅爷爷' },
  { input: '爷爷的哥哥', expect: '伯祖父' },
  { input: '姥爷的哥哥', expect: '伯外祖父' },
  { input: '奶奶的姐姐', expect: '姨奶奶' },
  { input: '爸爸的爸爸', expect: '爷爷' },
  { input: '妈妈的妈妈', expect: '姥姥' },
  { input: '爸爸的妈妈', expect: '奶奶' },
  { input: '妈妈的爸爸', expect: '姥爷' },
  { input: '爸爸的妈妈的妈妈', expect: '曾外祖母' },
  { input: '妈妈的爸爸的爸爸', expect: '外曾祖父' },
  // 配偶
  { input: '舅舅的老婆', expect: '舅妈' },
  { input: '伯父的老婆', expect: '伯母' },
  { input: '老公的妈妈', expect: '婆婆' },
  { input: '老婆的爸爸', expect: '岳父' },
  { input: '儿媳', expect: '儿媳' },
  // 平辈：堂 / 表
  { input: '叔叔的女儿', expect: '堂妹', relation: 'tang' },
  { input: '伯父的儿子', expect: '堂哥', relation: 'tang' },
  { input: '姑姑的儿子', expect: '表哥', relation: 'biao' },
  { input: '舅舅的女儿', expect: '表姐', relation: 'biao' },
  { input: '姨妈的儿子', expect: '表哥', relation: 'biao' },
  { input: '堂弟', expect: '堂弟', relation: 'tang' },
  { input: '表哥', expect: '表哥', relation: 'biao' },
  { input: '爸爸的哥哥的儿子', expect: '堂哥', relation: 'tang' },
  // 晚辈
  { input: '儿子的儿子', expect: '孙子' },
  { input: '女儿的儿子', expect: '外孙' },
  { input: '儿子的女儿', expect: '孙女' },
  { input: '女儿的女儿', expect: '外孙女' },
  { input: '哥哥的女儿', expect: '侄女', relation: 'tang' },
  { input: '姐姐的儿子', expect: '外甥', relation: 'biao' },
  { input: '儿子的儿子的儿子', expect: '曾孙' },
  { input: '女儿的儿子的儿子', expect: '外曾孙' },
  // 递归归约（不在直呼表中的长路径）
  { input: '爷爷的哥哥的儿子', expect: '堂伯', relation: 'tang' },
  { input: '姥姥的侄子', expect: '表舅' },
  { input: '堂弟的儿子', expect: '堂侄', relation: 'tang' },
  { input: '表哥的儿子', expect: '表侄', relation: 'biao' },
  // 排行与称谓词
  { input: '大伯', expect: '大伯' },
  { input: '三叔', expect: '三叔' },
  { input: '二姑', expect: '二姑' },
  { input: '大儿子', expect: '大儿子' },
  { input: '三哥', expect: '三哥' },
  // 成熟称谓直接作输入：正向拆不动 → 自动走反向索引
  { input: '三舅姥爷', expect: '三舅姥爷' },
  { input: '姨姥姥', expect: '姨姥姥' },
  { input: '表舅', expect: '表舅' },
]

// 方言层：出口词根替换（推导逻辑不变）
const DIALECT_CASES: Array<{ input: string; dialect: Dialect; expect: string }> = [
  // 山东话：姥姥 → 姥娘
  { input: '姥姥', dialect: 'shandong', expect: '姥娘' },
  { input: '姥娘', dialect: 'shandong', expect: '姥娘' },
  { input: '姥姥的三哥', dialect: 'shandong', expect: '三舅姥爷' },
  { input: '姥娘的三哥', dialect: 'shandong', expect: '三舅姥爷' },
  { input: '妈妈的妈妈的姐姐', dialect: 'shandong', expect: '姨姥娘' },
  // 西南官话：姨 → 孃
  { input: '姨妈', dialect: 'southwest', expect: '孃孃' },
  { input: '妈妈的二姐', dialect: 'southwest', expect: '二孃' },
  { input: '三姨', dialect: 'southwest', expect: '三孃' },
  { input: '二孃', dialect: 'southwest', expect: '二孃' },
  { input: '姨父', dialect: 'southwest', expect: '姨爹' },
  { input: '妈妈的妈妈', dialect: 'southwest', expect: '姥姥' },
]

// 反向查询：称呼 → 关系路径（枚举 + 正向推导生成索引，双向自洽）
const REVERSE_CASES: Array<{ input: string; expectAny: string[]; min?: number }> = [
  { input: '三舅姥爷', expectAny: ['妈妈的妈妈的三哥'] },
  { input: '姥姥', expectAny: ['妈妈的妈妈'] },
  { input: '堂妹', expectAny: ['爸爸的弟弟的女儿'] },
  { input: '表哥', expectAny: ['妈妈的哥哥的儿子', '爸爸的姐姐的儿子'], min: 2 },
  { input: '大儿子', expectAny: ['大儿子'] },
  { input: '不存在的称呼', expectAny: [] },
]

let failed = 0
for (const c of CASES) {
  try {
    const r = lookup(c.input)
    const ok = r.title === c.expect && (!c.relation || r.relation === c.relation)
    if (!ok) {
      failed++
      console.log(
        `FAIL  ${c.input}\n      expect: ${c.expect}${c.relation ? ` (${c.relation})` : ''}\n      actual: ${r.title} (${r.relation})`,
      )
    } else {
      console.log(`ok    ${c.input} → ${r.title}`)
    }
  } catch (e) {
    failed++
    console.log(`ERROR ${c.input}: ${e instanceof Error ? e.message : e}`)
  }
}

for (const c of DIALECT_CASES) {
  try {
    const r = lookup(c.input, { dialect: c.dialect })
    if (r.title === c.expect) {
      console.log(`ok    [${c.dialect}] ${c.input} → ${r.title}`)
    } else {
      failed++
      console.log(`FAIL  [${c.dialect}] ${c.input}\n      expect: ${c.expect}\n      actual: ${r.title}`)
    }
  } catch (e) {
    failed++
    console.log(`ERROR [${c.dialect}] ${c.input}: ${e instanceof Error ? e.message : e}`)
  }
}

for (const c of REVERSE_CASES) {
  const rs = reverseLookup(c.input)
  const paths = rs.map((r) => r.pathText)
  if (c.expectAny.length === 0) {
    // 期望无匹配
    if (rs.length === 0) console.log(`ok    反查 ${c.input} → 无匹配（符合预期）`)
    else {
      failed++
      console.log(`FAIL  反查 ${c.input}\n      expect: 无匹配\n      actual: ${paths.join(' / ')}`)
    }
    continue
  }
  const hasExpected = c.expectAny.some((p) => paths.includes(p))
  const enough = c.min == null || rs.length >= c.min
  if (hasExpected && enough) {
    console.log(`ok    反查 ${c.input} → ${rs.length} 条：${paths.slice(0, 3).join(' / ')}`)
  } else {
    failed++
    console.log(
      `FAIL  反查 ${c.input}\n      expectAny: ${c.expectAny.join(' / ')}${c.min ? ` (≥${c.min}条)` : ''}\n      actual: ${paths.join(' / ') || '(空)'}`,
    )
  }
}

// 解析报错用例（引擎推导范围外，反向索引也无匹配）
for (const bad of ['qqq', '老婆的姥爷']) {
  try {
    lookup(bad)
    failed++
    console.log(`FAIL  ${bad} 应抛出 ParseError`)
  } catch (e) {
    if (e instanceof ParseError) console.log(`ok    ${bad} → ParseError: ${e.message}`)
    else {
      failed++
      console.log(`FAIL  ${bad} 抛出了非 ParseError: ${e}`)
    }
  }
}

console.log(
  failed === 0
    ? `\n全部 ${CASES.length + DIALECT_CASES.length + REVERSE_CASES.length + 2} 个用例通过`
    : `\n${failed} 个用例失败`,
)
process.exit(failed === 0 ? 0 : 1)
