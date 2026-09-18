import { lookup } from '../src/index'
import { ParseError } from '../src/kinship/parser'

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

// 解析报错用例
try {
  lookup('qqq')
  failed++
  console.log('FAIL  qqq 应抛出 ParseError')
} catch (e) {
  if (e instanceof ParseError) console.log(`ok    qqq → ParseError: ${e.message}`)
  else {
    failed++
    console.log(`FAIL  qqq 抛出了非 ParseError: ${e}`)
  }
}

console.log(failed === 0 ? `\n全部 ${CASES.length + 1} 个用例通过` : `\n${failed} 个用例失败`)
process.exit(failed === 0 ? 0 : 1)
