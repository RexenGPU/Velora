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
  const tb = await find((t) => t.url.includes('titlebar.html'))
  const A = await connect(app.webSocketDebuggerUrl)
  const T = await connect(tb.webSocketDebuggerUrl)
  await sleep(1200)

  // Hook nav states in the titlebar.
  await T.evalJs(`window.__states = []; window.addEventListener('velora:navstate', (e) => window.__states.push(e.detail))`)

  // Enable blocking straight via the store bridge (main reconciles on save).
  await A.evalJs(`(() => {
    const raw = JSON.parse(localStorage.getItem('velora:v1'))
    raw.settings.blockTrackers = true
    const json = JSON.stringify(raw)
    localStorage.setItem('velora:v1', json)
    window.veloraDesktop.saveStore(json)
    return true
  })()`)
  await sleep(500)

  // Open a tab and block a request.
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
  if (!tab) { console.log('FAIL no tab'); return }
  const P = await connect(tab.webSocketDebuggerUrl)
  await sleep(1500)

  const res = await P.evalJs(`fetch('https://sentry.io/velora-probe', { mode: 'no-cors' }).then(() => 'reached').catch(() => 'blocked')`)
  console.log('probe fetch:', res)
  await sleep(1500)

  const states = await T.evalJs(`JSON.stringify(window.__states.map(s => ({ blocked: s.blocked, url: (s.url || '').slice(0, 40) })))`)
  console.log('nav states seen:', states)
  const chip = await T.evalJs(`({ exists: !!document.getElementById('blocked'), hidden: document.getElementById('blocked')?.classList.contains('hidden'), count: document.getElementById('blocked-count')?.textContent })`)
  console.log('chip:', JSON.stringify(chip))
  const stats = await A.evalJs(`window.veloraDesktop.getBlockingStats().then(s => JSON.stringify(s))`)
  console.log('stats:', stats)

  A.ws.close(); T.ws.close(); P.ws.close()
  console.log('BLOCKDIAG DONE')
}
main().catch((e) => { console.error('ERR', e); process.exit(1) })
