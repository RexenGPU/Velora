const port = process.argv[2] ?? '9222'
const targets = (await (await fetch(`http://localhost:${port}/json/list`)).json()).filter((t) => t.type === 'page')
for (const t of targets) console.log(`target: ${t.url.slice(-55)}`)
const main = targets.find((t) => t.url.includes('index.html'))

const ws = new WebSocket(main.webSocketDebuggerUrl)
await new Promise((resolve, reject) => {
  ws.onopen = resolve
  ws.onerror = reject
})

let nextId = 1
const evalJs = (expression) =>
  new Promise((resolve) => {
    const id = nextId++
    const onMessage = (e) => {
      const msg = JSON.parse(e.data)
      if (msg.id === id) {
        ws.removeEventListener('message', onMessage)
        resolve(msg.result?.result?.value ?? msg.result?.result ?? msg.result)
      }
    }
    ws.addEventListener('message', onMessage)
    ws.send(JSON.stringify({ id, method: 'Runtime.evaluate', params: { expression, returnByValue: true } }))
  })

const a = await evalJs(`({
  desktop: typeof window.veloraDesktop,
  winBtns: document.querySelectorAll('.win-btn').length,
  winDrag: !!document.querySelector('.win-drag'),
  search: !!document.getElementById('velora-search'),
  cards: document.querySelectorAll('.group').length,
  clock: !!document.querySelector('.tabular-nums'),
  hash: location.hash,
})`)
console.log('CHECK:', JSON.stringify(a))

const b = await evalJs(`({
  mainChildren: document.getElementById('main')?.children.length,
  mainStyle: document.getElementById('main')?.firstElementChild?.getAttribute('style'),
  mainLen: (document.getElementById('main')?.innerHTML ?? '').length,
  headerText: (document.querySelector('header.glass')?.innerText ?? 'NONE').slice(0, 60),
})`)
console.log('TREE: ', JSON.stringify(b))
ws.close()
