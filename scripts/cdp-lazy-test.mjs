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
      ws.send(JSON.stringify({ id: my, method: 'Runtime.evaluate', params: { expression, returnByValue: true } }))
    }).then((m) => m.result?.result?.value ?? m.result?.result ?? m.result)
  return { ws, evalJs }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const pass = (k, ok, extra = '') => console.log(`${ok ? 'PASS' : 'FAIL'}  ${k}${extra ? ' — ' + extra : ''}`)

const main = async () => {
  const start = Date.now()
  while (Date.now() - start < 60000) {
    try { await fetch(`http://localhost:${port}/json/version`); break } catch { await sleep(1000) }
  }
  const app = (await targets()).find((t) => t.url.includes('index.html'))
  const A = await connect(app.webSocketDebuggerUrl)
  const t0 = Date.now()
  while (Date.now() - t0 < 30000) {
    if (await A.evalJs(`!!document.getElementById('velora-search')`)) break
    await sleep(400)
  }

  // 1. Lazy view navigation: every route must render its content.
  const routes = [
    { hash: '#/tools', probe: `document.body.innerText.includes('Privacy tools')` },
    { hash: '#/inspect', probe: `document.body.innerText.includes('Website privacy inspector')` },
    { hash: '#/vault', probe: `document.body.innerText.includes('Vault locked') || document.body.innerText.includes('Create your vault')` },
    { hash: '#/history', probe: `document.body.innerText.includes('History')` },
  ]
  for (const r of routes) {
    await A.evalJs(`location.hash = '${r.hash}'`)
    let ok = false
    const t1 = Date.now()
    while (Date.now() - t1 < 8000) {
      if (await A.evalJs(r.probe)) { ok = true; break }
      await sleep(300)
    }
    pass(`lazy route ${r.hash}`, ok)
  }

  // 2. Back to dashboard, still mounted.
  await A.evalJs(`location.hash = '#/dashboard'`)
  await sleep(700)
  const dash = await A.evalJs(`!!document.getElementById('velora-search')`)
  pass('dashboard intact after route cycling', dash)

  A.ws.close()
  console.log('LAZY E2E DONE')
}
main().catch((e) => { console.error('ERR', e); process.exit(1) })
