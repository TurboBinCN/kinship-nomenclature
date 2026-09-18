import './style.css'
import { encode, lookup, reverseLookup } from './index'
import { renderTree } from './tree'

const input = document.getElementById('query-input') as HTMLInputElement
const btn = document.getElementById('query-btn') as HTMLButtonElement
const modeForward = document.getElementById('mode-forward') as HTMLButtonElement
const modeReverse = document.getElementById('mode-reverse') as HTMLButtonElement
const result = document.getElementById('result') as HTMLElement
const chips = document.getElementById('chips') as HTMLElement
const treeEl = document.getElementById('tree') as HTMLElement

/** 点击树节点 → 切回正查模式并查询 */
function pickFromTree(text: string) {
  setMode('forward')
  input.value = text
  run()
}

type Mode = 'forward' | 'reverse'
let mode: Mode = 'forward'

const EXAMPLES: Record<Mode, string[]> = {
  forward: [
    '姥姥的三哥',
    '妈妈的二姐',
    '叔叔的女儿',
    '姑姑的儿子',
    '妈妈的舅舅',
    '爷爷的哥哥的儿子',
    '老公的妈妈',
    '儿子的儿子的儿子',
    '大伯',
  ],
  reverse: ['三舅姥爷', '堂妹', '表哥', '姨姥姥', '表舅', '侄孙女', '外甥孙', '姥姥'],
}

let chipList: string[] = []

function renderChips() {
  chipList = EXAMPLES[mode]
  chips.innerHTML = ''
  for (const ex of chipList) {
    const chip = document.createElement('button')
    chip.className = 'chip'
    chip.textContent = ex
    chip.addEventListener('click', () => {
      input.value = ex
      run()
    })
    chips.appendChild(chip)
  }
}

function setMode(m: Mode) {
  mode = m
  modeForward.classList.toggle('active', m === 'forward')
  modeReverse.classList.toggle('active', m === 'reverse')
  input.placeholder = m === 'forward' ? '输入关系，如：姥姥的三哥' : '输入称呼，如：三舅姥爷'
  btn.textContent = m === 'forward' ? '推导' : '反查'
  renderChips()
}

modeForward.addEventListener('click', () => setMode('forward'))
modeReverse.addEventListener('click', () => setMode('reverse'))
renderChips()

/** 方言称谓与标准不同时，收集为括号标注（去重） */
function dialectNote(text: string, standard: string): string {
  const seen = new Set([standard])
  const parts: string[] = []
  for (const dialect of ['shandong', 'southwest'] as const) {
    const t = lookup(text, { dialect }).title
    if (!seen.has(t)) {
      seen.add(t)
      parts.push(t)
    }
  }
  return parts.length ? `（${parts.join('、')}）` : ''
}

function run() {
  const text = input.value.trim()
  if (!text) return
  if (mode === 'reverse') {
    runReverse(text)
    return
  }
  try {
    const r = lookup(text)
    const note = dialectNote(text, r.title)
    const tagClass = r.relation === 'tang' ? 'tag-tang' : r.relation === 'biao' ? 'tag-biao' : 'tag-kin'
    result.innerHTML = `
      <div class="card">
        <div class="card-top">
          <span class="tag ${tagClass}">${r.relationLabel}</span>
          <span class="path">${r.pathText}</span>
        </div>
        <div class="title">${r.title}<span class="dialect">${note}</span></div>
        <ol class="chain">
          ${r.chain.map((s) => `<li>${s}</li>`).join('')}
        </ol>
      </div>`
    renderTree(treeEl, { highlightEncode: encode(r.edges), onPick: pickFromTree })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    result.innerHTML = `
      <div class="card error">
        <div class="title small">没听懂这句亲戚话</div>
        <p class="err">${msg}。试试「姥姥的三哥」「姑姑的儿子」这样的说法。</p>
      </div>`
    renderTree(treeEl, { onPick: pickFromTree })
  }
  result.classList.remove('hidden')
}

/** 反查：称呼 → 谁会被这么称呼 */
function runReverse(text: string) {
  const results = reverseLookup(text)
  if (!results.length) {
    result.innerHTML = `
      <div class="card error">
        <div class="title small">没听过这个叫法</div>
        <p class="err">「${text}」不在推导范围内。试试「三舅姥爷」「堂妹」「表舅」这类称呼。</p>
      </div>`
    result.classList.remove('hidden')
    return
  }
  const rows = results
    .map((r) => {
      const tagClass = r.relation === 'tang' ? 'tag-tang' : r.relation === 'biao' ? 'tag-biao' : 'tag-kin'
      const chain = lookup(r.pathText).chain[0] ?? ''
      return `
        <li>
          <div class="rev-row">
            <strong>${r.pathText}</strong>
            <span class="tag ${tagClass}">${r.relationLabel}</span>
          </div>
          ${chain ? `<span class="rev-chain">${chain}</span>` : ''}
        </li>`
    })
    .join('')
  result.innerHTML = `
    <div class="card">
      <div class="card-top">
        <span class="tag tag-kin">${results.length} 种关系</span>
        <span class="path">${text}</span>
      </div>
      <div class="title small">这些关系都会被这么称呼</div>
      <ol class="chain rev">${rows}</ol>
    </div>`
  renderTree(treeEl, { onPick: pickFromTree })
  result.classList.remove('hidden')
}

// 初始化树（默认高亮「我」）
renderTree(treeEl, { onPick: pickFromTree })

btn.addEventListener('click', run)
input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') run()
})

// 页面加载即演示对话中的经典链路
input.value = '姥姥的三哥'
run()
