const port = process.argv[2] ?? '9222'
const list = async () => (await (await fetch(`http://localhost:${port}/json/list`)).json()).filter((t) => t.type === 'page')

const evalOn = (wsUrl, expression) =>
  new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl)
    ws.onopen = () => ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression, returnByValue: true } }))
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data)
      if (msg.id === 1) {
        ws.close()
        resolve(msg.result?.result?.value ?? msg.result)
      }
    }
    ws.onerror = reject
  })

const main = (await list()).find((t) => t.url.includes('index.html'))
if (!main) {
  console.log(JSON.stringify({ error: 'main page not found' }))
  process.exit(1)
}

// Navigate the window to an external site, like a search would.
await new Promise((resolve, reject) => {
  const ws = new WebSocket(main.webSocketDebuggerUrl)
  ws.onopen = () => ws.send(JSON.stringify({ id: 1, method: 'Page.navigate', params: { url: 'https://example.com/' } }))
  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data)
    if (msg.id === 1) {
      ws.close()
      resolve()
    }
  }
  ws.onerror = reject
})

await new Promise((r) => setTimeout(r, 4000))

const pages = await list()
const appPage = pages.find((t) => t.url.startsWith('https://'))
const toolbarPage = pages.find((t) => t.url.includes('toolbar.html'))

const out = {
  navigatedTo: appPage?.url ?? null,
  toolbarLoaded: !!toolbarPage,
}

if (toolbarPage) {
  out.toolbar = await evalOn(
    toolbarPage.webSocketDebuggerUrl,
    '({ host: document.getElementById("hostname")?.textContent ?? null, backDisabled: document.getElementById("back")?.disabled ?? null, winButtons: document.querySelectorAll(".win").length })',
  )
}

console.log(JSON.stringify(out))
