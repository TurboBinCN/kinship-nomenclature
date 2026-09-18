import './style.css'
import { lookup } from './index'

const input = document.getElementById('query-input') as HTMLInputElement
const btn = document.getElementById('query-btn') as HTMLButtonElement
const result = document.getElementById('result') as HTMLElement
const chips = document.getElementById('chips') as HTMLElement

const EXAMPLES = [
  '姥姥的三哥',
  '叔叔的女儿',
  '姑姑的儿子',
  '妈妈的舅舅',
  '爷爷的哥哥的儿子',
  '老公的妈妈',
  '儿子的儿子的儿子',
  '大伯',
]

for (const ex of EXAMPLES) {
  const chip = document.createElement('button')
  chip.className = 'chip'
  chip.textContent = ex
  chip.addEventListener('click', () => {
    input.value = ex
    run()
  })
  chips.appendChild(chip)
}

function run() {
  const text = input.value.trim()
  if (!text) return
  try {
    const r = lookup(text)
    const tagClass = r.relation === 'tang' ? 'tag-tang' : r.relation === 'biao' ? 'tag-biao' : 'tag-kin'
    result.innerHTML = `
      <div class="card">
        <div class="card-top">
          <span class="tag ${tagClass}">${r.relationLabel}</span>
          <span class="path">${r.pathText}</span>
        </div>
        <div class="title">${r.title}</div>
        <ol class="chain">
          ${r.chain.map((s) => `<li>${s}</li>`).join('')}
        </ol>
      </div>`
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    result.innerHTML = `
      <div class="card error">
        <div class="title small">没听懂这句亲戚话</div>
        <p class="err">${msg}。试试「姥姥的三哥」「姑姑的儿子」这样的说法。</p>
      </div>`
  }
  result.classList.remove('hidden')
}

btn.addEventListener('click', run)
input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') run()
})

// 页面加载即演示对话中的经典链路
input.value = '姥姥的三哥'
run()
