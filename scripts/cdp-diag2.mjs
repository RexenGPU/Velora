const port = process.argv[2] ?? '9222'
const targets = async () =>
  (await (await fetch(`http://localhost:${port}/json/list`)).json()).filter((t) => t.type === 'page')
const connect = async (url) => {
  const ws = new WebSocket(url)
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej })
  let id = 1
  const pending = new Map()
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data)
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id) }
  }
  const evalJs = (expression) =>
    new Promise((resolve) => {
      const my = id++
      pending.set(my, resolve)
      ws.send(JSON.stringify({ id: my, method: 'Runtime.evaluate', params: { expression, returnByValue: true, awaitPromise: true } }))
    }).then((m) => m.result?.result?.value ?? m.result?.result ?? m.result)
  return { ws, evalJs }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const main = async () => {
  const start = Date.now()
  while (Date.now() - start < 60000) {
    try { await fetch(`http://localhost:${port}/json/version`); break } catch { await sleep(1000) }
  }
  const find = async (pred) => (await targets()).find(pred)
  const app = await find((t) => t.url.includes('index.html'))
  const sb = await find((t) => t.url.includes('sidebar.html'))
  const A = await connect(app.webSocketDebuggerUrl)
  const S = await connect(sb.webSocketDebuggerUrl)
  await sleep(1500)

  // 1) manage chain probe
  await A.evalJs(`window.__navCount = 0; window.addEventListener('velora:navigate', () => window.__navCount++)`)
  const hasApi = await S.evalJs(`typeof window.veloraChrome.manageSpaces`)
  await S.evalJs(`window.veloraChrome.manageSpaces()`)
  await sleep(1200)
  const navCount = await A.evalJs(`window.__navCount`)
  const dialog = await A.evalJs(`!!document.querySelector('[role="dialog"][aria-label="Settings"]')`)
  console.log(`manage chain: api=${hasApi} navEvents=${navCount} settingsDialog=${dialog}`)
  // try the DOM click path too
  await A.evalJs(`window.__navCount = 0`)
  await S.evalJs(`document.getElementById('space-add')?.click()`)
  await sleep(1200)
  console.log(`space-add click: navEvents=${await A.evalJs(`window.__navCount`)} dialog=${await A.evalJs(`!!document.querySelector('[role="dialog"][aria-label="Settings"]')`)}`)

  // 2) blocking probe — is google-analytics reachable at all (no blocking)?
  const nodeReach = await fetch('https://www.google-analytics.com/collect?v=1', { method: 'GET' })
    .then((r) => `HTTP ${r.status}`)
    .catch((e) => `ERR ${e.cause?.code ?? e.message}`)
  console.log('node fetch to google-analytics:', nodeReach)

  // Open a tab to example.com and try fetches from the page context
  await A.evalJs(`location.hash = '#/dashboard'`)
  await sleep(400)
  await A.evalJs(`(() => {
    const el = document.querySelector('#velora-search')
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(el, 'example.com')
    el.dispatchEvent(new Event('input', { bubbles: true }))
    return true
  })()`)
  await A.evalJs(`document.querySelector('#velora-search').closest('form').requestSubmit()`)
  let tab = null
  const t1 = Date.now()
  while (Date.now() - t1 < 15000) {
    tab = await find((t) => t.url.includes('example.com'))
    if (tab) break
    await sleep(500)
  }
  if (tab) {
    const P = await connect(tab.webSocketDebuggerUrl)
    await sleep(1200)
    const control = await P.evalJs(`fetch('https://example.org/', { mode: 'no-cors' }).then(() => 'reached').catch((e) => 'blocked:' + e.message)`)
    const ga = await P.evalJs(`fetch('https://www.google-analytics.com/collect?v=1', { mode: 'no-cors' }).then(() => 'reached').catch((e) => 'blocked:' + e.message)`)
    console.log('page fetch example.org:', control)
    console.log('page fetch google-analytics:', ga)
    P.ws.close()
  } else {
    console.log('no tab opened')
  }
  A.ws.close(); S.ws.close()
  console.log('DIAG2 DONE')
}
main().catch((e) => { console.error('ERR', e); process.exit(1) })
